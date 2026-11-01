import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZenCommand } from '../../lib/core/factory.js';
import { downloadBuffer } from '../../lib/media/buffer.js';
import { sendAlbum } from '../../lib/messaging/album.js';

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'lib', 'database', 'json', 'randompics', 'ppcouple.json');
const MAX_TRIES = 5;
const LIMIT = 15 * 1024 * 1024;

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

function loadCouples() {
  if (cache) return cache;
  let entries = [];
  try {
    entries = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {}
  cache = entries
    .filter((entry) => isValidUrl(entry?.male) && isValidUrl(entry?.female))
    .map((entry) => ({ male: entry.male, female: entry.female }));
  return cache;
}

async function download(url) {
  const buffer = await downloadBuffer(url, {
    limit: LIMIT,
    timeout: 20000,
    headers: { Referer: `${new URL(url).origin}/` }
  });
  if (!isImage(buffer)) throw new Error('imagen inválida');
  return buffer;
}

async function fetchRandomCouple() {
  const pool = [...loadCouples()];
  for (let i = 0; i < MAX_TRIES && pool.length; i++) {
    const [couple] = pool.splice(Math.floor(Math.random() * pool.length), 1);
    try {
      const [male, female] = await Promise.all([download(couple.male), download(couple.female)]);
      return { male, female };
    } catch {}
  }
  throw new Error('sin_pareja');
}

export default new ZenCommand('parejapp')
  .addAlias('couplepp', 'ppparejas', 'cpp')
  .setCooldown(5)
  .setCategory('imagenes')
  .requireRegistration()
  .onExecute(async (ctx) => {
    await ctx.react('💞');
    try {
      const { male, female } = await fetchRandomCouple();
      await sendAlbum(ctx, [
        async () => ({
          image: male,
          caption: `『 💞 』 *PAREJA PP*\n\n> @${ctx.sender.split('@')[0]} acá tenés tu pareja de fotos 😄\n✦ 👦 Chico  ·  👧 Chica`,
          mentions: [ctx.sender]
        }),
        async () => ({ image: female })
      ]);
    } catch {
      await ctx.react('❌');
      await ctx.reply(`『 ❌ 』 *ERROR*\n\n> No pude armar la pareja de fotos 🥺 Probá de nuevo.`);
    }
  });
