import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { resolveTargetJid, findRegisteredUser } from '../../lib/core/targetResolver.js';

export default new ZenCommand('banuser')
  .addAlias('baneo', 'bloquearuser')
  .setCooldown(2)
  .setCategory('Owner')
  .requireOwner()
  .setUsage('@usuario <razón>')
  .onExecute(async (ctx) => {
    const args = ctx.args.join(' ');
    const targetMention = ctx.mentions?.[0];
    const targetJid = targetMention ? await resolveTargetJid(ctx, targetMention) : null;

    if (!targetJid) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *USO CORRECTO*\n\n` +
        `> ${ZenConfig.prefix}banuser @usuario [razón] 😉\n` +
        `> _Ejemplo: ${ZenConfig.prefix}banuser @axeldev09 Abuso del sistema_\n\n` +
        `> *El usuario quedará bloqueado permanentemente sin importar si tiene préstamo o no.*`
      );
    }

    const user = await findRegisteredUser(ctx, targetJid);
    if (!user) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *USUARIO NO REGISTRADO*\n\n> El usuario mencionado no está registrado 😕`);
    }

    const reason = args.replace(/@\S+/g, '').trim() || 'Sin razón especificada';

    if (!user.loans) user.loans = {};

    user.loans.isBlocked = true;
    user.loans.blockedPermanently = true;
    user.loans.blockedReason = `BANEADO POR OWNER: ${reason}`;
    user.loans.canBeUnblocked = false;

    await user.save();

    try {
      await ctx.sock.sendMessage(targetJid, {
        text: `🚫 *HAS SIDO BANEADO PERMANENTEMENTE*\n\n` +
              `> Razón: ${reason}\n\n` +
              `> *No podrás usar comandos de economía.*\n` +
              `> *Esta decisión es irreversible.*\n` +
              `> Contactá al soporte para más información.`
      });
    } catch {}

    await ctx.react('🚫');
    return ctx.reply(
      `『 🚫 』 *USUARIO BANEADO PERMANENTEMENTE*\n\n` +
      `✦ *Usuario:* ${user.name}\n` +
      `✦ *Razón:* ${reason}\n` +
      `✦ *El usuario ha sido baneado permanentemente.*\n` +
      `> _Para desbanear: ${ZenConfig.prefix}unblockuser @${user.id.split('@')[0]}_`
    );
  });