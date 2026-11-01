import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { resolveTargetJid, findRegisteredUser } from '../../lib/core/targetResolver.js';

const INTEREST_RATE = 0.15;
const LATE_INTEREST_DAILY = 0.05;
const BASE_CREDIT = 5000;
const MAX_CREDIT = 50000;
const LOAN_DURATION_DAYS = 7;
const GRACE_PERIOD_DAYS = 3;

const checkBank = (u) => {
  if (u.bankBalance > 0 && u.bankProtectionUntil && Date.now() > u.bankProtectionUntil) {
    u.zencoins += u.bankBalance;
    u.bankBalance = 0;
    u.bankProtectionUntil = null;
  }
};

const applyLateInterest = (user) => {
  if (!user.loans?.active || user.loans.totalDebt <= 0) return false;
  
  const now = Date.now();
  const lastApplied = user.loans.lastInterestApplied || user.loans.takenAt || now;
  const daysSince = (now - lastApplied) / 86400000;
  
  if (daysSince < 1) return false;
  
  const daysLate = Math.floor(daysSince);
  if (daysLate <= 0) return false;
  
  let debtIncreased = false;
  for (let i = 0; i < daysLate; i++) {
    if (user.loans.dueDate && now > user.loans.dueDate) {
      const interest = Math.round(user.loans.totalDebt * LATE_INTEREST_DAILY);
      user.loans.totalDebt += interest;
      user.loans.interestAccumulated = (user.loans.interestAccumulated || 0) + interest;
      debtIncreased = true;
    }
  }
  
  user.loans.lastInterestApplied = now;
  return debtIncreased;
};

const calculateTrustScore = (user) => {
  const history = user.loans?.paymentHistory || [];
  const lateCount = user.loans?.latePayments || 0;
  const totalPayments = history.length;
  
  if (totalPayments === 0 && lateCount === 0) return 50;
  
  const onTimeRate = (totalPayments - lateCount) / Math.max(1, totalPayments);
  const score = 50 + (onTimeRate * 50) - (lateCount * 5);
  return Math.max(0, Math.min(100, Math.round(score)));
};

const calculateCreditLimit = (user) => {
  const trustScore = user.loans?.trustScore || 50;
  const levelBonus = (user.level || 1) * 100;
  const base = BASE_CREDIT + (trustScore * 50) + levelBonus;
  return Math.min(MAX_CREDIT, Math.round(base));
};

const checkAndBlockUser = async (user) => {
  if (!user.loans?.active) return false;
  if (user.loans.blockedPermanently) return true;
  
  const now = Date.now();
  const dueDate = user.loans.dueDate || 0;
  const daysOverdue = Math.max(0, (now - dueDate) / 86400000);
  
  if (user.loans.isPromised) {
    const promiseDate = user.loans.promiseDate || 0;
    if (now > promiseDate) {
      user.loans.isBlocked = true;
      user.loans.blockedPermanently = true;
      user.loans.blockedReason = 'Promesa de pago incumplida';
      user.loans.isPromised = false;
      user.loans.canBeUnblocked = false;
      if (typeof user.markModified === 'function') user.markModified('loans');
      await user.save();
      return true;
    }
    return false;
  }
  
  if (daysOverdue > GRACE_PERIOD_DAYS) {
    user.loans.isBlocked = true;
    user.loans.blockedReason = `Deuda vencida por ${Math.floor(daysOverdue)} días`;
    user.loans.canBeUnblocked = true;
    if (typeof user.markModified === 'function') user.markModified('loans');
    await user.save();
    return true;
  }
  
  if ((user.loans.latePayments || 0) >= 3 && daysOverdue > 0) {
    user.loans.isBlocked = true;
    user.loans.blockedPermanently = true;
    user.loans.blockedReason = 'Múltiples pagos atrasados (3+)';
    user.loans.canBeUnblocked = false;
    if (typeof user.markModified === 'function') user.markModified('loans');
    await user.save();
    return true;
  }
  
  return false;
};

