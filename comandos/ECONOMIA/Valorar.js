import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { getSpec, ensureMarket, resolveItem, positionOf, appraisalFee, getDemand, demandEmoji } from '../../lib/economy/pulgas.js';
import { timeLeft } from '../../lib/economy/bolsa.js';

const coin = ZenConfig.currencies.zencoins.emoji;

const verdict = (item, estimated, detected, demand, antiqueBonus) => {
  if (detected) return '⚠️ Es una réplica, vale muy poco';
  const expected = estimated * 0.85 * (demand || 1) * (1 + antiqueBonus);
  if (expected > item.paid * 1.05) return '📈 Conviene vender, deja ganancia';
  if (expected < item.paid * 0.95) return (demand || 1) < 1 ? '📉 Perdés plata ahora, esperá a que suba la demanda' : '📉 Si lo vendés ahora perdés plata';
  return '➖ Quedaría casi igual que lo que pagaste';
};

export default new ZenCommand('valorar')
  .addAlias('appraise', 'evaluate', 'tasar')
  .setCooldown(3)
  .setCategory('Economía')
  .requireRegistration()
  .setUsage('<n>')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();

    if (user.loans?.blockedPermanently) {
      await ctx.react('🚫');
      return ctx.reply(V.blocked.permanent(user));
    }

    if (user.loans?.isBlocked && !user.loans?.isPromised) {
      await ctx.react('🔒');
      return ctx.reply(V.blocked.debt(user));
    }

    const [arg] = ctx.args;

    if (!arg) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *NÚMERO REQUERIDO*\n\n> Decime qué objeto querés tasar 🤔\n> Mirá los números con *${ZenConfig.prefix}coleccion*`);
    }

    const market = ensureMarket(user);
    const found = resolveItem(market.collection, arg);

    if (!found) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *OBJETO NO ENCONTRADO*\n\n> No tenés ese objeto en tu colección 🥲\n> Revisá los números con *${ZenConfig.prefix}coleccion*`);
    }

    const [id, item] = found;
    const position = positionOf(market.collection, id);
    const { demand, endsAt } = getDemand();
    const itemDemand = demand[item.type] || 1;
    const specNow = getSpec(user);
    const antiqueBonus = specNow.id === 'antiguedades' ? specNow.bonus : 0;
    const demandLine = `✦ *Demanda ahora:* ${demandEmoji(itemDemand)} x${itemDemand.toFixed(2)} (cambia en ${timeLeft(endsAt - Date.now())})\n`;

    if (item.appraised) {
      await ctx.react('🔍');
      return ctx.reply(
        `『 🔍 』 *YA ESTÁ TASADO*\n\n> Este ya lo tasaste, no hace falta pagar de nuevo 😉\n\n` +
        `✦ *Objeto:* #${position} ${item.name}\n✦ *Pagaste:* ${item.paid} ${coin}\n✦ *Valor estimado:* ~${item.estimated} ${coin}\n${demandLine}✦ *Veredicto:* ${verdict(item, item.estimated, item.detectedFake, itemDemand, antiqueBonus)}`
      );
    }

    const fee = appraisalFee(item);
    if (user.zencoins < fee) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SALDO INSUFICIENTE*\n\n> Tasar este objeto cuesta *${fee}* ${coin} y tenés ${user.zencoins} ${coin} 🥺`);
    }

    const spec = getSpec(user);
    const reputation = Math.max(0, market.reputation || 0);
    const band = Math.min(0.4, Math.max(0.05, 0.3 - reputation * 0.0015 - (spec.id === 'joyas' ? spec.bonus : 0)));
    const detectChance = Math.min(0.98, 0.5 + (spec.id === 'arte' ? spec.bonus : 0));
    const detected = item.fake ? Math.random() < detectChance : false;
    const baseValue = item.fake && !detected ? (item.nominalValue || item.realValue) : item.realValue;
    const estimated = Math.max(1, Math.round(baseValue * (1 + (Math.random() * 2 - 1) * band)));

    user.zencoins -= fee;
    item.appraised = true;
    item.estimated = estimated;
    item.detectedFake = detected;
    market.collection[id] = item;

    if (typeof user.markModified === 'function') {
      user.markModified('market');
    }

    await user.save();
    await ctx.react('🔍');

    return ctx.reply(
      `『 🔍 』 *VALORACIÓN*\n\n> Listo, ya lo tasé 😎\n\n` +
      `✦ *Objeto:* #${position} ${item.name}\n✦ *Pagaste:* ${item.paid} ${coin}\n✦ *Costo de tasación:* ${fee} ${coin}\n` +
      `✦ *Valor estimado:* ~${estimated} ${coin} (±${Math.round(band * 100)}%)\n${demandLine}✦ *Veredicto:* ${verdict(item, estimated, detected, itemDemand, antiqueBonus)}\n\n` +
      `> _Usá *${ZenConfig.prefix}vender ${position}* cuando quieras venderlo 😉_`
    );
  });
