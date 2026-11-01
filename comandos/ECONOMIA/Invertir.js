import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { COMPANIES, getMarket, findCompany, rollMultiplier, trendEmoji, trendLabel, timeLeft, ensureInvestments } from '../../lib/economy/bolsa.js';

const COOLDOWN_MS = 300000;
const MIN_INVEST = 500;
const MAX_INVEST = 20000;
const coin = ZenConfig.currencies.zencoins.emoji;

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export default new ZenCommand('invertir')
  .addAlias('invest', 'acciones', 'bolsa')
  .setCooldown(0)
  .setCategory('Economía')
  .requireRegistration()
  .setUsage('<empresa> <monto>')
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

    const [companyRaw, amountRaw] = ctx.args;
    const now = Date.now();
    const market = getMarket(now);

    if (!companyRaw || !amountRaw) {
      await ctx.react('📈');
      const investments = ensureInvestments(user);
      const invested = investments.totalInvested || 0;
      const returned = investments.currentValue || 0;
      const net = returned - invested;

      const list = Object.values(market.companies)
        .map((c) => `  • *${c.name}* [${c.id}]\n    Riesgo: ${'🟥'.repeat(Math.ceil(c.risk * 10))}${'⬜'.repeat(10 - Math.ceil(c.risk * 10))}\n    Tendencia: ${trendEmoji(c.trend)} ${trendLabel(c.trend)}`)
        .join('\n\n');

      return ctx.reply(
        `『 📈 』 *MERCADO DE INVERSIONES*\n\n` +
        `> Elegí la empresa según las noticias y apostá con cabeza 😎\n\n` +
        `✦ *Invertido en total:* ${invested} ${coin}\n✦ *Recibido en total:* ${returned} ${coin}\n✦ *Resultado:* ${net >= 0 ? '📈' : '📉'} ${net > 0 ? '+' : ''}${net} ${coin}\n\n` +
        `✦ *Empresas ahora:*\n${list}\n\n` +
        `✦ *Mercado cambia en:* ${timeLeft(market.endsAt - now)} ⏳\n` +
        `✦ *Uso:* ${ZenConfig.prefix}${ctx.commandName} [empresa] [monto]\n✦ *Límites:* ${MIN_INVEST} - ${MAX_INVEST} ${coin}\n` +
        `> _Ejemplo: ${ZenConfig.prefix}${ctx.commandName} ${Object.keys(COMPANIES)[0]} 1000_\n\n` +
        `✦ *Comandos:*\n` +
        `  • ${ZenConfig.prefix}noticias - Qué mueve el mercado\n` +
        `  • ${ZenConfig.prefix}analizar [empresa] - Detalle de una empresa\n` +
        `  • ${ZenConfig.prefix}portafolio - Tu historial\n` +
        `  • ${ZenConfig.prefix}especular [empresa] [sube/baja] [monto] - Apostar a la tendencia`
      );
    }

    const base = findCompany(companyRaw);
    if (!base) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *EMPRESA NO ENCONTRADA*\n\n> Busqué y nada 🥲\n> Opciones: ${Object.keys(COMPANIES).join(', ')}`);
    }

    const investment = parseInt(amountRaw, 10);
    if (isNaN(investment) || investment < MIN_INVEST || investment > MAX_INVEST) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *INVERSIÓN INVÁLIDA*\n\n> Tiene que ser entre *${MIN_INVEST}* y *${MAX_INVEST}* ${coin} 🤨`);
    }

    if (user.zencoins < investment) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SALDO INSUFICIENTE*\n\n> Solo tenés ${user.zencoins} ${coin} 😬`);
    }

    if (!user.cooldowns) user.cooldowns = {};
    const lastUsed = user.cooldowns.invertir || 0;
    if (now - lastUsed < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - lastUsed)) / 1000);
      await ctx.react('⏳');
      return ctx.reply(`『 ⏳ 』 *MERCADO EN ANÁLISIS*\n\n> Esperá *${remaining}s* 😴`);
    }

    const company = market.companies[base.id];
    const investments = ensureInvestments(user);

    const multiplier = rollMultiplier(company);
    const payout = Math.floor(investment * multiplier);
    const profit = payout - investment;
    const isWin = profit > 0;

    user.zencoins += profit;
    user.cooldowns.invertir = now;

    let entry = investments.portfolio[company.id];
    if (!entry || entry.totalReturned === undefined) {
      entry = { shares: 0, buyPrice: 0, totalInvested: 0, totalReturned: 0, wins: 0, losses: 0 };
    }
    entry.shares = (entry.shares || 0) + 1;
    entry.totalInvested = (entry.totalInvested || 0) + investment;
    entry.totalReturned = (entry.totalReturned || 0) + payout;
    entry.wins = (entry.wins || 0) + (isWin ? 1 : 0);
    entry.losses = (entry.losses || 0) + (isWin ? 0 : 1);
    entry.buyPrice = Math.round(entry.totalInvested / entry.shares);
    investments.portfolio[company.id] = entry;

    investments.totalInvested = (investments.totalInvested || 0) + investment;
    investments.currentValue = (investments.currentValue || 0) + payout;
    investments.profitLoss = investments.currentValue - investments.totalInvested;

    if (isWin && (!investments.bestInvestment || profit > (investments.bestInvestment.profit || 0))) {
      investments.bestInvestment = { name: company.name, profit, total: payout };
    }
    if (!isWin && (!investments.worstInvestment || -profit > (investments.worstInvestment.loss || 0))) {
      investments.worstInvestment = { name: company.name, loss: -profit };
    }

    user.stats.investments = (user.stats.investments || 0) + 1;
    if (isWin) user.stats.investmentWins = (user.stats.investmentWins || 0) + 1;
    else user.stats.investmentLosses = (user.stats.investmentLosses || 0) + 1;

    if (typeof user.markModified === 'function') {
      user.markModified('cooldowns');
      user.markModified('investments');
      user.markModified('stats');
    }

    await user.save();
    await ctx.react(isWin ? '📈' : '📉');

    const summary =
      `✦ *Empresa:* ${company.name}\n✦ *Tendencia:* ${trendEmoji(company.trend)} ${trendLabel(company.trend)}\n✦ *Multiplicador:* x${multiplier.toFixed(2)}\n` +
      `✦ *Invertiste:* ${investment} ${coin}\n✦ *Recibiste:* ${payout} ${coin}\n`;
    const total = `✦ *Resultado total:* ${investments.profitLoss >= 0 ? '📈' : '📉'} ${investments.profitLoss > 0 ? '+' : ''}${investments.profitLoss} ${coin}`;

    if (isWin) {
      const messages = [
        `Las acciones de ${company.name} subieron con fuerza.`,
        `Los analistas destacan el desempeño de ${company.name}.`,
        `${company.name} superó las expectativas del mercado.`,
        `Los inversores vuelven a confiar en ${company.name}.`
      ];
      return ctx.reply(
        `『 📈 』 *INVERSIÓN EXITOSA*\n\n> ¡Bien ahí! 😎\n\n` +
        summary + `✦ *Ganancia:* +${profit} ${coin}\n\n` +
        `📖 _${pickRandom(messages)}_\n\n` + total
      );
    }

    const messages = [
      `Las acciones de ${company.name} cayeron con fuerza.`,
      `El mercado castigó a ${company.name}.`,
      `Los inversores se retiran de ${company.name}.`,
      `${company.name} no cumplió las expectativas.`
    ];
    return ctx.reply(
      `『 📉 』 *INVERSIÓN PERDIDA*\n\n> Noo, falló 😵\n\n` +
      summary + `✦ *Pérdida:* -${-profit} ${coin}\n\n` +
      `📖 _${pickRandom(messages)}_\n\n` + total
    );
  });
