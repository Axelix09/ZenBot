import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import axios from 'axios';
import { sendAlbum } from '../../lib/messaging/album.js';
import { createRuntimeFiles } from '../../lib/runtime/download-file.js';
import fg from 'fg-senna';

const SAMU_API = 'https://api.samu330.com';

async function samuTikTok(url) {
  const { data: response } = await axios.get(`${SAMU_API}/tiktok/download`, {
    params: { url },
    timeout: 40000,
    headers: { Accept: 'application/json' }
  });
  if (!response || response.success === false || response.status === false) {
    throw new Error(response?.error || response?.message || 'samu_error');
  }
  const data = response.data && !Array.isArray(response.data) ? response.data : response;
  const downloads = Array.isArray(data.downloads) ? data.downloads.filter((item) => item?.url) : [];
  const isAudio = (item) => /audio|music|mp3/i.test(`${item.type || ''} ${item.text || ''}`);
  const videos = downloads.filter((item) => !isAudio(item) && !/image/i.test(item.type || ''));
  const best = videos.find((item) => /hd|sin marca|no.?water|nowm/i.test(`${item.type || ''} ${item.text || ''}`)) || videos[0];
  const music = downloads.find(isAudio);
  const images = Array.isArray(data.images) ? data.images.filter((image) => typeof image === 'string' && image) : [];
  if (!best && !images.length) throw new Error('samu_sin_media');
  return {
    title: data.description || 'TikTok Media',
    images,
    music: music?.url || null,
    videoUrl: best?.url || null
  };
}

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), ms);
    })
  ]).finally(() => clearTimeout(timer));
}

async function fetchSenna(url) {
  const res = await withTimeout(fg.tiktok(url), 30000);
  const r = res?.result;
  if (!r) throw new Error('senna_sin_datos');
  const title = r.title || 'TikTok Media';
  const images = Array.isArray(r.images) ? r.images : [];
  if (images.length) return { title, images, music: r.play || null, videoUrl: null };
  if (!r.play) throw new Error('senna_sin_video');
  return { title, images: [], music: null, videoUrl: r.play };
}

async function fetchTikTok(url) {
  try {
    return await fetchSenna(url);
  } catch {}
  return samuTikTok(url);
}

export default new ZenCommand('ttkdl')
  .addAlias('tiktok', 'tiktokdl', 'ttk')
  .setCooldown(10)
  .setCategory('Descargas')
  .requireRegistration()
  .setUsage('<link>')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const [url] = ctx.args;
    const prefix = ZenConfig.prefix;

    if (!url) {
      await ctx.react('🎵');
      return ctx.reply(
        `『 🎵 』 *TIKTOK DOWNLOAD*\n\n` +
        `✦ *Uso:* ${prefix}ttkdl <link>\n` +
        `✦ *Costo:* 1 ${ZenConfig.currencies.kogen.emoji}\n` +
        `> _Ejemplo: ${prefix}ttkdl https://tiktok.com/..._`
      );
    }

    if (!/tiktok\.com|vt\.tiktok\.com/i.test(url)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *ENLACE INVÁLIDO*\n\n> Asegurate de que sea un enlace de TikTok 🤔`);
    }

    if (user.kogen < 1) {
      await ctx.react('⚠️');
      return ctx.reply(V.kogen.insufficient('descargar', 1));
    }

    const chatId = ctx.chat;
    await ctx.react('⏳');

    try {
      const data = await fetchTikTok(url).catch(() => null);

      if (!data) return ctx.reply(`『 ⚠️ 』 *ERROR DE SERVIDOR*\n\n> No pude obtener respuesta del servidor 😭`);

      const title = data.title || 'TikTok Media';

      const files = createRuntimeFiles();
      try {
        if (data.images.length > 0) {
          const caption = `╔━᳀『 🎵 *TIKTOK — ${data.images.length} IMÁGENES* 』═᳀\n⌬ 📝 ${title}\n╚═━═━═━═━═━═━═━═᳀`;

          await sendAlbum(ctx, data.images.map((imgUrl, i) => async () => {
            try {
              const imgFile = await files.download(imgUrl, { prefix: 'tiktok-image', extension: 'jpg', timeout: 60000, minBytes: 100 });
              return {
                image: { url: imgFile },
                caption: i === 0 ? caption : ''
              };
            } catch (err) {}
          }));

          if (data.music) {
            const mp3File = await files.download(data.music, { prefix: 'tiktok-audio', extension: 'mp3', timeout: 60000, minBytes: 100 });
            await ctx.sock.sendMessage(chatId, {
              audio: { url: mp3File },
              mimetype: 'audio/mpeg',
              ptt: false
            }, { quoted: ctx.rawMsg });
          }
        } else {
          const videoUrl = data.videoUrl;
          if (!videoUrl) return ctx.reply(`『 ⚠️ 』 *SIN VIDEO*\n\n> No encontré video en ese enlace 🫤`);

          const captionVid = `╔━᳀『 🎵 *TIKTOK* 』═᳀\n⌬ 📝 ${title}\n╚═━═━═━═━═━═━═━═᳀`;
          const videoFile = await files.download(videoUrl, { prefix: 'tiktok-video', extension: 'mp4', timeout: 120000, minBytes: 1000 });

          await ctx.sock.sendMessage(chatId, {
            video: { url: videoFile },
            mimetype: 'video/mp4',
            caption: captionVid
          }, { quoted: ctx.rawMsg });
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
      return ctx.reply(`『 ❌ 』 *ERROR DE DESCARGA*\n\n> No pude bajar ese TikTok 😭 Probá de nuevo.`);
    }
  });
