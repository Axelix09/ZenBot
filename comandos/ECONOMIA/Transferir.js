import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { resolveTargetJid, findRegisteredUser } from '../../lib/core/targetResolver.js';
import { ZenConfig } from '../../zen.config.js';

export default new ZenCommand('transferir')
  .addAlias('transfer', 'pay', 'pagar')
  .setCooldown(5)
  .setCategory('Economía')
  .requireRegistration()
  .setUsage('@usuario <cantidad>')
  .onExecute(async (ctx) => {
    const rawMentioned = ctx.mentions?.[0] || ctx.quotedParticipant;
    const targetJid = await resolveTargetJid(ctx, rawMentioned);

    if (!targetJid) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 💸 』 *TRANSFERENCIAS*\n\n` +
        `> Uso: *${ZenConfig.prefix}${ctx.commandName} [monto] [moneda] @usuario*\n` +
        `> Monedas: *zencoins* / *kogen*\n\n` +
        `> _Ejemplos:_\n  ✦ *${ZenConfig.prefix}${ctx.commandName} 500 @usuario*\n` +
        `  ✦ *${ZenConfig.prefix}${ctx.commandName} 5 kogen @usuario*`
      );
    }

    if (await ctx.isSameUser(targetJid, ctx.sender)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *AUTO-TRANSFERENCIA*\n\n> No podés transferirte a ti mismo 🤩`);
    }

    const user = await ctx.getUser();

    if (user.loans?.blockedPermanently) {
      await ctx.react('🚫');
      return ctx.reply(V.blocked.permanent(user));
    }

    if (user.loans?.isBlocked && !user.loans?.isPromised) {
      await ctx.react('🔒');
      return ctx.reply(V.blocked.debt(user));
    }

    const target = await findRegisteredUser(ctx, targetJid);

    if (!target || !target.registered) {
      await ctx.react('⚠️');
      const targetName = targetJid.split('@')[0];
      return ctx.reply(`『 ⚠️ 』 *USUARIO NO REGISTRADO*\n\n> *${targetName}* todavía no se registró 🥲`);
    }

    const targetName = target.name || targetJid.split('@')[0];

    const cleanArgs = ctx.args.filter(arg => !arg.includes('@'));
    let amount = null;
    let type = 'zencoins';

    for (const arg of cleanArgs) {
      const num = parseInt(arg, 10);
      if (!isNaN(num) && num > 0) {
        amount = num;
      } else if (['kogen', 'ko', 'kógens', 'kogens'].includes(arg.toLowerCase())) {
        type = 'kogen';
      } else if (['zencoins', 'coins', 'zen', 'coin'].includes(arg.toLowerCase())) {
        type = 'zencoins';
      }
    }

    if (!amount) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *MONTO REQUERIDO*\n\n> Indicá un monto numérico positivo 🤨`);
    }

    if (type === 'kogen') {
      if (user.level < 30) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *NIVEL INSUFICIENTE*\n\n> Necesitás nivel *30* para transferir ${ZenConfig.currencies.kogen.name} 😔`);
      }

      if (user.kogen < amount) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *${ZenConfig.currencies.kogen.name.toUpperCase()} INSUFICIENTE*\n\n> Solo tenés ${user.kogen} ${ZenConfig.currencies.kogen.emoji} disponibles 😅`);
      }

      user.kogen -= amount;
      target.kogen += amount;

      await user.save();
      await target.save();

      await ctx.react('✨');
      return ctx.reply(
        `『 ✨ 』 *TRANSFERENCIA EXITOSA*\n\n> ¡Eso estuvo bueno! 😄\n\n` +
        `✦ *Destinatario:* ${targetName}\n✦ *Monto:* ${amount} ${ZenConfig.currencies.kogen.emoji}`,
        { mentions: [targetJid] }
      );
    } else {
      if (user.zencoins < amount) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *SALDO INSUFICIENTE*\n\n> Solo tenés ${user.zencoins} ${ZenConfig.currencies.zencoins.emoji} 🥺`);
      }

      user.zencoins -= amount;

      if (target.loans?.active && target.loans.totalDebt > 0 && !target.loans.blockedPermanently) {
        const debtAmount = target.loans.totalDebt;
        const payment = Math.min(amount, debtAmount);
        const remainder = amount - payment;

        target.loans.totalDebt -= payment;
        target.zencoins += remainder;
        target.loans.paymentHistory = target.loans.paymentHistory || [];
        target.loans.paymentHistory.push(Date.now());

        if (target.loans.totalDebt <= 0) {
          target.loans.active = false;
          target.loans.amount = 0;
          target.loans.interest = 0;
          target.loans.totalDebt = 0;
          target.loans.takenAt = null;
          target.loans.dueDate = null;
          target.loans.isBlocked = false;
          target.loans.isPromised = false;
          target.loans.promiseDate = null;
          target.loans.promiseAmount = 0;
          target.loans.interestAccumulated = 0;
          target.loans.blockedPermanently = false;
          target.loans.blockedReason = null;
          target.loans.canBeUnblocked = false;
        }

        target.loans.trustScore = Math.min(100, (target.loans.trustScore || 50) + 5);

        if (typeof target.markModified === 'function') target.markModified('loans');
        await user.save();
        await target.save();

        await ctx.react('✨');
        return ctx.reply(
          `『 ✨ 』 *TRANSFERENCIA + PAGO DE DEUDA*\n\n> ¡Bien ahí! 😎\n\n` +
          `✦ *Destinatario:* ${targetName}\n✦ *Monto transferido:* ${amount} ${ZenConfig.currencies.zencoins.emoji}\n✦ *Aplicado a deuda:* ${payment} ${ZenConfig.currencies.zencoins.emoji}\n✦ *Sobrante en mano:* ${remainder} ${ZenConfig.currencies.zencoins.emoji}\n✦ *Deuda restante:* ${target.loans.totalDebt} ${ZenConfig.currencies.zencoins.emoji}\n${target.loans.totalDebt <= 0 ? '\n✅ *¡DEUDA LIQUIDADA!*' : ''}`,
          { mentions: [targetJid] }
        );
      }

      target.zencoins += amount;

      if (!target.stats) target.stats = {};
      if (amount > (target.stats.maxTransferReceived || 0)) {
        target.stats.maxTransferReceived = amount;
        if (typeof target.markModified === 'function') target.markModified('stats');
      }

      await user.save();
      await target.save();

      await ctx.react('✨');
      return ctx.reply(
        `『 ✨ 』 *TRANSFERENCIA EXITOSA*\n\n> ¡Eso estuvo bueno! 😄\n\n` +
        `✦ *Destinatario:* ${targetName}\n✦ *Monto:* ${amount} ${ZenConfig.currencies.zencoins.emoji}`,
        { mentions: [targetJid] }
      );
    }
  });