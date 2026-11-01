import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { getMarket, describeImpacts, timeLeft, trendEmoji } from '../../lib/economy/bolsa.js';

export default new ZenCommand('noticias')
  .addAlias('news', 'marketnews')
  .setCooldown(10)
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

    await ctx.react('📰');

    const now = Date.now();
    const market = getMarket(now);
    const companies = Object.values(market.companies);
    const rising = companies.filter((c) => c.trend === 'alcista');
    const falling = companies.filter((c) => c.trend === 'bajista');

    const lines = ['『 📰 』 *NOTICIAS DEL MERCADO*\n', '> Esto es lo que mueve la bolsa ahora mismo 🧐\n'];

    for (const news of market.news) {
      lines.push(`✦ *${news.event}*\n  ${describeImpacts(news)}\n`);
    }

    lines.push(`✦ *En alza:* ${rising.length ? rising.map((c) => `${trendEmoji(c.trend)} ${c.short}`).join(', ') : 'Ninguna'}`);
    lines.push(`✦ *En baja:* ${falling.length ? falling.map((c) => `${trendEmoji(c.trend)} ${c.short}`).join(', ') : 'Ninguna'}`);
    lines.push(`✦ *Próxima actualización:* ${timeLeft(market.endsAt - now)} ⏳\n`);
    lines.push(`> _Usá *${ZenConfig.prefix}analizar [empresa]* para ver el detalle y *${ZenConfig.prefix}invertir [empresa] [monto]* para aprovecharlo 😉_`);

    return ctx.reply(lines.join('\n'));
  });
