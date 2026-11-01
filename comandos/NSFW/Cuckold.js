import { ZenCommand } from '../../lib/core/factory.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

function sendNsfwRandom(ctx, list, title) {
  const caption = `『 🔞 』 *${title.toUpperCase()}*\n\n> @${ctx.sender.split('@')[0]} solicitó contenido +18 😌`;
  return deliver(ctx, list, caption, [ctx.sender]);
}

export default new ZenCommand('cuckold')
  .addAlias('nsfwcuckold', 'xxxcuckold', 'cornudo')
  .setCooldown(3)
  .setCategory('Nsfw')
  .setNSFW()
  .requireRegistration()
  .onExecute((ctx) => sendNsfwRandom(ctx, 'cuckold', 'CUCKOLD'));
  