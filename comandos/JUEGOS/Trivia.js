import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { CATEGORIAS, getPorCategoria } from '../../lib/database/games/trivia-preguntas.js';

const TRIVIA_IMG = 'https://i.ibb.co/XrkqY11m/15dbf94b93aa43c8.jpg';

const partidas = new Map();
const TIEMPO_MAX = 30000;
const PREMIO_POR_ACIERTO = 60;
const BONUS_RACHA = [0, 0, 0, 30, 70, 120, 200, 300, 450, 650, 900];
const CATS_LIST = Object.keys(CATEGORIAS);

function getNombreCat(cat) {
  const info = CATEGORIAS[cat];
  if (!info) return cat;
  return `${info.emoji} ${info.nombre.es}`;
}

function preguntaAleatoriaCat(cat, usadas = new Set()) {
  const pool = getPorCategoria(cat);
  const disponibles = pool.map((_, i) => i).filter(i => !usadas.has(i));
  if (!disponibles.length) return null;
  const i = disponibles[Math.floor(Math.random() * disponibles.length)];
  usadas.add(i);
  return { idx: i, item: pool[i] };
}

function premioPorRacha(racha) {
  return PREMIO_POR_ACIERTO + BONUS_RACHA[Math.min(racha, BONUS_RACHA.length - 1)];
}

export default new ZenCommand('trivia')
  .addAlias('tv')
  .setCooldown(3)
  .setCategory('Juegos')
  .requireRegistration()
  .setUsage('[categoría]')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const [arg] = ctx.args;
    const chatId = ctx.chat;
    const sender = ctx.sender;
    const prefix = ZenConfig.prefix;

    if (!user.registered) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *NO REGISTRADO*\n\n> Necesitás estar registrado para jugar trivia 🫤`);
    }

    if (partidas.has(chatId)) {
      const p = partidas.get(chatId);
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *YA HAY UNA TRIVIA ACTIVA*`);
    }

    if (!arg) {
      const catLines = CATS_LIST.map((cat, i) => `> ${CATEGORIAS[cat].emoji} *${i + 1}.* ${CATEGORIAS[cat].nombre.es} 🤨`).join('\n');
      return ctx.sock.sendMessage(ctx.chat, {
        image: { url: TRIVIA_IMG },
        caption: `『 🧠 』 *TRIVIA — ELEGÍ UNA CATEGORÍA*\n\n${catLines}\n\n> Respondé con *${prefix}trivia <número>* 😌\n> _Ejemplo: ${prefix}trivia 1_`
      }, { quoted: ctx.rawMsg });
    }

    let catKey = null;
    const numArg = parseInt(arg);
    if (!isNaN(numArg) && numArg >= 1 && numArg <= CATS_LIST.length) {
      catKey = CATS_LIST[numArg - 1];
    } else {
      catKey = CATS_LIST.find(k => k.startsWith(arg) || CATEGORIAS[k].nombre.es.toLowerCase().startsWith(arg)) || null;
    }

    if (!catKey) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *CATEGORÍA INVÁLIDA*\n\n> Usá *${prefix}trivia* para ver las categorías 🤨`);
    }

    const p = {
      jugador: sender,
      cat: catKey,
      racha: 0,
      acumulado: 0,
      usadas: new Set(),
      preguntaActual: null,
      idxActual: -1,
      timer: null
    };

    const result = preguntaAleatoriaCat(catKey, p.usadas);
    if (!result) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *CATEGORÍA INVÁLIDA*\n\n> Usá *${prefix}trivia* para ver las categorías 🤨`);
    }

    p.preguntaActual = result.item;
    p.idxActual = result.idx;
    p.timer = setTimeout(async () => {
      if (!partidas.has(chatId)) return;
      const partida = partidas.get(chatId);
      if (partida.idxActual !== result.idx) return;
      partidas.delete(chatId);
      await ctx.reply(
        `『 ⏰ 』 *TIEMPO AGOTADO*\n\n> Se nos fue el tiempo 😬\n> La respuesta era: *${result.item.opciones.find(o => o.toUpperCase().startsWith(result.item.respuesta)) || result.item.respuesta}*`
      );
    }, TIEMPO_MAX);

    partidas.set(chatId, p);

    const sig = premioPorRacha(p.racha + 1);
    const rachEmoji = p.racha >= 5 ? '🔥' : p.racha >= 3 ? '⚡' : '✨';

    let msg = `『 🧠 』 *TRIVIA ${CATEGORIAS[catKey]?.emoji || ''} ${getNombreCat(catKey)} — Racha ${rachEmoji} ${p.racha}*\n\n` +
      `_${result.item.pregunta}_\n\n` +
      result.item.opciones.map(o => `> ${o} 🙂`).join('\n') +
      `\n\n> 💰 Acumulado: *${p.acumulado}* ${ZenConfig.currencies.zencoins.emoji}\n` +
      `> ➕ Esta vale: *+${sig}* ${ZenConfig.currencies.zencoins.emoji}\n` +
      `> ⏱️ *30 segundos* — respondé *a, b, c* o *d* sin prefijo\n` +
      `> 💵 *${prefix}cobrar* para cobrar | *${prefix}tvstats* tus stats`;

    await ctx.react('🧠');
    return ctx.reply(msg);
  });

