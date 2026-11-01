import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { getSpec, bonusPercent, ensureMarket, resolveItem, sortedCollection, getDemand, demandEmoji } from '../../lib/economy/pulgas.js';

const coin = ZenConfig.currencies.zencoins.emoji;

export default new ZenCommand('vender')
  .addAlias('sell', 'liquidar')
  .setCooldown(5)
  .setCategory('Economía')
  .requireRegistration()
  .setUsage('<n|todo>')
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
      return ctx.reply(`『 ⚠️ 』 *NÚMERO REQUERIDO*\n\n> Decime qué querés vender 🤨\n> Usá *${ZenConfig.prefix}vender [n]* o *${ZenConfig.prefix}vender todo*\n> Mirá los números con *${ZenConfig.prefix}coleccion*`);
    }

    const market = ensureMarket(user);
    const sellAll = ['todo', 'all'].includes(arg.toLowerCase());
    let targets;

    if (sellAll) {
      targets = sortedCollection(market.collection);
      if (targets.length === 0) {
        await ctx.react('📦');
        return ctx.reply(`『 📦 』 *COLECCIÓN VACÍA*\n\n> No tenés nada para vender 😅\n> Conseguí objetos con *${ZenConfig.prefix}regatear*`);
      }
    } else {
      const found = resolveItem(market.collection, arg);
      if (!found) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *OBJETO NO ENCONTRADO*\n\n> No tenés ese objeto en tu colección 🫤\n> Revisá los números con *${ZenConfig.prefix}coleccion*`);
      }
      targets = [found];
    }

    const spec = getSpec(user);
    const antiqueBonus = spec.id === 'antiguedades' ? spec.bonus : 0;
    const { demand } = getDemand();

    let totalReceived = 0;
    let totalPaid = 0;
    let repChange = 0;
    const sales = [];

    for (const [id, item] of targets) {
      const price = Math.floor(item.realValue * (0.7 + Math.random() * 0.3) * (demand[item.type] || 1) * (1 + antiqueBonus));
      const profit = price - item.paid;
      totalReceived += price;
      totalPaid += item.paid;
      repChange += profit > 0 ? 2 : -1;
      sales.push({ item, price, profit });

      if (!market.bestFind || profit > (market.bestFind.profit || 0)) {
        if (profit > 0) market.bestFind = { name: item.name, paid: item.paid, value: price, profit };
      }

      market.totalValue = Math.max(0, (market.totalValue || 0) - (item.realValue || 0));
      delete market.collection[id];
    }

    user.zencoins += totalReceived;
    market.reputation = Math.min(100, Math.max(-50, (market.reputation || 0) + Math.max(-6, Math.min(6, repChange))));

    if (typeof user.markModified === 'function') {
      user.markModified('market');
    }

    await user.save();
    await ctx.react('💰');

    const net = totalReceived - totalPaid;
    const emoji = net >= 0 ? '📈' : '📉';
    const bonusLine = antiqueBonus > 0 ? `\n✦ *Bonus Antigüedades:* +${bonusPercent(antiqueBonus)}%` : '';

    if (sales.length === 1) {
      const { item, price, profit } = sales[0];
      return ctx.reply(
        `『 💰 』 *VENTA REALIZADA*\n\n> ${profit > 0 ? '¡Eso estuvo bueno! 😄' : 'Se vendió, aunque no fue el mejor negocio 😅'}\n\n` +
        `✦ *Objeto:* ${item.name}\n✦ *Demanda:* ${demandEmoji(demand[item.type] || 1)} x${(demand[item.type] || 1).toFixed(2)}\n✦ *Pagaste:* ${item.paid} ${coin}\n✦ *Vendiste por:* ${price} ${coin}\n✦ *Ganancia:* ${profit >= 0 ? '📈' : '📉'} ${profit > 0 ? '+' : ''}${profit} ${coin}${bonusLine}`
      );
    }

    return ctx.reply(
      `『 💰 』 *VENTA MASIVA*\n\n> ${net >= 0 ? '¡Liquidaste todo con ganancia! 🥳' : 'Liquidaste todo, aunque con pérdida 😬'}\n\n` +
      `✦ *Objetos vendidos:* ${sales.length}\n✦ *Pagaste en total:* ${totalPaid} ${coin}\n✦ *Recibiste:* ${totalReceived} ${coin}\n✦ *Resultado:* ${emoji} ${net > 0 ? '+' : ''}${net} ${coin}${bonusLine}`
    );
  });
