import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonPath = path.join(__dirname, '..', '..', 'lib', 'database', 'json', 'banderas.json');

let countriesData = null;

function loadCountries() {
  if (countriesData) return countriesData;
  try {
    const raw = fs.readFileSync(jsonPath, 'utf8');
    countriesData = JSON.parse(raw);
  } catch {
    countriesData = { facil: [], medio: [], dificil: [], extremo: [] };
  }
  return countriesData;
}

const activeSessions = new Map();

function normalizeText(text = '') {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

const DIFICULTADES = {
  facil:   { segundos: 16, nombre: 'Fácil' },
  medio:   { segundos: 12, nombre: 'Medio' },
  dificil: { segundos: 9,  nombre: 'Difícil' },
  extremo: { segundos: 6,  nombre: 'Extremo' }
};

function pickRandomCountries(pool, count = 5) {
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

async function sendRoundMessage(sock, session) {
  const current = session.countries[session.currentIndex];
  const roundNum = session.currentIndex + 1;
  const cfg = session.cfg;

  const text = [
    `*ADIVINA EL PAÍS [${roundNum}/5]*`,
    `> Dificultad: ${cfg.nombre} (${cfg.segundos}s)`,
    ``,
    `Bandera:  ${current.flag}  ${current.flag}`,
    ``,
    `⏱️ Tienes *${cfg.segundos} segundos*.`,
    `Escribe el nombre del país para responder.`
  ].join('\n');

  session.startedAt = Date.now();

  session.timer = setTimeout(async () => {
    session.results.push({
      flag: current.flag,
      timeTaken: `${cfg.segundos}.0s (Agotado)`,
      isCorrect: false
    });
    session.currentIndex++;
    await nextRound(sock, session);
  }, cfg.segundos * 1000);

  return sock.sendMessage(session.chatId, { text });
}

async function nextRound(sock, session) {
  if (session.timer) clearTimeout(session.timer);

  if (session.currentIndex >= session.countries.length) {
    activeSessions.delete(session.chatId);

    const hits = session.results.filter(r => r.isCorrect).length;
    const misses = session.results.length - hits;

    const lines = [
      `*RESULTADOS DE LA PARTIDA*`,
      `> Jugador: @${session.userId.split('@')[0]}`,
      `> Dificultad: ${session.cfg.nombre}`,
      ``,
      `*Puntuación:* ${hits} de 5 aciertos (${misses} fallos)`,
      ``,
      `*Desglose por bandera:*`
    ];

    session.results.forEach((r, i) => {
      const status = r.isCorrect ? '✅ Acertada' : '❌ Fallada';
      lines.push(`${i + 1}. ${r.flag} ➜ ${status} (${r.timeTaken})`);
    });

    lines.push(``);
    lines.push(`Usa *.bandera* para jugar otra ronda.`);

    return sock.sendMessage(session.chatId, {
      text: lines.join('\n'),
      mentions: [session.userId]
    });
  }

  return sendRoundMessage(sock, session);
}

export default new ZenCommand('bandera')
  .addAlias('pais', 'adivinabandera', 'flags')
  .setCooldown(5)
  .setCategory('Juegos')
  .setUsage('[facil | medio | dificil | extremo | stop]')
  .onExecute(async (ctx) => {
    const chatId = ctx.chat;
    const [arg] = ctx.args;
    const sub = (arg || 'medio').toLowerCase();

    if (sub === 'stop' || sub === 'cancelar') {
      const session = activeSessions.get(chatId);
      if (!session) {
        return ctx.reply(`No hay ninguna partida de banderas activa 😕`);
      }
      if (session.timer) clearTimeout(session.timer);
      activeSessions.delete(chatId);
      await ctx.react('🛑');
      return ctx.reply(`Listo, frené la partida de banderas 🫡`);
    }

    if (activeSessions.has(chatId)) {
      await ctx.react('⚠️');
      return ctx.reply(`Ya hay una partida activa en este chat 😅 Respondé la bandera o usá *.bandera stop*.`);
    }

    const allData = loadCountries();
    const diffKey = DIFICULTADES[sub] ? sub : 'medio';
    const cfg = DIFICULTADES[diffKey];
    const pool = allData[diffKey] || [];

    if (!pool.length) {
      return ctx.reply(`No encontré la base de datos de banderas 😵`);
    }

    const pickedCountries = pickRandomCountries(pool, 5);

    const session = {
      chatId,
      userId: ctx.sender,
      isGroup: ctx.isGroup,
      difficulty: diffKey,
      cfg,
      countries: pickedCountries,
      currentIndex: 0,
      results: [],
      timer: null,
      startedAt: Date.now()
    };

    activeSessions.set(chatId, session);
    await ctx.react('🌍');

    if (ctx.isGroup) {
      await ctx.reply(`💡 *Tip:* Jugá en el *chat privado* del bot, así va más rápido 😉`);
    }

    return sendRoundMessage(ctx.sock, session);
  });

export const banderaListener = {
  async before(msg, sock, ctx) {
    const session = activeSessions.get(ctx.chat);
    if (!session) return;

    if (session.isGroup && ctx.sender !== session.userId) return;

    const body =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      '';

    if (!body || body.startsWith(ZenConfig.prefix)) return;

    const guess = normalizeText(body);
    const current = session.countries[session.currentIndex];
    const elapsed = ((Date.now() - session.startedAt) / 1000).toFixed(1);

    const isMatch = current.aliases.some((alias) => normalizeText(alias) === guess);

    session.results.push({
      flag: current.flag,
      timeTaken: `${elapsed}s`,
      isCorrect: isMatch
    });

    session.currentIndex++;

    await ctx.react(isMatch ? '✨' : '⏭️');
    await nextRound(sock, session);
  }
};