export default new ZenCommand('banco')
  .addAlias('bank', 'deposito', 'retirar', 'bancario', 'dp', 'dep', 'depositar', 'd', 'r', 'with', 'prestamo', 'loan', 'credito', 'promesa')
  .setCooldown(5)
  .setCategory('Economía')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    checkBank(user);

    const now = Date.now();
    const interestChanged = applyLateInterest(user);
    if (interestChanged) {
      if (typeof user.markModified === 'function') user.markModified('loans');
      await user.save();
    }

    await checkAndBlockUser(user);

    const isPermanentlyBlocked = user.loans?.blockedPermanently || false;
    const isBlocked = user.loans?.isBlocked || false;
    const isPromised = user.loans?.isPromised || false;

    if (isPermanentlyBlocked) {
      await ctx.react('🚫');
      return ctx.reply(
        `『 🚫 』 *CUENTA BLOQUEADA PERMANENTEMENTE*\n\n` +
        `> Eso no se puede 😳\n> Razón: ${user.loans?.blockedReason || 'Deuda impaga'}\n\n` +
        `> *NO HAY RECUPERACIÓN POSIBLE* 😳\n` +
        `> Contactá con soporte para más información.\n\n` +
        `> *Comandos disponibles:*\n` +
        `  • ${ZenConfig.prefix}balance - Ver saldo`
      );
    }

    if (isBlocked && !isPromised) {
      await ctx.react('🔒');
      const debt = user.loans?.totalDebt || 0;
      const dueDate = user.loans?.dueDate || 0;
      const daysOverdue = dueDate ? Math.max(0, Math.floor((now - dueDate) / 86400000)) : 0;
      return ctx.reply(
        `『 🔒 』 *CUENTA BLOQUEADA*\n\n` +
        `> Eso no se puede 😳\n> Razón: ${user.loans?.blockedReason || 'Deuda impaga'}\n` +
        `> Deuda: ${debt} ${ZenConfig.currencies.zencoins.emoji}\n` +
        `> Días vencidos: ${daysOverdue}\n\n` +
        `> *Opciones:* 😬\n` +
        `  • Pagar: *${ZenConfig.prefix}prestamo pagar [monto/all]*\n` +
        `  • Promesa: *${ZenConfig.prefix}promesa [días]* - Reactiva comandos\n\n` +
        `> *Comandos disponibles:*\n` +
        `  • ${ZenConfig.prefix}balance - Ver saldo\n` +
        `  • ${ZenConfig.prefix}transferir - Para pagar deuda`
      );
    }

    const cmd = ctx.commandName.toLowerCase();
    let action = '';
    let qtyRaw = '';
    let kogenRaw = '';

    if (['promesa'].includes(cmd)) {
      action = 'promesa';
      qtyRaw = ctx.args[0];
    } else if (['prestamo', 'loan', 'credito'].includes(cmd)) {
      action = 'prestamo';
      qtyRaw = ctx.args[0];
    } else if (['dp', 'dep', 'depositar', 'd'].includes(cmd)) {
      action = 'depositar';
      qtyRaw = ctx.args[0];
      kogenRaw = ctx.args[1];
    } else if (['r', 'retirar', 'with'].includes(cmd)) {
      action = 'retirar';
      qtyRaw = ctx.args[0];
    } else {
      if (ctx.args[0]) {
        const sub = ctx.args[0].toLowerCase();
        if (['prestamo', 'loan', 'credito'].includes(sub)) {
          action = 'prestamo';
          qtyRaw = ctx.args[1];
        } else if (['promesa'].includes(sub)) {
          action = 'promesa';
          qtyRaw = ctx.args[1];
        } else if (['depositar', 'dp', 'dep', 'd'].includes(sub)) {
          action = 'depositar';
          qtyRaw = ctx.args[1];
          kogenRaw = ctx.args[2];
        } else if (['retirar', 'r', 'with'].includes(sub)) {
          action = 'retirar';
          qtyRaw = ctx.args[1];
        }
      }
    }

    if (!action) {
      await ctx.react('🏦');
      const trustScore = user.loans?.trustScore || 50;
      const creditLimit = calculateCreditLimit(user);
      const hasActiveLoan = user.loans?.active || false;
      const debt = user.loans?.totalDebt || 0;
      const dueDate = user.loans?.dueDate || 0;
      const daysLeft = dueDate ? Math.max(0, Math.ceil((dueDate - now) / 86400000)) : 0;
      const isOverdue = dueDate && now > dueDate;
      const daysOverdue = isOverdue ? Math.floor((now - dueDate) / 86400000) : 0;
      const isPromisedActive = user.loans?.isPromised || false;
      const promiseDays = isPromisedActive ? Math.ceil((user.loans.promiseDate - now) / 86400000) : 0;

      let loanStatus = hasActiveLoan 
        ? `✦ *Préstamo activo:* ${debt} ${ZenConfig.currencies.zencoins.emoji}\n✦ *Días restantes:* ${daysLeft}\n${isOverdue ? `⚠️ *ATRASADO:* ${daysOverdue} días` : '✅ *Al día*'}`
        : `✦ *Sin préstamos activos*\n✦ *Crédito disponible:* ${creditLimit} ${ZenConfig.currencies.zencoins.emoji}`;

      if (isPromisedActive) {
        loanStatus += `\n✦ *Promesa activa:* ${promiseDays} días restantes`;
      }

      if (user.loans?.interestAccumulated > 0) {
        loanStatus += `\n✦ *Interés acumulado:* +${user.loans.interestAccumulated} ${ZenConfig.currencies.zencoins.emoji}`;
      }

      return ctx.reply(
        `『 🏦 』 *BANCO CENTRAL ZEN*\n\n` +
        `✦ *${ZenConfig.currencies.zencoins.name}:* ${user.zencoins} ${ZenConfig.currencies.zencoins.emoji}\n✦ *${ZenConfig.currencies.kogen.name}:* ${user.kogen} ${ZenConfig.currencies.kogen.emoji}\n✦ *Banco:* ${user.bankBalance} ${ZenConfig.currencies.zencoins.emoji}\n✦ *${ZenConfig.currencies.lux.name}:* ${user.lux || 0} ${ZenConfig.currencies.lux.emoji}\n\n` +
        `✦ *Sistema de Préstamos*\n${loanStatus}\n✦ *Confianza:* ${trustScore}%\n✦ *Límite máximo:* ${creditLimit} ${ZenConfig.currencies.zencoins.emoji}\n\n` +
        `✦ *Comandos:*\n` +
        `  • ${ZenConfig.prefix}banco depositar [monto/all] [kogen] - Depositar\n` +
        `  • ${ZenConfig.prefix}banco retirar [monto/all] - Retirar\n` +
        `  • ${ZenConfig.prefix}prestamo [monto] - Solicitar préstamo\n` +
        `  • ${ZenConfig.prefix}prestamo pagar [monto/all/@usuario] - Pagar deuda\n` +
        `  • ${ZenConfig.prefix}promesa [días] - Promesa de pago\n` +
        `  • ${ZenConfig.prefix}prestamo estado - Ver estado`
      );
    }

    if (action === 'promesa') {
      if (!user.loans?.active || user.loans.totalDebt <= 0) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *SIN DEUDA*\n\n> No tenés préstamos activos 😌`);
      }

      if (user.loans.blockedPermanently) {
        await ctx.react('🚫');
        return ctx.reply(`『 🚫 』 *CUENTA BLOQUEADA PERMANENTEMENTE*\n\n> No podés hacer promesas 😳`);
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
          `> No necesitás hacer una promesa 😬\n` +
          `> Tu cuenta está activa.\n` +
          `> Usá *${ZenConfig.prefix}prestamo pagar* para pagar tu deuda.`
        );
      }

      const daysRaw = qtyRaw || '3';
      const days = parseInt(daysRaw, 10);
      if (isNaN(days) || days < 1 || days > 7) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *DÍAS INVÁLIDOS*\n\n> Eso no me cierra 😵‍💫\n\n> Tiene que ser entre 1 y 7 días 🧐\n> Usá: *${ZenConfig.prefix}promesa [días]*`);
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
        `✦ *Deuda:* ${user.loans.totalDebt} ${ZenConfig.currencies.zencoins.emoji}\n✦ *Plazo:* ${days} días\n✦ *Fecha límite:* ${new Date(promiseDate).toLocaleDateString('es-ES')}\n\n` +
        `✅ *COMANDOS REACTIVADOS*\n\n` +
        `⚠️ *SI NO PAGAS EN LA FECHA ACORDADA:*\n` +
        `> Tu cuenta quedará bloqueada PERMANENTEMENTE 🙂\n` +
        `> Sin posibilidad de recuperación\n\n` +
        `> _Paga a tiempo con: ${ZenConfig.prefix}prestamo pagar all_`
      );
    }

    if (action === 'prestamo') {
      const subAction = qtyRaw?.toLowerCase();

      if (!subAction || subAction === 'estado') {
        await ctx.react('📊');
        const trustScore = user.loans?.trustScore || 50;
        const creditLimit = calculateCreditLimit(user);
        const hasActiveLoan = user.loans?.active || false;
        const debt = user.loans?.totalDebt || 0;
        const dueDate = user.loans?.dueDate || 0;
        const daysLeft = dueDate ? Math.max(0, Math.ceil((dueDate - Date.now()) / 86400000)) : 0;
        const lateCount = user.loans?.latePayments || 0;
        const historyLength = user.loans?.paymentHistory?.length || 0;
        const isOverdue = dueDate && Date.now() > dueDate;
        const daysOverdue = isOverdue ? Math.floor((Date.now() - dueDate) / 86400000) : 0;

        return ctx.reply(
          `『 📊 』 *ESTADO FINANCIERO*\n\n` +
          `✦ *Confianza:* ${trustScore}% (${lateCount > 0 ? `⚠️ ${lateCount} pagos atrasados` : '✅ Historial limpio'})\n` +
          `✦ *Crédito disponible:* ${creditLimit} ${ZenConfig.currencies.zencoins.emoji}\n` +
          `✦ *Préstamos pagados:* ${historyLength}\n` +
          (hasActiveLoan 
            ? `✦ *Deuda actual:* ${debt} ${ZenConfig.currencies.zencoins.emoji}\n✦ *Días restantes:* ${daysLeft}\n✦ *Estado:* ${isOverdue ? `⚠️ ATRASADO (${daysOverdue} días)` : '🟢 Al día'}\n${user.loans?.interestAccumulated > 0 ? `✦ *Interés moratorio:* +${user.loans.interestAccumulated} ${ZenConfig.currencies.zencoins.emoji}` : ''}`
            : `✦ *Sin deudas activas*`)
        );
      }

      if (subAction === 'pagar') {
        const amountRaw = ctx.args[1];
        const mentionRaw = ctx.mentions?.[0] || ctx.quotedParticipant;

        if (!amountRaw) {
          await ctx.react('⚠️');
          return ctx.reply(
            `『 ⚠️ 』 *MONTO REQUERIDO*\n\n` +
            `> Revisá cómo lo escribiste 🧐\n> Usá: *${ZenConfig.prefix}prestamo pagar [monto/all]*\n` +
            `> Para pagar con transferencia: *${ZenConfig.prefix}prestamo pagar [monto] @usuario* 😵‍💫\n` +
            `> _Ejemplo: ${ZenConfig.prefix}prestamo pagar all @amigo_`
          );
        }

        if (user.loans.blockedPermanently) {
          await ctx.react('🚫');
          return ctx.reply(
            `『 🚫 』 *CUENTA BLOQUEADA PERMANENTEMENTE*\n\n` +
            `> No podés pagar tu deuda 😳\n` +
            `> Contactá con soporte.`
          );
        }

        if (!user.loans?.active || user.loans.totalDebt <= 0) {
          await ctx.react('⚠️');
          return ctx.reply(`『 ⚠️ 』 *SIN DEUDA*\n\n> No tenés préstamos activos 😌`);
        }

        const debtAmount = user.loans.totalDebt;
        let amount = 0;

        if (amountRaw.toLowerCase() === 'all' || amountRaw.toLowerCase() === 'todo') {
          amount = debtAmount;
        } else {
          amount = parseInt(amountRaw, 10);
        }

        if (isNaN(amount) || amount <= 0) {
          await ctx.react('⚠️');
          return ctx.reply(`『 ⚠️ 』 *MONTO INVÁLIDO*\n\n> Indicá una cantidad positiva 🤔`);
        }

        if (amount > debtAmount) {
          await ctx.react('⚠️');
          return ctx.reply(`『 ⚠️ 』 *MONTO EXCEDE LA DEUDA*\n\n> Deuda: ${debtAmount} ${ZenConfig.currencies.zencoins.emoji}`);
        }

        let payerUser = user;
        let isThirdParty = false;

        if (mentionRaw) {
          const targetJid = await resolveTargetJid(ctx, mentionRaw);
          if (targetJid && !(await ctx.isSameUser(targetJid, ctx.sender))) {
            const thirdParty = await findRegisteredUser(ctx, targetJid);
            if (thirdParty && thirdParty.registered) {
              if (thirdParty.zencoins < amount) {
                await ctx.react('⚠️');
                return ctx.reply(`『 ⚠️ 』 *SALDO INSUFICIENTE*\n\n> *${thirdParty.name}* tiene ${thirdParty.zencoins} ${ZenConfig.currencies.zencoins.emoji} 🥺`);
              }
              payerUser = thirdParty;
              isThirdParty = true;
            }
          }
        }

        if (!isThirdParty) {
          if (user.zencoins < amount) {
            await ctx.react('⚠️');
            return ctx.reply(`『 ⚠️ 』 *SALDO INSUFICIENTE*\n\n> Solo tenés ${user.zencoins} ${ZenConfig.currencies.zencoins.emoji} 🥺`);
          }
        }

        payerUser.zencoins -= amount;
        user.loans.totalDebt -= amount;

        const now = Date.now();
        if (user.loans.dueDate && now > user.loans.dueDate) {
          user.loans.latePayments = (user.loans.latePayments || 0) + 1;
        }

        if (!user.loans.paymentHistory) user.loans.paymentHistory = [];
        user.loans.paymentHistory.push(now);

        const wasOverdue = user.loans.dueDate && now > user.loans.dueDate;

        if (user.loans.totalDebt <= 0) {
          user.loans.active = false;
          user.loans.amount = 0;
          user.loans.interest = 0;
          user.loans.totalDebt = 0;
          user.loans.takenAt = null;
          user.loans.dueDate = null;
          user.loans.isBlocked = false;
          user.loans.isPromised = false;
          user.loans.promiseDate = null;
          user.loans.promiseAmount = 0;
          user.loans.interestAccumulated = 0;
          user.loans.blockedPermanently = false;
          user.loans.blockedReason = null;
          user.loans.canBeUnblocked = false;
        }

        const trustScore = calculateTrustScore(user);
        user.loans.trustScore = trustScore;

        if (typeof user.markModified === 'function') user.markModified('loans');
        if (isThirdParty && typeof payerUser.markModified === 'function') {
          payerUser.markModified('zencoins');
        }

        await user.save();
        if (isThirdParty) await payerUser.save();

        await ctx.react('✨');

        const isPaidOff = user.loans.totalDebt <= 0;
        const thirdPartyText = isThirdParty ? `\n✦ *Pagado por:* ${payerUser.name}` : '';

        return ctx.reply(
          `『 ✨ 』 *PAGO REALIZADO*\n\n> ¡Bien ahí! 😎\n\n` +
          `✦ *Abonado:* ${amount} ${ZenConfig.currencies.zencoins.emoji}\n` +
          `✦ *Deuda restante:* ${user.loans.totalDebt} ${ZenConfig.currencies.zencoins.emoji}\n` +
          `✦ *Confianza actualizada:* ${trustScore}%\n` +
          (wasOverdue ? `✦ *Pago atrasado:* -5% de confianza\n` : '') +
          thirdPartyText +
          (isPaidOff ? `\n✅ *¡DEUDA LIQUIDADA!* Tu historial crediticio mejora.\n${user.loans.isPromised ? '✅ *Promesa cumplida!*' : ''}` : '') +
          (user.loans.isPromised && isPaidOff ? '\n✅ *¡PROMESA CUMPLIDA!* Tu cuenta está completamente regularizada.' : '') +
          (user.loans.isPromised && !isPaidOff ? `\n📝 *Promesa pendiente:* ${Math.ceil((user.loans.promiseDate - Date.now()) / 86400000)} días` : '')
        );
      }

      const amount = parseInt(subAction, 10);
      if (isNaN(amount) || amount <= 0) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *MONTO INVÁLIDO*\n\n> Indicá un monto positivo 🤔`);
      }

      if (user.loans?.active) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *PRÉSTAMO ACTIVO*\n\n> Ya tenés un préstamo activo. Pagá tu deuda actual antes de solicitar otro 😏\n> Deuda: ${user.loans.totalDebt} ${ZenConfig.currencies.zencoins.emoji}`);
      }

      const creditLimit = calculateCreditLimit(user);
      if (amount > creditLimit) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *CRÉDITO EXCEDIDO*\n\n> Tu límite es ${creditLimit} ${ZenConfig.currencies.zencoins.emoji} 🙂`);
      }

      const interest = Math.round(amount * INTEREST_RATE);
      const totalDebt = amount + interest;
      const dueDate = Date.now() + (LOAN_DURATION_DAYS * 86400000);

      user.loans = user.loans || {};
      user.loans.active = true;
      user.loans.amount = amount;
      user.loans.interest = interest;
      user.loans.totalDebt = totalDebt;
      user.loans.takenAt = Date.now();
      user.loans.dueDate = dueDate;
      user.loans.trustScore = calculateTrustScore(user);
      user.loans.lastInterestApplied = Date.now();
      user.loans.interestAccumulated = 0;
      user.loans.isBlocked = false;
      user.loans.isPromised = false;
      user.loans.promiseDate = null;
      user.loans.promiseAmount = 0;
      user.loans.latePayments = 0;
      user.loans.gracePeriodUsed = false;
      user.loans.canBeUnblocked = false;

      user.zencoins += amount;

      if (typeof user.markModified === 'function') {
        user.markModified('loans');
      }

      await user.save();
      await ctx.react('💰');

      return ctx.reply(
        `『 💰 』 *PRÉSTAMO APROBADO*\n\n` +
        `✦ *Monto:* ${amount} ${ZenConfig.currencies.zencoins.emoji}\n` +
        `✦ *Interés (${INTEREST_RATE * 100}%):* +${interest} ${ZenConfig.currencies.zencoins.emoji}\n` +
        `✦ *Total a pagar:* ${totalDebt} ${ZenConfig.currencies.zencoins.emoji}\n` +
        `✦ *Plazo:* ${LOAN_DURATION_DAYS} días\n` +
        `✦ *Fecha límite:* ${new Date(dueDate).toLocaleDateString('es-ES')}\n` +
        `✦ *Confianza:* ${user.loans.trustScore}%\n\n` +
        `⚠️ *Si no pagas a tiempo:*\n` +
        `  • Interés moratorio del ${LATE_INTEREST_DAILY * 100}% diario\n` +
        `  • Después de ${GRACE_PERIOD_DAYS} días: bloqueo de cuenta\n` +
        `  • 3 pagos atrasados: bloqueo permanente\n\n` +
        `> _Usa *${ZenConfig.prefix}promesa [días]* para reactivar comandos si te bloquean 😉_`
      );
    }

    if (action === 'depositar') {
      if (!qtyRaw || !kogenRaw) {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 🏦 』 *MODO DEPÓSITO*\n\n` +
          `> ¡Eso estuvo bueno! 😄\n> Uso: *${ZenConfig.prefix}${ctx.commandName} [monto / all] [kogen]*\n` +
          `> Costo: 1 ${ZenConfig.currencies.kogen.name} por 30 min de protección.\n\n` +
          `> _Ejemplo: ${ZenConfig.prefix}${ctx.commandName} all 4 (Protege por 120 min)_`
        );
      }

      if (user.loans?.isBlocked || user.loans?.blockedPermanently) {
        await ctx.react('🚫');
        return ctx.reply(V.blocked.bank(user));
      }

      const kogen = parseInt(kogenRaw, 10);
      if (isNaN(kogen) || kogen <= 0) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *${ZenConfig.currencies.kogen.name.toUpperCase()} INVÁLIDO*\n\n> Indicá una cantidad positiva de ${ZenConfig.currencies.kogen.name} 😵‍💫`);
      }

      let amount = 0;
      if (qtyRaw.toLowerCase() === 'all' || qtyRaw.toLowerCase() === 'todo') {
        amount = user.zencoins;
      } else {
        amount = parseInt(qtyRaw, 10);
      }

      if (isNaN(amount) || amount <= 0) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *MONTO INVÁLIDO*\n\n> Indicá un monto numérico positivo 🤔`);
      }

      if (user.zencoins < amount) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *SALDO INSUFICIENTE*\n\n> Solo tenés ${user.zencoins} ${ZenConfig.currencies.zencoins.emoji} 🥺`);
      }

      if (user.kogen < kogen) {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *${ZenConfig.currencies.kogen.name.toUpperCase()} INSUFICIENTE*\n\n` +
          `> Necesitás ${kogen} ${ZenConfig.currencies.kogen.emoji} y tenés ${user.kogen} 🥺`
        );
      }

      const baseProteccion = user.bankProtectionUntil && user.bankProtectionUntil > now
        ? user.bankProtectionUntil
        : now;

      const msToAdd = kogen * 30 * 60 * 1000;
      const nuevaExpiracion = baseProteccion + msToAdd;

      user.zencoins -= amount;
      user.kogen -= kogen;
      user.bankBalance = (user.bankBalance || 0) + amount;
      user.bankProtectionUntil = nuevaExpiracion;

      await user.save();
      await ctx.react('✨');

      const fecha = new Date(nuevaExpiracion).toLocaleString('es-ES');
      const minutosProtegidos = kogen * 30;

      return ctx.reply(
        `『 ✨ 』 *DEPÓSITO EXITOSO*\n\n> ¡Bien ahí! 😎\n\n` +
        `✦ *Monto:* ${amount} ${ZenConfig.currencies.zencoins.emoji}\n` +
        `✦ *Seguro:* ${kogen} ${ZenConfig.currencies.kogen.emoji}\n` +
        `✦ *Protección:* ${minutosProtegidos} minutos\n` +
        `✦ *Protegido hasta:* ${fecha}`
      );
    }

    if (action === 'retirar') {
      if (!qtyRaw) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *MONTO REQUERIDO*\n\n> Indicá un monto o usa *all* / *todo* 😵‍💫`);
      }

      if (user.loans?.isBlocked || user.loans?.blockedPermanently) {
        await ctx.react('🚫');
        return ctx.reply(V.blocked.bank(user));
      }

      let amount = 0;
      if (qtyRaw.toLowerCase() === 'all' || qtyRaw.toLowerCase() === 'todo') {
        amount = user.bankBalance;
      } else {
        amount = parseInt(qtyRaw, 10);
      }

      if (isNaN(amount) || amount <= 0) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *MONTO INVÁLIDO*\n\n> Indicá un monto numérico positivo 🤔`);
      }

      if (user.bankBalance < amount) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *SALDO BANCARIO INSUFICIENTE*\n\n> Solo tenés ${user.bankBalance} ${ZenConfig.currencies.zencoins.emoji} 🫣`);
      }

      user.bankBalance -= amount;
      user.zencoins += amount;

      await user.save();
      await ctx.react('✨');

      return ctx.reply(
        `『 ✨ 』 *RETIRO EXITOSO*\n\n` +
        `> Retiraste *${amount}* ${ZenConfig.currencies.zencoins.name} a tu billetera 😄`
      );
    }
  });