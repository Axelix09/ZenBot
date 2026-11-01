import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

const warnedMutedUsers = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of warnedMutedUsers.entries()) {
    if (now - timestamp > 3600000) {
      warnedMutedUsers.delete(key);
    }
  }
}, 300000).unref?.();

export default new ZenCommand('silenciar')
  .addAlias('desilenciar', 'dessilenciar', 'mute', 'unmute')
  .setCooldown(3)
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .requireBotAdmin()
  .setUsage('@usuario')
  .onExecute(async (ctx) => {
    const command = ctx.commandName.toLowerCase();
    const isUnmute = ['desilenciar', 'dessilenciar', 'unmute'].includes(command);

    const targetJid = await ctx.resolveMentionTarget();

    if (!targetJid) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *USUARIO REQUERIDO*\n\n` +
        `> Mencioná al usuario o responde a su mensaje 🤔`
      );
    }

    const ownerJids = ZenConfig.ownerNumbers.map(n => n.replace(/[^0-9]/g, '') + '@s.whatsapp.net');
    if (ownerJids.includes(targetJid)) {
      await ctx.react('👑');
      return ctx.reply(`『 ⚠️ 』 *PROPIETARIO PROTEGIDO*\n\n> No puedo silenciar al propietario 😉`);
    }

    let meta;
    try { meta = await ctx.sock.groupMetadata(ctx.chat); } catch { return ctx.reply(`『 ⚠️ 』 *ERROR DE RED*\n\n> No pude cargar el registro del grupo 😵`); }
    const participants = meta.participants || [];
    const pTarget = participants.find(p => p.id === targetJid);

    if (pTarget?.admin) {
      await ctx.react('🛡️');
      return ctx.reply(`『 ⚠️ 』 *ADMINISTRADOR PROTEGIDO*\n\n> No puedo silenciar a administradores 😄`);
    }

    const group = await ctx.getGroup();
    if (!group.silencedUsers) group.silencedUsers = [];

    const index = group.silencedUsers.indexOf(targetJid);
    const warnKey = `${ctx.chat}-${targetJid}`;

    if (isUnmute) {
      if (index === -1) {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *NO ESTÁ SILENCIADO*\n\n` +
          `> @${targetJid.split('@')[0]} no está silenciado 😕`,
          { mentions: [targetJid] }
        );
      }

      group.silencedUsers.splice(index, 1);
      if (typeof group.markModified === 'function') group.markModified('silencedUsers');
      await group.save();

      warnedMutedUsers.delete(warnKey);

      await ctx.react('🔊');
      return ctx.reply(
        `『 🔊 』 *USUARIO DES-SILENCIADO*\n\n` +
        `> @${targetJid.split('@')[0]} puede enviar mensajes nuevamente 😉`,
        { mentions: [targetJid] }
      );
    } else {
      if (index !== -1) {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *YA ESTÁ SILENCIADO*\n\n` +
          `> @${targetJid.split('@')[0]} ya está silenciado 😏`,
          { mentions: [targetJid] }
        );
      }

      group.silencedUsers.push(targetJid);
      if (typeof group.markModified === 'function') group.markModified('silencedUsers');
      await group.save();

      warnedMutedUsers.delete(warnKey);

      await ctx.react('🤐');
      return ctx.reply(
        `『 🤐 』 *USUARIO SILENCIADO*\n\n` +
        `> Todo lo que @${targetJid.split('@')[0]} envíe será eliminado 😄`,
        { mentions: [targetJid] }
      );
    }
  });

export const silenceListener = {
  async before(msg, sock, ctx) {
    if (!ctx.isGroup || ctx.rawMsg.key.fromMe) return;

    const groupDb = await ctx.getGroup();
    if (!groupDb || !groupDb.silencedUsers?.length) return;

    if (groupDb.silencedUsers.includes(ctx.sender)) {
      const isBotAdmin = await ctx.isBotAdmin();
      if (!isBotAdmin) return;

      try {
        await sock.sendMessage(ctx.chat, { delete: ctx.rawMsg.key });
      } catch {}

      const warnKey = `${ctx.chat}-${ctx.sender}`;
      if (!warnedMutedUsers.has(warnKey)) {
        warnedMutedUsers.set(warnKey, Date.now());
        try {
          await sock.sendMessage(ctx.chat, {
            text: `『 🤐 』 *SISTEMA DE CONTROL*\n\n> @${ctx.sender.split('@')[0]}, estás silenciado. Todo lo que envíes será eliminado 😄`,
            mentions: [ctx.sender]
          });
        } catch {}
      }
    }
  }
};