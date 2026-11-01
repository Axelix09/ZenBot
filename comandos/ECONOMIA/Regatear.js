import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { ITEMS, MAX_ITEMS, FAKE_CHANCE, FAKE_FACTOR, getReputationLevel, getSpec, bonusPercent, ensureMarket, positionOf, totalPaid } from '../../lib/economy/pulgas.js';

const COOLDOWN_MS = 180000;
const MIN_BID = 50;
const MAX_BID = 2000;
const coin = ZenConfig.currencies.zencoins.emoji;

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const SELLER_MESSAGES = [
  'El vendedor sonríe y te da la mano 🤝',
  'Cerraron el trato sin mirar atrás 😏',
  'Te llevás el objeto, ¡a ver qué tal sale! 🤞',
  'El vendedor se despide rápido, qué raro 🤨'
];

const REJECTIONS = [
  '¡El vendedor se ofendió y te echó del puesto!',
  'El vendedor llamó a seguridad. Pagaste la multa.',
  'Te cobraron por el tiempo de negociación.',
  'El vendedor te estafó con la tarifa de negociación.'
];

const repLine = (market) => {
  const level = getReputationLevel(market.reputation || 0);
  return `✦ *Reputación:* ${level.color} ${level.name} (${market.reputation || 0} pts)`;
};