export const cmdCobrar = new ZenCommand('cobrar')
  .addAlias('claim')
  .setCategory('Juegos')
  .setHidden(true)
  .requireRegistration()
  .onExecute(async (ctx) => {
    const chatId = ctx.chat;
    const sender = ctx.sender;

    if (!partidas.has(chatId)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SIN TRIVIA ACTIVA*`);
    }

    const p = partidas.get(chatId);
    if (p.jugador !== sender) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *NO ES TU TRIVIA*`);
    }

    if (p.acumulado === 0) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SIN ACUMULADO*\n\n> Respondé al menos una pregunta primero 🫤`);
    }

    clearTimeout(p.timer);
    partidas.delete(chatId);

    const user = await ctx.getUser();
    user.zencoins += p.acumulado;
    await user.save();

    await ctx.react('💰');
    return ctx.reply(
      `『 💰 』 *¡COBRADO!*\n\n> @${sender.split('@')[0]} cobró *${p.acumulado}* ${ZenConfig.currencies.zencoins.emoji} 😄\n> Racha final: *${p.racha}* preguntas seguidas`
    );
  });

export const triviaListener = {
  before: async (msg, sock, ctx) => {
    if (ctx.rawMsg.key.fromMe) return;

    const chatId = ctx.chat;
    const sender = ctx.sender;

    if (!partidas.has(chatId)) return;

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    if (!body) return;

    const respuesta = body.trim().toUpperCase();
    if (!['A', 'B', 'C', 'D'].includes(respuesta)) return;

    const p = partidas.get(chatId);
    if (p.jugador !== sender) return;

    const correcta = p.preguntaActual.respuesta.toUpperCase();

    if (respuesta !== correcta) {
      clearTimeout(p.timer);
      partidas.delete(chatId);

      const opCorrecta = p.preguntaActual.opciones.find(o => o.toUpperCase().startsWith(correcta)) || correcta;
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *INCORRECTO*\n\n> Eso no me cierra 😵‍💫\n> La correcta era: *${opCorrecta}*\n> 💸 Perdiste *${p.acumulado}* ${ZenConfig.currencies.zencoins.emoji} acumulados\n> Racha perdida: *${p.racha}*`
      );
    }

    clearTimeout(p.timer);
    const premio = premioPorRacha(p.racha + 1);
    p.racha++;
    p.acumulado += premio;

    const user = await ctx.getUser();
    if (p.racha > (user.tvMaxRacha || 0)) {
      user.tvMaxRacha = p.racha;
    }
    await user.save();

    const opCorrecta = p.preguntaActual.opciones.find(o => o.toUpperCase().startsWith(correcta)) || correcta;
    const emojiTit = p.racha >= 5 ? '🔥' : p.racha >= 3 ? '⚡' : '✅';

    const siguiente = preguntaAleatoriaCat(p.cat, p.usadas);

    if (!siguiente) {
      partidas.delete(chatId);
      user.zencoins += p.acumulado;
      await user.save();

      await ctx.react('🎉');
      return ctx.reply(
        `『 🎉 』 *¡COMPLETASTE LA CATEGORÍA!*\n\n> Respondiste todas las preguntas de *${getNombreCat(p.cat)}* 😉\n> 💰 Total cobrado: *${p.acumulado}* ${ZenConfig.currencies.zencoins.emoji}\n> 🔥 Racha final: *${p.racha}*\n\n> Iniciá otra con *${ZenConfig.prefix}trivia*`
      );
    }

    p.preguntaActual = siguiente.item;
    p.idxActual = siguiente.idx;
    p.timer = setTimeout(async () => {
      if (!partidas.has(chatId)) return;
      const partida = partidas.get(chatId);
      if (partida.idxActual !== siguiente.idx) return;
      partidas.delete(chatId);
      await ctx.reply(
        `『 ⏰ 』 *TIEMPO AGOTADO*\n\n> Se nos fue el tiempo 😬\n> La respuesta era: *${siguiente.item.opciones.find(o => o.toUpperCase().startsWith(siguiente.item.respuesta)) || siguiente.item.respuesta}*`
      );
    }, TIEMPO_MAX);

    partidas.set(chatId, p);

    await ctx.react(emojiTit);
    return ctx.reply(
      `『 ✅ 』 *CORRECTO — ${opCorrecta}*\n\n> +${premio} ${ZenConfig.currencies.zencoins.emoji} | Acumulado: *${p.acumulado}* 😄\n> Racha: *${p.racha}*\n\n『 🧠 』 *SIGUIENTE PREGUNTA*\n\n` +
      `_${siguiente.item.pregunta}_\n\n` +
      siguiente.item.opciones.map(o => `> ${o} 😉`).join('\n') +
      `\n\n> 💰 Acumulado: *${p.acumulado}* ${ZenConfig.currencies.zencoins.emoji}\n> ➕ Esta vale: *+${premioPorRacha(p.racha + 1)}* ${ZenConfig.currencies.zencoins.emoji}\n> ⏱️ *30 segundos* — respondé *a, b, c* o *d* sin prefijo\n> 💵 *${ZenConfig.prefix}cobrar* para cobrar | *${ZenConfig.prefix}tvstats* tus stats`
    );
  }
};