import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { COMPANIES, SPECULATION_HISTORY, getMarket, findCompany, speculationChance, speculationProfitRatio, trendEmoji, trendLabel, timeLeft, ensureInvestments } from '../../lib/economy/bolsa.js';

const COOLDOWN_MS = 120000;
const MIN_BET = 100;
const MAX_BET = 10000;
const coin = ZenConfig.currencies.zencoins.emoji;

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export default new ZenCommand('especular')
  .addAlias('speculate', 'apostaracciones')
  .setCooldown(0)
  .setCategory('Economía')
  .requireRegistration()
  .setUsage('<empresa> <sube/baja> <monto>')
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

    const [companyId, direction, amountRaw] = ctx.args;
    const now = Date.now();
    const market = getMarket(now);

    if (!companyId || !direction || !amountRaw) {
      await ctx.react('📈');
      const list = Object.values(market.companies)
        .map((c) => `  • ${c.name} [${c.id}] ${trendEmoji(c.trend)} ${trendLabel(c.trend)}`)
        .join('\n');

      return ctx.reply(
        `『 📈 』 *ESPECULACIÓN*\n\n` +
        `> Apostá a si una empresa sube o baja. Si leés bien las noticias, tenés ventaja 😏\n\n` +
        `✦ *Empresas ahora:*\n${list}\n\n` +
        `✦ *Mercado cambia en:* ${timeLeft(market.endsAt - now)} ⏳\n` +
        `✦ *Uso:* ${ZenConfig.prefix}${ctx.commandName} [empresa] [sube/baja] [monto]\n` +
        `✦ *Límites:* ${MIN_BET} - ${MAX_BET} ${coin}\n` +
        `> _Ejemplo: ${ZenConfig.prefix}${ctx.commandName} ${Object.keys(COMPANIES)[0]} baja 1000_`
      );
    }

    const base = findCompany(companyId);
    if (!base) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *EMPRESA NO ENCONTRADA*\n\n> No lo encuentro 😕\n> Opciones: ${Object.keys(COMPANIES).join(', ')}`);
    }

    const dir = direction.toLowerCase();
    if (!['sube', 'baja'].includes(dir)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *DIRECCIÓN INVÁLIDA*\n\n> Uy, algo no cuadra 🤨\n> Usá: *sube* o *baja*.`);
    }

    const amount = parseInt(amountRaw, 10);
    if (isNaN(amount) || amount < MIN_BET || amount > MAX_BET) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *MONTO INVÁLIDO*\n\n> Tiene que ser entre *${MIN_BET}* y *${MAX_BET}* ${coin} 🤔`);
    }

    if (user.zencoins < amount) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SALDO INSUFICIENTE*\n\n> Solo tenés ${user.zencoins} ${coin} 🥺`);
    }

    if (!user.cooldowns) user.cooldowns = {};
    const lastUsed = user.cooldowns.especular || 0;
    if (now - lastUsed < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - lastUsed)) / 1000);
      await ctx.react('⏳');
      return ctx.reply(`『 ⏳ 』 *MERCADO EN ANÁLISIS*\n\n> Esperá *${remaining}s* 😴`);
    }

    const company = market.companies[base.id];
    const investments = ensureInvestments(user);
    if (!Array.isArray(investments.speculations)) investments.speculations = [];

    const chance = speculationChance(company, dir);
    const win = Math.random() < chance;
    user.cooldowns.especular = now;

    const header = `✦ *Empresa:* ${company.name}\n✦ *Tendencia:* ${trendEmoji(company.trend)} ${trendLabel(company.trend)}\n✦ *Predicción:* ${dir.toUpperCase()}\n✦ *Chance de acierto:* ${Math.round(chance * 100)}%\n✦ *Apostaste:* ${amount} ${coin}\n`;

    let result;
    if (win) {
      const profit = Math.floor(amount * speculationProfitRatio(company));
      user.zencoins += profit;
      result = { result: 'win', profit };
      investments.speculations.push({ company: company.name, direction: dir, amount, result: 'win', profit, timestamp: now });
    } else {
      const loss = Math.min(user.zencoins, Math.floor(amount * (0.75 + Math.random() * 0.25)));
      user.zencoins -= loss;
      result = { result: 'loss', loss };
      investments.speculations.push({ company: company.name, direction: dir, amount, result: 'loss', loss, timestamp: now });
    }

    if (investments.speculations.length > SPECULATION_HISTORY) {
      investments.speculations = investments.speculations.slice(-SPECULATION_HISTORY);
    }

    if (!user.stats) user.stats = {};
    user.stats.speculations = (user.stats.speculations || 0) + 1;
    if (win) user.stats.speculationWins = (user.stats.speculationWins || 0) + 1;

    if (typeof user.markModified === 'function') {
      user.markModified('cooldowns');
      user.markModified('investments');
      user.markModified('stats');
    }

    await user.save();
    await ctx.react(win ? '📈' : '📉');

    if (win) {
      const messages = [
        `${company.name} se movió como esperabas.`,
        `Leíste bien el mercado: ${company.name} no te falló.`,
        `Tu análisis de ${company.name} dio resultado.`
      ];
      return ctx.reply(
        `『 📈 』 *ESPECULACIÓN GANADA*\n\n> ¡Bien ahí! 😎\n\n` +
        header + `✦ *Ganancia:* +${result.profit} ${coin}\n\n📖 _${pickRandom(messages)}_`
      );
    }

    const messages = [
      `${company.name} se movió en contra de tu predicción.`,
      `El mercado no te acompañó esta vez.`,
      `${company.name} hizo lo opuesto a lo que esperabas.`
    ];
    return ctx.reply(
      `『 📉 』 *ESPECULACIÓN PERDIDA*\n\n> Uy, salió mal 😭\n\n` +
      header + `✦ *Pérdida:* -${result.loss} ${coin}\n\n📖 _${pickRandom(messages)}_`
    );
  });