export default new ZenCommand('regatear')
  .addAlias('haggle', 'negociar', 'compra')
  .setCooldown(0)
  .setCategory('Economía')
  .requireRegistration()
  .setUsage('<monto>')
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

    const [betRaw] = ctx.args;

    const now = Date.now();
    if (!user.cooldowns) user.cooldowns = {};
    const lastUsed = user.cooldowns.regatear || 0;
    if (now - lastUsed < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - lastUsed)) / 1000);
      await ctx.react('⏳');
      return ctx.reply(`『 ⏳ 』 *MERCADO CERRADO*\n\n> Esperá *${remaining}s* para volver 😉`);
    }

    const market = ensureMarket(user);

    if (!betRaw) {
      await ctx.react('🛍️');
      const repLevel = getReputationLevel(market.reputation || 0);
      const spec = getSpec(user);
      const best = market.bestFind;
      return ctx.reply(
        `『 🛍️ 』 *MERCADO DE PULGAS*\n\n` +
        `> Comprá objetos a ciegas, tasalos y vendelos con ganancia 😏\n\n` +
        `✦ *Reputación:* ${repLevel.color} ${repLevel.name} (${market.reputation || 0} pts)\n` +
        `✦ *Descuento:* ${Math.round((repLevel.discount || 0) * 100)}%\n` +
        `✦ *Especialización:* ${spec.id ? `${spec.spec.name} · Nivel ${spec.level}` : 'Ninguna'}\n` +
        `✦ *Colección:* ${Object.keys(market.collection).length}/${MAX_ITEMS} objetos\n` +
        `✦ *Invertido:* ${totalPaid(market.collection)} ${coin}\n` +
        (best ? `✦ *Mejor venta:* ${best.name} (+${best.profit} ${coin})\n` : '') +
        `\n✦ *Uso:* ${ZenConfig.prefix}${ctx.commandName} [monto]\n✦ *Límites:* ${MIN_BID} - ${MAX_BID} ${coin}\n\n` +
        `✦ *Comandos:*\n` +
        `  • ${ZenConfig.prefix}coleccion - Ver tus objetos\n` +
        `  • ${ZenConfig.prefix}valorar [n] - Tasar un objeto\n` +
        `  • ${ZenConfig.prefix}vender [n|todo] - Vender\n` +
        `  • ${ZenConfig.prefix}especializar [tipo] - Especializarte`
      );
    }

    const bid = parseInt(betRaw, 10);
    if (isNaN(bid) || bid < MIN_BID || bid > MAX_BID) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *OFERTA INVÁLIDA*\n\n> Tiene que ser entre *${MIN_BID}* y *${MAX_BID}* ${coin} 😵‍💫`);
    }

    if (user.zencoins < bid) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SALDO INSUFICIENTE*\n\n> Solo tenés ${user.zencoins} ${coin} 😔`);
    }

    if (Object.keys(market.collection).length >= MAX_ITEMS) {
      await ctx.react('📦');
      return ctx.reply(`『 📦 』 *COLECCIÓN LLENA*\n\n> Ya tenés *${MAX_ITEMS}* objetos y no entra ninguno más 😅\n> Vendé algo con *${ZenConfig.prefix}vender [n]* o *${ZenConfig.prefix}vender todo*`);
    }

    if (!user.stats) user.stats = {};

    const repLevel = getReputationLevel(market.reputation || 0);
    const discount = repLevel.discount || 0;
    const effectiveBid = Math.max(10, Math.floor(bid * (1 - discount)));

    const spec = getSpec(user);
    const item = pickRandom(ITEMS);
    const nominal = item.value[0] + Math.random() * (item.value[1] - item.value[0]);

    const isGoodDeal = effectiveBid < nominal * 0.6;
    const isFairDeal = effectiveBid >= nominal * 0.6 && effectiveBid <= nominal * 1.3;
    const baseAccept = isGoodDeal ? 0.25 : isFairDeal ? 0.65 : 0.85;
    const acceptChance = Math.min(0.95, baseAccept + (spec.id === 'animales' ? spec.bonus : 0));
    const sellerAccepts = Math.random() < acceptChance;
    const isSteal = isGoodDeal && sellerAccepts;

    user.cooldowns.regatear = now;
    if (typeof user.markModified === 'function') {
      user.markModified('cooldowns');
      user.markModified('market');
      user.markModified('stats');
    }

    if (sellerAccepts) {
      const isFake = Math.random() < FAKE_CHANCE;

      if (isFake && spec.id === 'tecnologia' && Math.random() < spec.bonus) {
        market.reputation = Math.min(100, (market.reputation || 0) + 1);
        await user.save();
        await ctx.react('💻');
        return ctx.reply(
          `『 💻 』 *RÉPLICA ESQUIVADA*\n\n> ¡Qué ojo! 😎\n\n` +
          `✦ *Objeto:* ${item.name}\n` +
          `> Tu especialización en Tecnología (${bonusPercent(spec.bonus)}%) detectó que era una réplica y cancelaste la compra. No pagaste nada 🙌\n\n` +
          repLine(market)
        );
      }

      const finalPrice = isSteal ? Math.floor(effectiveBid * 0.5) : effectiveBid;
      const paid = Math.min(user.zencoins, finalPrice);
      user.zencoins -= paid;

      const realValue = Math.round(isFake ? nominal * FAKE_FACTOR : nominal);

      market.deals = (market.deals || 0) + 1;
      market.successfulDeals = (market.successfulDeals || 0) + 1;
      user.stats.marketDeals = (user.stats.marketDeals || 0) + 1;
      user.stats.marketWins = (user.stats.marketWins || 0) + 1;

      const itemId = `${item.id}_${now}`;
      market.collection[itemId] = {
        name: item.name,
        type: item.type,
        paid,
        realValue,
        nominalValue: Math.round(nominal),
        fake: isFake,
        appraised: false,
        boughtAt: now
      };

      market.totalValue = (market.totalValue || 0) + realValue;
      market.reputation = Math.min(100, (market.reputation || 0) + 2);

      await user.save();
      await ctx.react('🛍️');

      const position = positionOf(market.collection, itemId);

      return ctx.reply(
        `『 🛍️ 』 *TRANSACCIÓN COMPLETADA*\n\n> ¡Listo! 🤩\n\n` +
        `✦ *Objeto:* #${position} ${item.name}\n✦ *Pagaste:* ${paid} ${coin}\n✦ *Valor:* ❓ Sin tasar\n\n` +
        `📖 _${pickRandom(SELLER_MESSAGES)}_\n` +
        `> _Usá *${ZenConfig.prefix}valorar ${position}* para saber si fue buen negocio 🧐_\n\n` +
        repLine(market)
      );
    }

    const fee = Math.floor(effectiveBid * (0.15 + Math.random() * 0.35));
    const paid = Math.min(user.zencoins, fee);
    user.zencoins -= paid;

    market.deals = (market.deals || 0) + 1;
    market.failedDeals = (market.failedDeals || 0) + 1;
    user.stats.marketDeals = (user.stats.marketDeals || 0) + 1;
    user.stats.marketLosses = (user.stats.marketLosses || 0) + 1;
    market.reputation = Math.max(-50, (market.reputation || 0) - 2);

    await user.save();
    await ctx.react('💀');

    return ctx.reply(
      `『 💀 』 *NEGOCIACIÓN FALLIDA*\n\n> Uy, salió mal 😭\n\n` +
      `✦ *Objeto:* ${item.name}\n✦ *Oferta:* ${effectiveBid} ${coin}\n✦ *Multa:* ${paid} ${coin}\n\n` +
      `📖 _${pickRandom(REJECTIONS)}_\n\n` +
      repLine(market)
    );
  });
