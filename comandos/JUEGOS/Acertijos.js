import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { acertijos } from '../../lib/database/games/acertijos.js';

const partidas = new Map();
const cooldowns = new Map();
const TIEMPO_MAX = 90000;
const PREMIO_BASE = 200;
const COOLDOWN_TIEMPO = 60000;

function nombreCorto(jid) { return jid.split('@')[0]; }

function acertijoAleatorio(usados = new Set()) {
  const disponibles = acertijos.map((item, i) => ({ item, i })).filter(({ i }) => !usados.has(i));
  const pool = disponibles.length ? disponibles : acertijos.map((item, i) => ({ item, i }));
  const { item, i } = pool[Math.floor(Math.random() * pool.length)];
  return { idx: i, item };
}

function normalizar(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').trim();
}

function calcularPremio(tiempoMs, racha) {
  const segundosRestantes = Math.max(0, Math.floor((TIEMPO_MAX - tiempoMs) / 1000));
  const bonusTiempo = Math.floor(segundosRestantes / 10) * 20;
  const bonusRacha = racha >= 3 ? Math.min(racha * 20, 200) : 0;
  return PREMIO_BASE + bonusTiempo + bonusRacha;
}

export default new ZenCommand('acertijo')
  .addAlias('ac', 'riddle', 'enigma')
  .setCooldown(0)
  .setCategory('Juegos')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const sender = ctx.sender;
    const chatId = ctx.chat;
    const prefix = ZenConfig.prefix;

    if (cooldowns.has(sender) && cooldowns.get(sender) > Date.now()) {
      const faltan = Math.ceil((cooldowns.get(sender) - Date.now()) / 1000);
      await ctx.react('⏳');
      return ctx.reply(
        `『 ⏳ 』 *ESPERA UN MOMENTO*\n\n> Esperá *${faltan}s* para jugar de nuevo 🙃`
      );
    }

    if (partidas.has(chatId)) {
      const p = partidas.get(chatId);
      const restante = Math.max(0, Math.ceil((TIEMPO_MAX - (Date.now() - p.inicio)) / 1000));
      return ctx.reply(
        `『 ⚠️ 』 *YA HAY UN ACERTIJO ACTIVO*\n\n> _${p.pregunta} 😅_\n\n> ⏱️ Quedan *${restante}s* — respondé sin prefijo\n> *${prefix}pasaracertijo* para rendirte`
      );
    }

    const { idx, item } = acertijoAleatorio();
    const racha = user.acRacha || 0;

    const p = {
      jugador: sender,
      pregunta: item.pregunta,
      respuesta: item.respuesta,
      idx,
      inicio: Date.now(),
      timer: null
    };

    p.timer = setTimeout(async () => {
      if (!partidas.has(chatId)) return;
      if (partidas.get(chatId).idx !== idx) return;
      partidas.delete(chatId);
      cooldowns.set(sender, Date.now() + COOLDOWN_TIEMPO);
      user.acRacha = 0;
      await user.save();
      await ctx.reply(
        `『 ⏱️ 』 *TIEMPO AGOTADO*\n\n> Se pasó el tiempo 😴\n> La respuesta era: *${item.respuesta.toUpperCase()}*\n> Racha reiniciada 😴`
      );
    }, TIEMPO_MAX);

    partidas.set(chatId, p);
    await ctx.react('🧩');

    let msg = `『 🧩 』 *ACERTIJO*\n\n> _${item.pregunta} 😄_\n\n` +
      `✦ *Premio base:* ${PREMIO_BASE} ${ZenConfig.currencies.zencoins.emoji} + bonos\n`;
    if (racha >= 2) msg += `✦ *Tu racha:* ${racha} — bono activo\n`;
    msg += `✦ *Tiempo:* 90 segundos — respondé enviando la palabra directamente\n` +
      `✦ *${prefix}pasaracertijo* para pasar\n` +
      `✦ *${prefix}acstats* para tus stats`;

    return ctx.reply(msg);
  });

export const cmdPasarAcertijo = new ZenCommand('pasaracertijo')
  .addAlias('pac', 'skipriddle')
  .setCategory('Juegos')
  .setHidden(true)
  .requireRegistration()
  .onExecute(async (ctx) => {
    const chatId = ctx.chat;
    const sender = ctx.sender;

    if (!partidas.has(chatId)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SIN ACERTIJO ACTIVO*`);
    }

    const p = partidas.get(chatId);
    if (p.jugador !== sender) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *NO ES TU ACERTIJO*`);
    }

    clearTimeout(p.timer);
    partidas.delete(chatId);
    cooldowns.set(sender, Date.now() + COOLDOWN_TIEMPO);

    const user = await ctx.getUser();
    user.acRacha = 0;
    await user.save();

    await ctx.react('🏳️');
    return ctx.reply(
      `『 🏳️ 』 *PASASTE*\n\n> La respuesta era: *${p.respuesta.toUpperCase()}*\n> Racha reiniciada 😄`
    );
  });

