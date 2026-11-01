import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZenCommand } from '../../lib/core/factory.js';
import { downloadBuffer } from '../../lib/media/buffer.js';

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'lib', 'database', 'json', 'randompics', 'wallhp.json');
const MAX_TRIES = 5;
const LIMIT = 15 * 1024 * 1024;
const URL_PATTERN = /"url"\s*:\s*"(https?:\/\/[^"\s}]+)"/g;

let cache = null;

const isValidUrl = (url) =>
  typeof url === 'string' &&
  /^https?:\/\//i.test(url) &&
  (url.match(/https?:\/\//gi) || []).length === 1;

const isImage = (buffer) =>
  buffer.length > 1000 && (
    (buffer[0] === 0xff && buffer[1] === 0xd8) ||
    (buffer[0] === 0x89 && buffer[1] === 0x50) ||
    (buffer[0] === 0x47 && buffer[1] === 0x49) ||
    (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[8] === 0x57)
  );

function loadList() {
  if (cache) return cache;
  const raw = fs.readFileSync(FILE, 'utf8');
  let urls;
  try {
    urls = JSON.parse(raw).map((entry) => (typeof entry === 'string' ? entry : entry?.url));
  } catch {
    urls = [...raw.matchAll(URL_PATTERN)].map((match) => match[1]);
  }
  cache = [...new Set(urls.filter(isValidUrl))];
  return cache;
}

async function fetchRandomImage() {
  const pool = [...loadList()];
  for (let i = 0; i < MAX_TRIES && pool.length; i++) {
    const [url] = pool.splice(Math.floor(Math.random() * pool.length), 1);
    try {
      const buffer = await downloadBuffer(url, {
        limit: LIMIT,
        timeout: 20000,
        headers: { Referer: `${new URL(url).origin}/` }
      });
      if (isImage(buffer)) return buffer;
    } catch {}
  }
  throw new Error('sin_imagen');
}

export default new ZenCommand('wallhp')
  .addAlias('fondohp')
  .setCooldown(4)
  .setCategory('imagenes')
  .requireRegistration()
  .onExecute(async (ctx) => {
    await ctx.react('📱');
    try {
      const image = await fetchRandomImage();
      await ctx.sock.sendMessage(
        ctx.chat,
        {
          image,
          caption: `『 📱 』 *WALLPAPER HP*\n\n> @${ctx.sender.split('@')[0]} acá tenés tu imagen 😉`,
          mentions: [ctx.sender]
        },
        { quoted: ctx.rawMsg }
      );
    } catch {
      await ctx.react('❌');
      await ctx.reply(`『 ❌ 』 *ERROR*\n\n> No pude traer el wallpaper 😵 Probá de nuevo.`);
    }
  });
