import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import axios from 'axios';
import { twtDownload } from '../../lib/scraping/twitter.js';
import fg from 'fg-senna';

const hasMedia = (r) => Boolean(r && (r.hd || r.sd || r.images?.length));
import { sendAlbum } from '../../lib/messaging/album.js';
import { createRuntimeFiles } from '../../lib/runtime/download-file.js';
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

async function twtSenna(url) {
  const res = await withTimeout(fg.twitter(url), 30000);
  const hd = res?.HD || null;
  const sd = res?.SD || null;
  if (!hd && !sd) throw new Error('senna_sin_media');
  const id = url.match(/status(?:es)?\/(\d+)/i)?.[1];
  return { type: 'video', hd: hd || sd, sd, images: [], videoId: id };
}

async function samuTwitter(url) {
  const { data: response } = await axios.get(`${SAMU_API}/twitter`, {
    params: { url },
    timeout: 40000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
      Accept: 'application/json'
    }
  });
  if (!response || response.success === false || response.status === false) {
    throw new Error(response?.error || response?.message || 'samu_error');
  }
  const data = response.data && !Array.isArray(response.data) ? response.data : response;
  const videos = Array.isArray(data.videos) ? data.videos.filter((video) => video?.url) : [];
  const height = (label) => {
    const match = String(label || '').match(/(\d{3,4})\s*p/i);
    return match ? Number(match[1]) : 0;
  };
  videos.sort((a, b) => height(b.quality || b.resolution) - height(a.quality || a.resolution));
  const images = (Array.isArray(data.images) ? data.images : [])
    .map((item) => typeof item === 'string' ? item : item?.url)
    .filter(Boolean);
  if (!videos.length && !images.length) throw new Error('samu_sin_media');
  return {
    type: videos.length ? 'video' : 'image',
    hd: videos[0]?.url || null,
    sd: videos[videos.length - 1]?.url || null,
    images,
    videoId: data.tweetId || null,
    audio: null
  };
}

export default new ZenCommand('twitter')
  .addAlias('tw', 'tweet', 'x')
  .setCooldown(10)
  .setCategory('Descargas')
  .requireRegistration()
  .setUsage('<link>')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const [url] = ctx.args;
    const prefix = ZenConfig.prefix;

    if (!url) {
      await ctx.react('🐦');
      return ctx.reply(
        `『 🐦 』 *TWITTER/X DOWNLOAD*\n\n` +
        `✦ *Uso:* ${prefix}twitter <link>\n` +
        `✦ *Costo:* 1 ${ZenConfig.currencies.kogen.emoji}\n` +
        `> _Ejemplo: ${prefix}twitter https://x.com/..._`
      );
    }

    if (!url.includes('twitter.com') && !url.includes('x.com')) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *ENLACE INVÁLIDO*\n\n> Asegurate de que sea un enlace de X (Twitter) 🤨`);
    }

    if (user.kogen < 1) {
      await ctx.react('⚠️');
      return ctx.reply(V.kogen.insufficient('descargar', 1));
    }

    const chatId = ctx.chat;
    await ctx.react('⏳');

    try {
      let res = await twtDownload(url).catch(() => null);
      if (!hasMedia(res)) res = await twtSenna(url).catch(() => null);
      if (!hasMedia(res)) res = await samuTwitter(url).catch(() => null);

      if (!res) {
        return ctx.reply(`『 ⚠️ 』 *SIN RESULTADOS*\n\n> No encontré nada para bajar 🤔 Revisá que el tuit tenga multimedia.`);
      }

      const media = [];

      if (res.type === 'video') {
        const videoUrl = res.hd || res.sd;
        if (videoUrl) media.push({ type: 'video', url: videoUrl });
      }
      if (res.images?.length) media.push(...res.images.map(u => ({ type: 'image', url: u })));

      if (!media.length) return ctx.reply(`『 ⚠️ 』 *SIN RESULTADOS*\n\n> No encontré nada para bajar 🤔 Revisá que el tuit tenga multimedia.`);

      const idLine = res.videoId ? `⌬ *ID:* ${res.videoId}\n` : '';
      const calidad = res.sd && res.hd === res.sd ? 'SD' : 'HD';

      const files = createRuntimeFiles();
      try {
        if (media.length === 1) {
          const item = media[0];
          const captionMsg = `╔━᳀『 🐦 *TWEET DESCARGADO* 』═᳀\n` +
            `⌬ *Tipo:* ${item.type === 'video' ? 'Video' : 'Imagen'}\n` +
            (item.type === 'video' ? `⌬ *Calidad:* ${calidad}\n` : '') +
            idLine + '╚═━═━═━═━═━═━═━═᳀';
          const file = await files.download(item.url, { prefix: 'twitter', extension: item.type === 'video' ? 'mp4' : 'jpg', timeout: 120000, minBytes: 100 });
          await ctx.sock.sendMessage(chatId, {
            [item.type]: { url: file },
            mimetype: item.type === 'video' ? 'video/mp4' : undefined,
            caption: captionMsg
          }, { quoted: ctx.rawMsg });
        } else {
          const carouselCaption = `╔━᳀『 🐦 *TWEET CARRUSEL* 』═᳀\n` +
            `⌬ *Archivos:* ${media.length}\n` +
            idLine + '╚═━═━═━═━═━═━═━═᳀';
          await sendAlbum(ctx, media.map((item, i) => async () => {
            try {
              const file = await files.download(item.url, { prefix: 'twitter', extension: item.type === 'video' ? 'mp4' : 'jpg', timeout: 120000, minBytes: 100 });
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
      await ctx.reply(V.kogen.charged(1));

      if (res.audio && res.videoId && media.some(m => m.type === 'video')) {
        await ctx.sock.sendButtons(chatId, {
          text: `╔━᳀『 🎵 *AUDIO DISPONIBLE* 』═᳀\n⌬ ¿Quieres el audio de este tweet?\n╚═━═━═━═━═━═━═━═᳀`,
          footer: ZenConfig.botName,
          buttons: [
            {
              type: 'quick_reply',
              text: '🎵 Enviar audio',
              id: `${prefix}twitteraudio ${res.videoId}`
            }
          ]
        }).catch(() => {});
      }
      return;

    } catch (e) {
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *ERROR DE DESCARGA*\n\n> No pude descargar ese tuit 😵‍💫 Probá de nuevo.`);
    }
  });

export const twitterAudioHandler = new ZenCommand('twitteraudio')
  .setHidden(true)
  .setCooldown(5)
  .setCategory('Descargas')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const tweetId = ctx.args[0];

    if (!tweetId || !/^\d{10,}$/.test(tweetId)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *FORMATO INVÁLIDO*\n\n> Creo que te faltó algo 🤔\n> Usá: ${ZenConfig.prefix}twitteraudio <id>`);
    }

    await ctx.react('⏳');

    try {
      const res = await twtDownload(`https://x.com/i/status/${tweetId}`).catch(() => null);

      if (!res || !res.audio) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *SIN RESULTADOS*\n\n> Ese tuit no tiene audio 😕`);
      }

      const files = createRuntimeFiles();
      try {
        const audioFile = await files.download(res.audio, { prefix: 'twitter-audio', extension: 'mp3', timeout: 120000, minBytes: 100 });
        await ctx.sock.sendMessage(ctx.chat, {
          audio: { url: audioFile },
          mimetype: 'audio/mpeg'
        }, { quoted: ctx.rawMsg });
      } finally {
        await files.cleanup();
      }

      return ctx.react('✅');

    } catch (e) {
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *ERROR DE DESCARGA*\n\n> No pude enviarte el audio 😢 Probá de nuevo.`);
    }
  });
