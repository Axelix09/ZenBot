import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';

const COOLDOWN_MS = 300000;
const MAX_DAILY_ROULETTE = 15;

export default new ZenCommand('ruleta')
  .addAlias('roulette', 'rt')
  .setCooldown(0)
  .setCategory('Economía')
  .requireRegistration()
  .setUsage('<apuesta> <color/número>')
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

    const now = Date.now();
    if (!user.cooldowns) {
      user.cooldowns = {};
    }

    const lastUsed = user.cooldowns.ruleta;
    if (lastUsed) {
      const expirationTime = lastUsed + COOLDOWN_MS;
      if (now < expirationTime) {
        const timeLeftSec = (expirationTime - now) / 1000;
        const m = Math.floor(timeLeftSec / 60);
        const s = Math.floor(timeLeftSec % 60);
        const timeStr = m > 0 ? `${m}m ${s}s` : `${s}s`;
        await ctx.react('⏳');
        return ctx.reply(`『 ⏳ 』 *ENFRIAMIENTO*\n\n> Esperá *${timeStr}* para girar la ruleta 🥱`);
      }
    }

    if (!user.dailyStats) user.dailyStats = {};

    if (!user.dailyStats.rouletteReset || now - user.dailyStats.rouletteReset >= 86400000) {
      user.dailyStats.rouletteCount = 0;
      user.dailyStats.rouletteReset = now;
    }

    if (user.dailyStats.rouletteCount >= MAX_DAILY_ROULETTE) {
      await ctx.react('🚫');
      return ctx.reply(`『 🚫 』 *LÍMITE DIARIO*\n\n> ${MAX_DAILY_ROULETTE}/${MAX_DAILY_ROULETTE} jugadas hoy. Probá mañana 🙂`);
    }

    const [optRaw, amountRaw] = ctx.args;

    if (!optRaw || !amountRaw) {
      await ctx.react('🎡');
      return ctx.reply(
        `『 🎡 』 *ZEN CASINO*\n\n` +
        `✦ *Uso:* ${ZenConfig.prefix}${ctx.commandName} <opción> <monto>\n\n` +
        `✦ *OPCIONES:*\n  • 🔴 *rojo* (x2)\n  • ⚫ *negro* (x2)\n  • 🟢 *verde* (x15)\n\n` +
        `✦ *Límites:* 100 a 10,000 ${ZenConfig.currencies.zencoins.emoji}\n✦ *Jugadas hoy:* ${user.dailyStats.rouletteCount}/${MAX_DAILY_ROULETTE}`
      );
    }

    const eleccion = optRaw.toLowerCase();
    const monto = parseInt(amountRaw, 10);

    if (!['rojo', 'negro', 'verde'].includes(eleccion)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *OPCIÓN INVÁLIDA*\n\n> Creo que te faltó algo 🤔\n> Elegí: rojo, negro o verde.`);
    }

    if (isNaN(monto) || monto < 100 || monto > 10000) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *MONTO INVÁLIDO*\n\n> Debe estar entre 100 y 10,000 ${ZenConfig.currencies.zencoins.emoji} 🤨`);
    }

    if (user.zencoins < monto) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SALDO INSUFICIENTE*\n\n> Solo tenés ${user.zencoins} ${ZenConfig.currencies.zencoins.emoji} 🫣`);
    }

    const rojoList = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    const num = Math.floor(Math.random() * 37);
    const colorGanador = num === 0 ? 'verde' : (rojoList.includes(num) ? 'rojo' : 'negro');

    const gano = eleccion === colorGanador;
    const mult = eleccion === 'verde' ? 15 : 2;
    const ganancia = gano ? monto * (mult - 1) : -monto;

    user.cooldowns.ruleta = now;
    user.dailyStats.rouletteCount += 1;
    user.zencoins += ganancia;

    if (typeof user.markModified === 'function') {
      user.markModified('cooldowns');
      user.markModified('dailyStats');
    }

    await user.save();
    await ctx.react(gano ? '✨' : '💀');

    let res = `『 🎡 』 *RESULTADOS*\n\n` +
            `✦ *Número:* ${num} (${colorGanador.toUpperCase()})\n✦ *Apuesta:* ${monto} ${ZenConfig.currencies.zencoins.emoji} al **${eleccion.toUpperCase()}**\n\n`;

    if (gano) {
      res += `✦ *GANASTE!* ${monto * mult} ${ZenConfig.currencies.zencoins.emoji}\n> _Multiplicador: x${mult}_`;
    } else {
      res += `✦ *PERDISTE.* -${monto} ${ZenConfig.currencies.zencoins.emoji}`;
    }

    res += `\n\n✦ *Jugadas hoy:* ${user.dailyStats.rouletteCount}/${MAX_DAILY_ROULETTE}`;

    return ctx.reply(res);
  });