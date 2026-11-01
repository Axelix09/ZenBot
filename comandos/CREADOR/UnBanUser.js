import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { resolveTargetJid, findRegisteredUser } from '../../lib/core/targetResolver.js';

export default new ZenCommand('unblockuser')
  .addAlias('desbaneo', 'desbloquearuser')
  .setCooldown(2)
  .setCategory('Owner')
  .requireOwner()
  .setUsage('@usuario')
  .onExecute(async (ctx) => {
    const targetMention = ctx.mentions?.[0];
    const targetJid = targetMention ? await resolveTargetJid(ctx, targetMention) : null;

    if (!targetJid) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *USO CORRECTO*\n\n` +
        `> ${ZenConfig.prefix}unblockuser @usuario 😉\n` +
        `> _Ejemplo: ${ZenConfig.prefix}unblockuser @axeldev09_`
      );
    }

    const user = await findRegisteredUser(ctx, targetJid);
    if (!user) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *USUARIO NO REGISTRADO*\n\n> El usuario mencionado no está registrado 🫤`);
    }

    if (!user.loans?.isBlocked && !user.loans?.blockedPermanently) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *CUENTA NO BLOQUEADA*\n\n> ${user.name} no tiene bloqueos activos 😬`);
    }

    user.loans.isBlocked = false;
    user.loans.blockedPermanently = false;
    user.loans.blockedReason = null;
    user.loans.canBeUnblocked = true;

    await user.save();

    try {
      await ctx.sock.sendMessage(targetJid, {
        text: `🔓 *CUENTA DESBLOQUEADA*\n\n` +
              `> Tu cuenta fue desbloqueada por el administrador.\n` +
              `> Ya podés usar todos los comandos nuevamente.`
      });
    } catch {}

    await ctx.react('🔓');
    return ctx.reply(
      `『 🔓 』 *CUENTA DESBLOQUEADA*\n\n> Uy, por ahí no 🫢\n\n` +
      `✦ *Usuario:* ${user.name}\n` +
      `✦ *La cuenta ha sido desbloqueada exitosamente.\n` +
      `✦ *Puede usar todos los comandos nuevamente.`
    );
  });