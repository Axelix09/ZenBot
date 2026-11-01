import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import axios from 'axios';
import { igDownload } from '../../lib/scraping/instagram.js';
import { sendAlbum } from '../../lib/messaging/album.js';
import { createRuntimeFiles } from '../../lib/runtime/download-file.js';
import fg from 'fg-senna';
const SAMU_API = 'https://api.samu330.com';

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), ms);
    })
  ]).finally(() => clearTimeout(timer));
}

async function igSenna(url) {
  const res = await withTimeout(fg.igdl(url), 30000);
  const raw = Array.isArray(res) ? res.map((r) => r?.dl_url) : [].concat(res?.dl_url || []);
  const items = raw
    .filter((u) => typeof u === 'string' && u)
    .map((u) => ({ type: /\.(jpe?g|png|webp)(\?|$)/i.test(u) ? 'image' : 'video', url: u, quality: 'HD' }));
  if (!items.length) throw new Error('senna_sin_media');
  return { type: /\/reel\//i.test(url) ? 'reel' : 'post', items };
}

async function samuInstagram(url) {
  const { data: response } = await axios.get(`${SAMU_API}/fb-ig/dl`, {
    params: { url },
    timeout: 40000,
    headers: { Accept: 'application/json' }
  });
  if (!response || response.success === false || response.status === false) {
    throw new Error(response?.error || response?.message || 'samu_error');
  }
  const data = response.data && !Array.isArray(response.data) ? response.data : response;
  let items = Array.isArray(data.data) ? data.data.filter((item) => item?.url) : [];
  if (!items.length) items = Array.isArray(data.formats) ? data.formats.filter((item) => item?.url) : [];
  items = items.map((item) => ({
    type: /video/i.test(item.type || '') || /\.mp4(\?|$)/i.test(item.url) ? 'video' : 'image',
    url: item.url,
    quality: 'HD'
  }));
  if (!items.length) throw new Error('samu_sin_media');
  return { type: 'post', items };
}

export default new ZenCommand('igdl')
  .addAlias('ig', 'instagram', 'instagramdl', 'reel', 'reeldl')
  .setCooldown(10)
  .setCategory('Descargas')
  .requireRegistration()
  .setUsage('<link>')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const [url] = ctx.args;
    const prefix = ZenConfig.prefix;

    if (!url) {
      await ctx.react('📸');
      return ctx.reply(
        `『 📸 』 *INSTAGRAM DOWNLOAD*\n\n` +
        `✦ *Uso:* ${prefix}igdl <link>\n` +
        `✦ *Costo:* 1 ${ZenConfig.currencies.kogen.emoji}\n` +
        `> _Ejemplo: ${prefix}igdl https://instagram.com/..._`
      );
    }

    if (!url.includes('instagram.com')) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *ENLACE INVÁLIDO*\n\n> Asegurate de que sea un enlace de Instagram 🤔`);
    }

    if (user.kogen < 1) {
      await ctx.react('⚠️');
      return ctx.reply(V.kogen.insufficient('descargar', 1));
    }

    const chatId = ctx.chat;
    await ctx.react('⏳');

    try {
      let result = await igDownload(url).catch(() => null);
      if (!result?.items?.length) result = await igSenna(url).catch(() => null);
      if (!result?.items?.length) result = await samuInstagram(url).catch(() => null);

      if (!result || !result.items || result.items.length === 0) {
        return ctx.reply(`『 ⚠️ 』 *SIN CONTENIDO*\n\n> No encontré media en ese enlace o es un perfil privado 🤔`);
      }

      const mediaItems = result.items.filter(i => i.type === 'video' || i.type === 'image');

      if (mediaItems.length === 0) {
        return ctx.reply(`『 ⚠️ 』 *SIN CONTENIDO COMPATIBLE*\n\n> No encontré media compatible en ese enlace 🤔`);
      }

      const tipos = { reel: 'Reel', post: 'Publicación', story: 'Historia', video: 'Video' };
      const tipo = tipos[result.type] || 'Publicación';
      const totalVideos = mediaItems.filter(i => i.type === 'video').length;
      const totalImagenes = mediaItems.length - totalVideos;

      const files = createRuntimeFiles();
      try {
        if (mediaItems.length === 1) {
          const item = mediaItems[0];
          const file = await files.download(item.url, { prefix: 'instagram', extension: item.type === 'video' ? 'mp4' : 'jpg', timeout: 120000, minBytes: 100 });
          const captionMsg = `╔━᳀『 📸 *INSTAGRAM ${tipo.toUpperCase()}* 』═᳀\n` +
            `⌬ *Tipo:* ${item.type === 'video' ? 'Video' : 'Imagen'}\n` +
            `⌬ *Calidad:* ${item.quality || 'HD'}\n╚═━═━═━═━═━═━═━═᳀`;
          await ctx.sock.sendMessage(chatId, {
            [item.type]: { url: file },
            caption: captionMsg
          }, { quoted: ctx.rawMsg });
        } else {
          const carouselCaption = `╔━᳀『 📸 *INSTAGRAM ${tipo.toUpperCase()}* 』═᳀\n` +
            `⌬ *Archivos:* ${mediaItems.length}\n` +
            `⌬ *Videos:* ${totalVideos}  ·  *Imágenes:* ${totalImagenes}\n╚═━═━═━═━═━═━═━═᳀`;
          await sendAlbum(ctx, mediaItems.map((item, i) => async () => {
            try {
              const file = await files.download(item.url, { prefix: 'instagram', extension: item.type === 'video' ? 'mp4' : 'jpg', timeout: 120000, minBytes: 100 });
              return {
                [item.type]: { url: file },
                caption: i === 0 ? carouselCaption : ''
              };
            } catch (err) {}
          }));
        }
      } finally {
        await files.cleanup();
      }

      user.kogen -= 1;
      await user.save();
      await ctx.react('✅');
      return ctx.reply(V.kogen.charged(1));

    } catch (e) {
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *ERROR DE DESCARGA*\n\n> Instagram no me dejó descargarlo 😤 Probá de nuevo.`);
    }
  });
