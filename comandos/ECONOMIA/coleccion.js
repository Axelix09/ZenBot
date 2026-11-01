import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { MAX_ITEMS, sortedCollection, totalPaid, getDemand, demandSummary } from '../../lib/economy/pulgas.js';
import { timeLeft } from '../../lib/economy/bolsa.js';

const coin = ZenConfig.currencies.zencoins.emoji;

export default new ZenCommand('coleccion')
  .addAlias('collection', 'inventario')
  .setCooldown(5)
  .setCategory('Economía')
  .requireRegistration()
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

    const collection = user.market?.collection || {};
    const items = sortedCollection(collection);

    if (items.length === 0) {
      await ctx.react('📦');
      return ctx.reply(`『 📦 』 *COLECCIÓN VACÍA*\n\n> Usá *${ZenConfig.prefix}regatear* para conseguir objetos 😉`);
    }

    const lines = [`『 📦 』 *MI COLECCIÓN*\n`, `> Tenés *${items.length}/${MAX_ITEMS}* objetos 🤗\n`];

    items.forEach(([id, data], index) => {
      let status = '🔒 Sin tasar';
      if (data.appraised) {
        const diff = data.paid > 0 ? Math.round(((data.estimated - data.paid) / data.paid) * 100) : 0;
        status = data.detectedFake
          ? `⚠️ Réplica (~${data.estimated} ${coin})`
          : `🔍 Est. ~${data.estimated} ${coin} (${diff > 0 ? '+' : ''}${diff}%)`;
      }
      lines.push(`✦ *#${index + 1} ${data.name}*\n  Pagaste: ${data.paid} ${coin}  |  ${status}`);
    });

    const { demand, endsAt } = getDemand();
    lines.push(`\n✦ *Invertido:* ${totalPaid(collection)} ${coin}`);
    lines.push(`✦ *Demanda ahora:*\n  ${demandSummary(demand)}\n  Cambia en ${timeLeft(endsAt - Date.now())} ⏳`);
    lines.push(`> _Usá *${ZenConfig.prefix}valorar [n]* para saber cuánto vale y *${ZenConfig.prefix}vender [n]* o *${ZenConfig.prefix}vender todo* para venderlo 😉_`);

    return ctx.reply(lines.join('\n'));
  });
