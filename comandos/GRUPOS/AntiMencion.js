import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

const getRealMessage = (message) => {
  if (!message) return null;
  let m = message;
  if (m.ephemeralMessage) m = m.ephemeralMessage.message || m.ephemeralMessage;
  if (m.viewOnceMessage) m = m.viewOnceMessage.message || m.viewOnceMessage;
  if (m.viewOnceMessageV2) m = m.viewOnceMessageV2.message || m.viewOnceMessageV2;
  if (m.documentWithCaptionMessage) m = m.documentWithCaptionMessage.message || m.documentWithCaptionMessage;
  return m;
};

export default new ZenCommand('antimenciongp')
  .addAlias('antiestado')
  .setCooldown(3)
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .setUsage('on|off')
  .onExecute(async (ctx) => {
    const [modo] = ctx.args;
    const group = await ctx.getGroup();

    if (!modo || !['on', 'activar', 'off', 'desactivar'].includes(modo.toLowerCase())) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *MODO INVÁLIDO*\n\n> Revisá cómo lo escribiste 🧐\n\n` +
        `✦ *Opciones:*\n` +
        `  • ${ZenConfig.prefix}${ctx.commandName} on / activar\n` +
        `  • ${ZenConfig.prefix}${ctx.commandName} off / desactivar`
      );
    }

    const activar = ['on', 'activar'].includes(modo.toLowerCase());
    group.antimenciongp = activar;
    await group.save();

    await ctx.react('📢');
    return ctx.reply(
      `『 📢 』 *ANTI-MENCIÓN DE ESTADO ${activar ? 'ACTIVADO' : 'DESACTIVADO'}*\n\n` +
      `> Se expulsará a cualquier miembro no-administrador que etiquete este grupo en sus estados públicos 😄`
    );
  });

export const antiMencionListener = {
  async before(msg, sock, ctx) {
    if (!ctx.isGroup) return;

    const groupDb = await ctx.getGroup();
    if (!groupDb?.antimenciongp) return;

    const realMessage = getRealMessage(msg.message);
    if (!realMessage) return;

    const keys = Object.keys(realMessage);
    const mtype = keys[0] || '';
    const messageContent = realMessage[mtype];

    const isStatusMention = keys.includes('groupStatusMentionMessage') || 
      mtype === 'statusMentionMessage' || 
      (messageContent?.contextInfo?.groupMentions?.length > 0 && 
       messageContent.contextInfo.groupMentions.some(g => {
         const gJid = typeof g === 'string' ? g : (g.groupJid || g.jid || '');
         return gJid === ctx.chat;
       }));

    if (!isStatusMention) return;

    const ownerJids = ZenConfig.ownerNumbers.map(n => n.replace(/[^0-9]/g, '') + '@s.whatsapp.net');
    const isOwner = ownerJids.includes(ctx.sender);
    const isAdmin = await ctx.isSenderAdmin();
    if (isAdmin || isOwner) return;

    const isBotAdmin = await ctx.isBotAdmin();
    if (!isBotAdmin) return;

    const senderNum = ctx.sender.split('@')[0];

    try {
      await sock.groups.kick(ctx.chat, [ctx.sender]);
      await sock.sendMessage(ctx.chat, {
        text: `『 📢 』 *SISTEMA DE SEGURIDAD*\n\n> @${senderNum} fue expulsado por etiquetar este grupo en su estado de WhatsApp 🙂`,
        mentions: [ctx.sender]
      });
    } catch {}
  }
};