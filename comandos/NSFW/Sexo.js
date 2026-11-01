import { ZenCommand } from '../../lib/core/factory.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZenConfig } from '../../zen.config.js';
import { downloadBuffer } from '../../lib/media/buffer.js';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'lib', 'database', 'json', 'nsfw');
const BLOCKED = /(^|[^a-z0-9])(loli|lolis|lolicon|lolikaku|shota|shotacon|underage|toddler|child|children|preteen|minor)([^a-z0-9]|$)/;
const VIDEO = /\.(mp4|webm|mov|m4v)(\?|$)/i;
const MAX_TRIES = 4;
const LIMIT = 40 * 1024 * 1024;

const cache = new Map();

const isBlocked = (url) => {
  let text = url;
  try { text = decodeURIComponent(url); } catch {}
  return BLOCKED.test(text.toLowerCase());
};

function parseList(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(raw.replace(/'(https?:\/\/[^']*)'/g, '"$1"'));
  }
}

function loadNsfw(name) {
  if (!/^[a-z0-9_-]+$/i.test(name)) throw new Error(`lista nsfw inválida: ${name}`);
  if (cache.has(name)) return cache.get(name);

  const raw = fs.readFileSync(path.join(DIR, `${name}.json`), 'utf8');
  const urls = parseList(raw)
    .map((entry) => (typeof entry === 'string' ? entry : entry?.url))
    .filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url) && !isBlocked(url));

  const unique = [...new Set(urls)];
  cache.set(name, unique);
  return unique;
}

function randomNsfw(name, exclude = new Set()) {
  const pool = loadNsfw(name).filter((url) => !exclude.has(url));
  if (!pool.length) throw new Error(`lista nsfw vacía: ${name}`);
  return pool[Math.floor(Math.random() * pool.length)];
}

async function fetchRandomMedia(list) {
  const tried = new Set();
  for (let i = 0; i < MAX_TRIES; i++) {
    const url = randomNsfw(list, tried);
    tried.add(url);
    try {
      const buffer = await downloadBuffer(url, {
        limit: LIMIT,
        timeout: 25000,
        headers: { Referer: `${new URL(url).origin}/` }
      });
      if (buffer.length > 1000) return { buffer, isVideo: VIDEO.test(url) };
    } catch {}
  }
  throw new Error('sin_media');
}

async function deliver(ctx, list, caption, mentions) {
  await ctx.react('🔞');
  try {
    const { buffer, isVideo } = await fetchRandomMedia(list);
    const content = isVideo
      ? { video: buffer, gifPlayback: true, caption, mentions }
      : { image: buffer, caption, mentions };
    await ctx.sock.sendMessage(ctx.chat, content, { quoted: ctx.rawMsg });
  } catch {
    await ctx.react('❌');
    await ctx.reply(`『 ❌ 』 *ERROR*\n\n> El contenido no quiso aparecer 🙈 Probá de nuevo.`);
  }
}

async function sendNsfwReaction(ctx, { list, caption, needsTarget = true }) {
  const target = ctx.mentions?.[0] || ctx.quotedParticipant;

  if (!target && needsTarget) {
    await ctx.react('⚠️');
    return ctx.reply(
      `『 ⚠️ 』 *USUARIO REQUERIDO*\n\n` +
      `> Mencioná o respondé a alguien primero 😵‍💫\n` +
      `> *Ejemplo:* ${ZenConfig.prefix}${ctx.commandName.toLowerCase()} @usuario`
    );
  }

  const subject = target || ctx.sender;
  const name1 = ctx.rawMsg.pushName || ctx.sender.split('@')[0];
  const name2 = `@${subject.split('@')[0]}`;
  const text = caption.replace(/\{name1\}/g, name1).replace(/\{name2\}/g, name2);

  return deliver(ctx, list, text, [subject]);
}

const CAPTION = `『 🔥 』 *SEXO*\n\n> *{name1}* se folla a *{name2}* hasta dejarlo sin fuerzas 😈`;

export default new ZenCommand('sexo')
  .addAlias('sex', 'follar', 'nsfwsexo', 'xxxsexo')
  .setCooldown(3)
  .setCategory('Nsfw')
  .setNSFW()
  .requireRegistration()
  .setUsage('@usuario')
  .onExecute((ctx) => sendNsfwReaction(ctx, { list: 'fuck', caption: CAPTION }));
  