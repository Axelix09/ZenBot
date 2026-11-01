import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

const MEDIA_CONFIG = {
  antinotadevoz: { emoji: '🎙️', name: 'ANTI NOTA DE VOZ', dbKey: 'antinotadevoz', msg: 'Las notas de voz' },
  antisticker:   { emoji: '🎭', name: 'ANTI STICKER', dbKey: 'antisticker', msg: 'Los stickers' },
  antivideo:     { emoji: '🎬', name: 'ANTI VIDEO', dbKey: 'antivideo', msg: 'Los videos' },
  antiimagen:    { emoji: '🖼️', name: 'ANTI IMAGEN', dbKey: 'antiimagen', msg: 'Las imágenes' }
};

const handleMediaCommand = async (ctx) => {
  const cmd = ctx.commandName.toLowerCase();
  const conf = MEDIA_CONFIG[cmd];
  if (!conf) return;

  const [modo] = ctx.args;
  const group = await ctx.getGroup();

  if (!modo || !['on', 'activar', 'off', 'desactivar'].includes(modo.toLowerCase())) {
    await ctx.react('⚠️');
    return ctx.reply(
      `『 ⚠️ 』 *MODO INVÁLIDO*\n\n> Uy, algo no cuadra 🤨\n\n` +
      `✦ *Opciones:*\n` +
      `  • +${cmd} on / activar\n` +
      `  • +${cmd} off / desactivar`
    );
  }

  const activar = ['on', 'activar'].includes(modo.toLowerCase());
  group[conf.dbKey] = activar;
  await group.save();

  await ctx.react(conf.emoji);
  return ctx.reply(
    `『 ${conf.emoji} 』 *${conf.name} ${activar ? 'ACTIVADO' : 'DESACTIVADO'}*\n\n` +
    `> ${conf.msg} ${activar ? 'no están permitidos' : 'están permitidos'} en este grupo 🤩`
  );
};

export default new ZenCommand('antinotadevoz')
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .setUsage('on|off')
  .onExecute(handleMediaCommand);

export const cmdAntiSticker = new ZenCommand('antisticker')
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .onExecute(handleMediaCommand);

export const cmdAntiVideo = new ZenCommand('antivideo')
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .onExecute(handleMediaCommand);

export const cmdAntiImagen = new ZenCommand('antiimagen')
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .onExecute(handleMediaCommand);

export const antiMediaListener = {
  async before(msg, sock, ctx) {
    if (!ctx.isGroup || ctx.rawMsg.key.fromMe) return;
    const groupDb = await ctx.getGroup();
    if (!groupDb) return;

    const ownerJids = ZenConfig.ownerNumbers.map(n => n.replace(/[^0-9]/g, '') + '@s.whatsapp.net');
    const isOwner = ownerJids.includes(ctx.sender);
    const isAdmin = await ctx.isSenderAdmin();
    if (isAdmin || isOwner) return;

    const isBotAdmin = await ctx.isBotAdmin();
    if (!isBotAdmin) return;

    const mtype = msg.message ? Object.keys(msg.message)[0] : '';
    const messageContent = msg.message?.[mtype];

    const checks = [
      { flag: 'antinotadevoz', match: mtype === 'audioMessage' && messageContent?.ptt === true },
      { flag: 'antisticker', match: mtype === 'stickerMessage' },
      { flag: 'antivideo', match: mtype === 'videoMessage' && !messageContent?.gifPlayback },
      { flag: 'antiimagen', match: mtype === 'imageMessage' }
    ];

    for (const { flag, match } of checks) {
      if (!match || !groupDb[flag]) continue;
      const conf = MEDIA_CONFIG[flag];

      try { await sock.sendMessage(ctx.chat, { delete: msg.key }); } catch {}
      await sock.sendMessage(ctx.chat, {
        text: `『 ${conf.emoji} 』 *RESTRICCIÓN ACTIVADA*\n\n> @${ctx.sender.split('@')[0]}, ${conf.msg} no están permitidos en este grupo. Tu mensaje fue removido 😎`,
        mentions: [ctx.sender]
      });
      break;
    }
  }
};