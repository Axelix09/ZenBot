import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';

const KOGEN_PRICE_ZEN = 500;
const DAILY_LIMIT = 200;

export default new ZenCommand('kbuy')
  .addAlias('comprarkogen', 'kogenbuy', 'buykogen')
  .setCooldown(5)
  .setCategory('Economía')
  .requireRegistration()
  .setUsage('<cantidad>')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();

    if (user.loans?.blockedPermanently) {
      await ctx.react('🚫');
      return ctx.reply(
        V.blocked.permanent(user)
      );
    }

    if (user.loans?.isBlocked && !user.loans?.isPromised) {
      await ctx.react('🔒');
      return ctx.reply(
        V.blocked.debt(user)
      );
    }

    const [qtyRaw] = ctx.args;

    if (!qtyRaw) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 🛒 』 *CASA DE CAMBIO ${ZenConfig.currencies.kogen.name}*\n\n` +
        `✦ *Uso:* ${ZenConfig.prefix}${ctx.commandName} [cantidad / all / todo]\n✦ *Tasa:* 1 ${ZenConfig.currencies.kogen.emoji} = ${KOGEN_PRICE_ZEN} ${ZenConfig.currencies.zencoins.emoji}\n✦ *Límite diario:* ${DAILY_LIMIT} ${ZenConfig.currencies.kogen.emoji}\n\n` +
        `✦ *Comisiones:*\n  • 1 a 19: 0%\n  • 20 a 50: 5%\n  • 51 a 100: 10%\n  • Más de 100: 15%\n\n` +
        `> _Ejemplo: ${ZenConfig.prefix}${ctx.commandName} 5_`
      );
    }

    if (!user.cooldowns) {
      user.cooldowns = {};
    }

    if (!user.cooldowns.dailyKbuy) {
      user.cooldowns.dailyKbuy = { count: 0, lastReset: Date.now() };
    }

    const now = Date.now();
    const timeDiff = now - user.cooldowns.dailyKbuy.lastReset;

    if (timeDiff >= 86400000) {
      user.cooldowns.dailyKbuy.count = 0;
      user.cooldowns.dailyKbuy.lastReset = now;
    }

    const remainingLimit = DAILY_LIMIT - user.cooldowns.dailyKbuy.count;

    let qty = 0;
    const isAll = qtyRaw.toLowerCase() === 'all' || qtyRaw.toLowerCase() === 'todo';

    if (isAll) {
      let maxAffordableQty = 0;
      for (let testQty = remainingLimit; testQty >= 1; testQty--) {
        let testCommissionPercent = 0;
        if (testQty >= 20) {
          if (testQty > 100) {
            testCommissionPercent = 0.15;
          } else if (testQty > 50) {
            testCommissionPercent = 0.10;
          } else {
            testCommissionPercent = 0.05;
          }
        }

        const testBaseCost = testQty * KOGEN_PRICE_ZEN;
        const testCommission = Math.ceil(testBaseCost * testCommissionPercent);
        const testTotalCost = testBaseCost + testCommission;

        if (user.zencoins >= testTotalCost) {
          maxAffordableQty = testQty;
          break;
        }
      }

      if (maxAffordableQty <= 0) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *SALDO INSUFICIENTE*\n\n> No alcanza para ni 1 ${ZenConfig.currencies.kogen.name} 😔`);
      }

      qty = maxAffordableQty;
    } else {
      qty = parseInt(qtyRaw, 10);
      if (isNaN(qty) || qty <= 0) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *CANTIDAD INVÁLIDA*\n\n> Indicá una cantidad positiva 🤨`);
      }
    }

    if (qty > remainingLimit) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *LÍMITE DIARIO EXCEDIDO*\n\n` +
        `✦ *Límite:* ${DAILY_LIMIT} ${ZenConfig.currencies.kogen.emoji}\n✦ *Comprados hoy:* ${user.cooldowns.dailyKbuy.count}\n✦ *Disponible:* ${remainingLimit}`
      );
    }

    let commissionPercent = 0;
    if (qty >= 20) {
      if (qty > 100) {
        commissionPercent = 0.15;
      } else if (qty > 50) {
        commissionPercent = 0.10;
      } else {
        commissionPercent = 0.05;
      }
    }

    const baseCost = qty * KOGEN_PRICE_ZEN;
    const commission = Math.ceil(baseCost * commissionPercent);
    const totalCost = baseCost + commission;

    if (user.zencoins < totalCost) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *SALDO INSUFICIENTE*\n\n> Uy, no te alcanza 😅\n\n` +
        `✦ *Cantidad:* ${qty} ${ZenConfig.currencies.kogen.emoji}\n✦ *Costo base:* ${baseCost} ${ZenConfig.currencies.zencoins.emoji}\n✦ *Comisión (${commissionPercent * 100}%):* ${commission} ${ZenConfig.currencies.zencoins.emoji}\n✦ *Total:* ${totalCost} ${ZenConfig.currencies.zencoins.emoji}\n✦ *Disponible:* ${user.zencoins}`
      );
    }

    user.zencoins -= totalCost;
    user.kogen = (user.kogen || 0) + qty;
    user.cooldowns.dailyKbuy.count += qty;

    if (typeof user.markModified === 'function') {
      user.markModified('cooldowns');
    }

    await user.save();
    await ctx.react('✨');

    return ctx.reply(
      `『 ✨ 』 *COMPRA EXITOSA*\n\n> ¡Bien ahí! 😎\n\n` +
      `✦ *Adquiriste:* ${qty} ${ZenConfig.currencies.kogen.emoji}\n✦ *Costo base:* ${baseCost} ${ZenConfig.currencies.zencoins.emoji}\n✦ *Comisión:* ${commission} ${ZenConfig.currencies.zencoins.emoji} (${commissionPercent * 100}%)\n✦ *Total:* ${totalCost} ${ZenConfig.currencies.zencoins.emoji}\n\n` +
      `✦ *Nuevo saldo ${ZenConfig.currencies.kogen.name}:* ${user.kogen} ${ZenConfig.currencies.kogen.emoji}\n✦ *${ZenConfig.currencies.zencoins.name} restantes:* ${user.zencoins} ${ZenConfig.currencies.zencoins.emoji}\n✦ *Disponible hoy:* ${DAILY_LIMIT - user.cooldowns.dailyKbuy.count} ${ZenConfig.currencies.kogen.emoji}`
    );
  });