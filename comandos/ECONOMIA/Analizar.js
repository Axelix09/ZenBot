import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { COMPANIES, getMarket, findCompany, trendEmoji, trendLabel, timeLeft, newsEffectOn } from '../../lib/economy/bolsa.js';

const coin = ZenConfig.currencies.zencoins.emoji;

export default new ZenCommand('analizar')
  .addAlias('analyze', 'analisis')
  .setCooldown(15)
  .setCategory('Economía')
  .requireRegistration()
  .setUsage('<empresa>')
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

    const [target] = ctx.args;
    const now = Date.now();
    const market = getMarket(now);

    if (!target) {
      await ctx.react('📊');
      const list = Object.values(market.companies)
        .map((c) => `  • ${c.name} [${c.id}] ${trendEmoji(c.trend)} - Riesgo: ${Math.round(c.risk * 100)}%`)
        .join('\n');

      return ctx.reply(
        `『 📊 』 *ANÁLISIS DE EMPRESAS*\n\n` +
        `> Mirá cómo viene cada empresa antes de invertir 🧐\n\n` +
        `✦ *Empresas disponibles:*\n${list}\n\n` +
        `✦ *Próxima actualización:* ${timeLeft(market.endsAt - now)} ⏳\n` +
        `✦ *Uso:* ${ZenConfig.prefix}${ctx.commandName} [id]\n` +
        `> _Ejemplo: ${ZenConfig.prefix}${ctx.commandName} ${Object.keys(COMPANIES)[0]}_`
      );
    }

    const base = findCompany(target);

    if (!base) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *EMPRESA NO ENCONTRADA*\n\n> Busqué y nada 🥲\n> Opciones: ${Object.keys(COMPANIES).join(', ')}`);
    }

    const company = market.companies[base.id];
    const related = market.news.filter((n) => newsEffectOn(n, company.id) !== undefined);
    const history = user.investments?.portfolio?.[company.id];

    const riskEmoji = company.risk < 0.35 ? '🟢' : company.risk < 0.55 ? '🟡' : '🔴';
    const riskLevel = company.risk < 0.35 ? 'Bajo' : company.risk < 0.55 ? 'Medio' : 'Alto';

    const recommendation = company.trend === 'alcista' && company.confidence > 0.6
      ? '✅ Buen momento para invertir'
      : company.trend === 'bajista' && company.confidence > 0.6
      ? '⚠️ Mejor esperar, o especular a la baja'
      : '➖ Sin señales claras, jugá con cuidado';

    const newsText = related.length
      ? related.map((n) => `  • ${n.event} ${newsEffectOn(n, company.id) > 1 ? '📈' : '📉'}`).join('\n')
      : '  • Ninguna noticia la afecta ahora';

    let historyLine = '';
    if (history && history.shares > 0 && history.totalReturned !== undefined) {
      const net = history.totalReturned - (history.totalInvested || 0);
      historyLine = `✦ *Tu historial:* ${history.shares} operaciones, ${net > 0 ? '+' : ''}${net} ${coin}\n`;
    }

    await ctx.react('📊');

    return ctx.reply(
      `『 📊 』 *ANÁLISIS DE ${company.name.toUpperCase()}*\n\n` +
      `> Esto es lo que veo ahora mismo 😎\n\n` +
      `✦ *Sector:* ${company.sector}\n✦ *Actividad:* ${company.about}\n` +
      `✦ *Riesgo:* ${riskEmoji} ${riskLevel} (${Math.round(company.risk * 100)}%)\n` +
      `✦ *Retorno base:* ${company.returns[0]}x - ${company.returns[1]}x\n` +
      `✦ *Volatilidad:* ${Math.round(company.volatility * 100)}%\n` +
      `✦ *Tendencia:* ${trendEmoji(company.trend)} ${trendLabel(company.trend)}\n` +
      `✦ *Confianza:* ${Math.round(company.confidence * 100)}%\n` +
      `✦ *Noticias que la afectan:*\n${newsText}\n` +
      historyLine +
      `✦ *${recommendation}*\n` +
      `✦ *Cambia en:* ${timeLeft(market.endsAt - now)} ⏳\n\n` +
      `> _Usá *${ZenConfig.prefix}invertir ${company.id} [monto]* para invertir 😉_`
    );
  });
