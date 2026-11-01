import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';

const chatKey = (jid) => (jid || '').replace(/\./g, '_').replace(/@/g, '_at_');

export default new ZenCommand('warn')
  .addAlias('unwarn', 'delwarn', 'setwarnlimit', 'warns')
  .setCooldown(3)
  .setCategory('group')
  .requireGroup()
  .setUsage('@usuario <razón>')
  .onExecute(async (ctx) => {
    const command = ctx.commandName.toLowerCase();
    const group = await ctx.getGroup();

    if (command === 'setwarnlimit') {
      const isAdmin = await ctx.isSenderAdmin();
      if (!isAdmin) {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *ACCESO DENEGADO*\n\n` +
          `> Para hacer esto necesitás ser admin 😬`
        );
      }

      const num = parseInt(ctx.args[0], 10);
      if (isNaN(num) || num < 1 || num > 10) {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *LÍMITE INVÁLIDO*\n\n` +
          `> Ingresá un número entre 1 y 10 🤔`
        );
      }

      group.warnLimit = num;
      await group.save();
      await ctx.react('⚙️');
      return ctx.reply(
        `『 ⚙️ 』 *LÍMITE ACTUALIZADO*\n\n` +
        `> ¡Eso estuvo bueno! 😄\n> Límite de advertencias: *${num}*`
      );
    }

    const targetJid = await ctx.resolveMentionTarget();

    if (command === 'warns') {
      const who = targetJid || ctx.sender;
      const targetUser = await ctx.getUserById(who);
      const key = chatKey(ctx.chat);
      const currentWarns = targetUser.warns?.[key] || 0;
      const limit = group.warnLimit || 3;

      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *ADVERTENCIAS*\n\n` +
        `> @${who.split('@')[0]} tiene *${currentWarns} / ${limit}* advertencias 🙂`,
        { mentions: [who] }
      );
    }

    const isAdmin = await ctx.isSenderAdmin();
    if (!isAdmin) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *ACCESO DENEGADO*\n\n` +
        `> Para hacer esto necesitás ser admin 😬`
      );
    }

    if (!targetJid) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *USUARIO REQUERIDO*\n\n` +
        `> Mencioná al usuario o responde a su mensaje 🤨`
      );
    }

    if (targetJid === ctx.sock.user.id.split('@')[0].split(':')[0] + '@s.whatsapp.net') {
      await ctx.react('🤖');
      return ctx.reply(`『 ⚠️ 』 *AUTO-ADVERTENCIA*\n\n> No puedo advertirme a mí mismo 😄`);
    }

    let meta;
    try { meta = await ctx.sock.groupMetadata(ctx.chat); } catch { return ctx.reply(`『 ⚠️ 』 *ERROR DE RED*\n\n> No pude cargar el registro del grupo 😵`); }
    const participants = meta.participants || [];
    const pTarget = participants.find(p => p.id === targetJid);

    if (pTarget?.admin) {
      await ctx.react('🛡️');
      return ctx.reply(
        `『 ⚠️ 』 *ADMINISTRADOR PROTEGIDO*\n\n` +
        `> No puedo advertir a administradores 😄`
      );
    }

    const targetUser = await ctx.getUserById(targetJid);
    const key = chatKey(ctx.chat);
    const limit = group.warnLimit || 3;

    if (!targetUser.warns) targetUser.warns = {};
    let currentWarns = targetUser.warns[key] || 0;

    if (['unwarn', 'delwarn'].includes(command)) {
      if (currentWarns <= 0) {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *SIN ADVERTENCIAS*\n\n` +
          `> El usuario no tiene advertencias acumuladas 🫤`
        );
      }

      targetUser.warns[key] = currentWarns - 1;
      if (typeof targetUser.markModified === 'function') targetUser.markModified('warns');
      await targetUser.save();

      await ctx.react('♻️');
      return ctx.reply(
        `『 ♻️ 』 *ADVERTENCIA REMOVIDA*\n\n` +
        `> @${targetJid.split('@')[0]} ahora tiene *${currentWarns - 1} / ${limit}* 😉`,
        { mentions: [targetJid] }
      );
    }

    if (command === 'warn') {
      const isBotAdmin = await ctx.isBotAdmin();
      if (!isBotAdmin) {
        await ctx.react('⚠️');
        return ctx.reply(
          V.perm.botAdmin('expulsar')
        );
      }

      currentWarns += 1;

      if (currentWarns >= limit) {
        delete targetUser.warns[key];
        if (typeof targetUser.markModified === 'function') targetUser.markModified('warns');
        await targetUser.save();

        try { await ctx.sock.groups.kick(ctx.chat, [targetJid]); } catch {}
        await ctx.react('🚫');
        return ctx.reply(
          `『 🚫 』 *USUARIO EXPULSADO*\n\n` +
          `> @${targetJid.split('@')[0]} fue expulsado tras alcanzar *${limit} advertencias* 😌`,
          { mentions: [targetJid] }
        );
      } else {
        targetUser.warns[key] = currentWarns;
        if (typeof targetUser.markModified === 'function') targetUser.markModified('warns');
        await targetUser.save();

        const reason = ctx.args.join(' ').replace(/@\d+/g, '').trim() || 'No especificado';
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *ADVERTENCIA APLICADA*\n\n` +
          `> @${targetJid.split('@')[0]}, has recibido una advertencia 🙂\n` +
          `> *Motivo:* ${reason}\n` +
          `> *Estado:* ${currentWarns} / ${limit}`,
          { mentions: [targetJid] }
        );
      }
    }
  });