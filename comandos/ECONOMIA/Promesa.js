import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

export default new ZenCommand('promesa')
  .addAlias('promise', 'prom')
  .setCooldown(10)
  .setCategory('Economía')
  .requireRegistration()
  .setUsage('<días>')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const [daysRaw] = ctx.args;

    if (!user.loans?.active || user.loans.totalDebt <= 0) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SIN DEUDA*\n\n> No tenés préstamos activos 😉`);
    }

    if (user.loans.blockedPermanently) {
      await ctx.react('🚫');
      return ctx.reply(
        `『 🚫 』 *CUENTA BLOQUEADA PERMANENTEMENTE*\n\n` +
        `> No podés hacer promesas 😳\n` +
        `> Contactá con soporte.`
      );
    }

    if (user.loans.isPromised) {
      await ctx.react('⚠️');
      const daysLeft = Math.ceil((user.loans.promiseDate - Date.now()) / 86400000);
      return ctx.reply(
        `『 ⚠️ 』 *PROMESA ACTIVA*\n\n` +
        `✦ *Días restantes:* ${daysLeft}\n` +
        `✦ *Deuda:* ${user.loans.totalDebt} ${ZenConfig.currencies.zencoins.emoji}\n\n` +
        `> _Paga a tiempo para evitar bloqueo permanente 🤨_`
      );
    }

    if (!user.loans.isBlocked) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *CUENTA NO BLOQUEADA*\n\n` +
        `> No necesitás hacer una promesa 😳\n` +
        `> Tu cuenta está activa.\n` +
        `> Usá *${ZenConfig.prefix}prestamo pagar* para pagar tu deuda.`
      );
    }

    if (!daysRaw) {
      await ctx.react('📝');
      const dueDate = user.loans.dueDate || 0;
      const daysOverdue = dueDate ? Math.max(0, Math.floor((Date.now() - dueDate) / 86400000)) : 0;
      
      return ctx.reply(
        `『 📝 』 *SISTEMA DE PROMESA DE PAGO*\n\n` +
        `✦ *Deuda actual:* ${user.loans.totalDebt} ${ZenConfig.currencies.zencoins.emoji}\n` +
        `✦ *Días vencidos:* ${daysOverdue}\n` +
        `✦ *Días de gracia restantes:* ${Math.max(0, 3 - daysOverdue)}\n\n` +
        `✦ *Uso:* ${ZenConfig.prefix}promesa [días]\n✦ *Días permitidos:* 1 - 7\n\n` +
        `⚠️ *Consecuencias:*\n` +
        `  • Los comandos de economía se reactivan\n` +
        `  • Si no pagas en el plazo: bloqueo PERMANENTE\n` +
        `  • Sin posibilidad de recuperación`
      );
    }

    const days = parseInt(daysRaw, 10);
    if (isNaN(days) || days < 1 || days > 7) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *DÍAS INVÁLIDOS*\n\n> Uy, algo no cuadra 🤨\n\n> Tiene que ser entre 1 y 7 días 🧐`);
    }

    const promiseDate = Date.now() + (days * 86400000);
    user.loans.isPromised = true;
    user.loans.promiseDate = promiseDate;
    user.loans.promiseAmount = user.loans.totalDebt;
    user.loans.isBlocked = false;
    user.loans.canBeUnblocked = true;

    if (typeof user.markModified === 'function') user.markModified('loans');

    await user.save();
    await ctx.react('📝');

    return ctx.reply(
      `『 📝 』 *PROMESA DE PAGO REGISTRADA*\n\n` +
      `✦ *Deuda:* ${user.loans.totalDebt} ${ZenConfig.currencies.zencoins.emoji}\n` +
      `✦ *Plazo:* ${days} días\n` +
      `✦ *Fecha límite:* ${new Date(promiseDate).toLocaleDateString('es-ES')}\n\n` +
      `✅ *COMANDOS REACTIVADOS*\n\n` +
      `⚠️ *SI NO PAGAS EN LA FECHA ACORDADA:*\n` +
      `> Tu cuenta quedará bloqueada PERMANENTEMENTE 😄\n` +
      `> Sin posibilidad de recuperación\n\n` +
      `> _Paga a tiempo con: ${ZenConfig.prefix}prestamo pagar all_`
    );
  });