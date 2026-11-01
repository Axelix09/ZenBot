import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { COMPANIES, getMarket, trendEmoji } from '../../lib/economy/bolsa.js';

const coin = ZenConfig.currencies.zencoins.emoji;

export default new ZenCommand('portafolio')
  .addAlias('portfolio', 'misinversiones')
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

    await ctx.react('📊');

    const investments = user.investments || {};
    const portfolio = Object.fromEntries(Object.entries(investments.portfolio || {}).filter(([id]) => COMPANIES[id]));
    const speculations = Array.isArray(investments.speculations) ? investments.speculations : [];

    if (Object.keys(portfolio).length === 0 && speculations.length === 0) {
      return ctx.reply(
        `『 📊 』 *PORTAFOLIO VACÍO*\n\n` +
        `> Todavía no hiciste ninguna operación 🙂\n` +
        `> Usá *${ZenConfig.prefix}invertir [empresa] [monto]* para comenzar.`
      );
    }

    const market = getMarket();
    const totalInvested = investments.totalInvested || 0;
    const totalReturned = investments.currentValue || 0;
    const profitLoss = totalReturned - totalInvested;

    const lines = [
      `『 📊 』 *MI PORTAFOLIO DE INVERSIONES*`,
      ``,
      `> Así te viene yendo en la bolsa 🧐`,
      ``,
      `✦ *Invertido en total:* ${totalInvested} ${coin}`,
      `✦ *Recibido en total:* ${totalReturned} ${coin}`,
      `✦ *Resultado:* ${profitLoss >= 0 ? '📈' : '📉'} ${profitLoss > 0 ? '+' : ''}${profitLoss} ${coin}`,
      ``
    ];

    for (const [id, data] of Object.entries(portfolio)) {
      const company = COMPANIES[id];
      const invested = data.totalInvested || 0;
      const trend = market.companies[id] ? trendEmoji(market.companies[id].trend) : '➖';
      lines.push(`✦ *${company?.name || id}* ${trend}`);
      lines.push(`  • Operaciones: ${data.shares || 0}${data.wins !== undefined ? ` (ganó ${data.wins}, perdió ${data.losses || 0})` : ''}`);
      lines.push(`  • Invertido: ${invested} ${coin}`);
      if (data.totalReturned !== undefined) {
        const net = data.totalReturned - invested;
        const roi = invested > 0 ? Math.round((net / invested) * 100) : 0;
        lines.push(`  • Resultado: ${net > 0 ? '+' : ''}${net} ${coin} (${roi > 0 ? '+' : ''}${roi}%)`);
      }
      lines.push(``);
    }

    if (investments.bestInvestment) {
      lines.push(`🏆 *Mejor inversión:* ${investments.bestInvestment.name} (+${investments.bestInvestment.profit} ${coin})`);
    }
    if (investments.worstInvestment) {
      lines.push(`📉 *Peor inversión:* ${investments.worstInvestment.name} (-${investments.worstInvestment.loss} ${coin})`);
    }

    if (speculations.length > 0) {
      const wins = speculations.filter((s) => s.result === 'win');
      const net = speculations.reduce((sum, s) => sum + (s.result === 'win' ? s.profit || 0 : -(s.loss || 0)), 0);
      lines.push(``);
      lines.push(`✦ *Especulaciones recientes:* ${speculations.length} (aciertos: ${wins.length})`);
      lines.push(`  • Resultado: ${net > 0 ? '+' : ''}${net} ${coin}`);
    }

    lines.push(``);
    lines.push(`> _Usá *${ZenConfig.prefix}analizar [empresa]* antes de tu próxima jugada 😉_`);

    return ctx.reply(lines.join('\n'));
  });