export const cmdAcStats = new ZenCommand('acstats')
  .setCategory('Juegos')
  .requireRegistration()
  .setUsage('@usuario (opcional)')
  .onExecute(async (ctx) => {
    const mentioned = ctx.mentions?.[0] || ctx.sender;
    const target = await ctx.getUserById(mentioned);
    const wins = target.acWins || 0;
    const losses = target.acLosses || 0;
    const ganado = target.acEarned || 0;
    const racha = target.acRacha || 0;
    const maxR = target.acMaxRacha || 0;
    const total = wins + losses;
    const pct = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';

    await ctx.react('📊');
    return ctx.reply(
      `『 📊 』 *STATS ACERTIJOS — @${nombreCorto(mentioned)}*\n\n` +
      `✦ *Correctas:* ${wins}\n` +
      `✦ *Falladas:* ${losses}\n` +
      `✦ *Acierto:* ${pct}%\n` +
      `✦ *Racha actual:* ${racha}\n` +
      `✦ *Mejor racha:* ${maxR}\n` +
      `✦ *Ganado:* +${ganado} ${ZenConfig.currencies.zencoins.emoji}`
    );
  });

export const cmdAcRanking = new ZenCommand('acranking')
  .addAlias('acrank')
  .setCategory('Juegos')
  .requireRegistration()
  .onExecute(async (ctx) => {
    await ctx.react('🏆');
    const UserModel = (await import('../../lib/database/adapter.js')).UserModel;
    const todos = await UserModel.find({
      $or: [{ 'acWins': { $gt: 0 } }, { 'acLosses': { $gt: 0 } }]
    }).sort({ acWins: -1, acMaxRacha: -1 }).limit(10);

    if (!todos.length) {
      return ctx.reply(`『 📋 』 *RANKING ACERTIJOS*\n\n> Nadie jugó aún 😉`);
    }

    const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    const lines = todos.map((u, i) => {
      const name = u.name || nombreCorto(u.id);
      return `${MEDALS[i]} *${name}* — ✅${u.acWins||0} ❌${u.acLosses||0} 🔥${u.acMaxRacha||0} │ +${u.acEarned||0} ${ZenConfig.currencies.zencoins.emoji}`;
    }).join('\n');

    return ctx.reply(
      `『 🏆 』 *RANKING GLOBAL ACERTIJOS*\n\n${lines}`
    );
  });

export const acertijoListener = {
  before: async (msg, sock, ctx) => {
    if (!ctx.isGroup) return;
    if (ctx.rawMsg.key.fromMe) return;

    const chatId = ctx.chat;
    if (!partidas.has(chatId)) return;

    const p = partidas.get(chatId);
    if (p.jugador !== ctx.sender) return;

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    if (!body) return;
    if (body.startsWith(ZenConfig.prefix)) return;

    const intento = normalizar(body);
    const correcta = normalizar(p.respuesta);
    if (intento !== correcta) return;

    clearTimeout(p.timer);
    partidas.delete(chatId);
    cooldowns.set(ctx.sender, Date.now() + COOLDOWN_TIEMPO);

    const tiempoUsado = Date.now() - p.inicio;
    const user = await ctx.getUser();
    const rachaActual = user.acRacha || 0;
    const nuevaRacha = rachaActual + 1;
    const maxRacha = Math.max(user.acMaxRacha || 0, nuevaRacha);
    const premio = calcularPremio(tiempoUsado, rachaActual);
    const segundos = Math.floor(tiempoUsado / 1000);

    user.acWins = (user.acWins || 0) + 1;
    user.acEarned = (user.acEarned || 0) + premio;
    user.zencoins = (user.zencoins || 0) + premio;
    user.acRacha = nuevaRacha;
    user.acMaxRacha = maxRacha;
    await user.save();

    let txt = `『 ✅ 』 *¡CORRECTO, @${nombreCorto(ctx.sender)}!*\n\n` +
      `✦ *Respuesta:* ${p.respuesta.toUpperCase()}\n` +
      `✦ *Tiempo:* ${segundos}s\n` +
      `✦ *Premio:* +${premio} ${ZenConfig.currencies.zencoins.emoji}\n`;
    if (nuevaRacha >= 3) txt += `✦ *Racha:* ${nuevaRacha} — bono aplicado\n`;
    if (nuevaRacha > (user.acMaxRacha || 0)) txt += `✦ *¡NUEVA MEJOR RACHA!* 🏅\n`;

    await ctx.reply(txt);
  }
};