import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { rm } from 'fs/promises';
import { pipeline } from 'stream/promises';
import fg from 'fg-senna';
import ytSearch from 'yt-search';

const HIKARI_API = 'https://hikariapi.skyultraweb.com';
const SAMU_API = 'https://api.samu330.com';
const DL_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function extractVideoId(input) {
  if (!input) return null;
  const match = input.match(/(?:youtu.be\/|youtube.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/i);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) return input.trim();
  return null;
}

function sanitizeFilename(name) {
  return (name || 'video').replace(/[\/:*?"<>|]/g, '').slice(0, 60).trim();
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

async function searchViaYtSearch(query) {
  const vidId = extractVideoId(query);
  const result = vidId ? await ytSearch({ videoId: vidId }) : await ytSearch(query);
  const item = vidId ? result : result?.videos?.[0];
  const id = item?.videoId || vidId;
  if (!item || !id) throw new Error('sin_resultados');

  return {
    id,
    title: item.title || 'YouTube Video',
    duration: item.duration?.timestamp || item.timestamp || '-',
    thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    channel: typeof item.author === 'string' ? item.author : (item.author?.name || 'YouTube')
  };
}

async function searchViaSamu(query) {
  const vidId = extractVideoId(query);
  const targetUrl = vidId ? `https://youtu.be/${vidId}` : null;

  if (targetUrl) {
    try {
      const { data } = await axios.get(`${SAMU_API}/yt/info`, {
        params: { url: targetUrl },
        timeout: 15000
      });
      if (data?.success && data?.metadata) {
        return {
          id: vidId,
          title: data.metadata.title || 'YouTube Video',
          duration: data.metadata.duration || (data.metadata.duration_seconds ? `${Math.floor(data.metadata.duration_seconds / 60)}:${String(data.metadata.duration_seconds % 60).padStart(2, '0')}` : '-'),
          thumbnail: data.metadata.thumbnail || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
          channel: data.metadata.channel || 'YouTube'
        };
      }
    } catch {}
  }

  const { data } = await axios.get(`${SAMU_API}/yt/search`, {
    params: { q: query },
    timeout: 15000
  });

  const first = data?.results?.[0];
  if (!first) throw new Error('sin_resultados');

  return {
    id: first.id,
    title: first.title,
    duration: first.duration || '-',
    thumbnail: first.thumbnail || `https://i.ytimg.com/vi/${first.id}/hqdefault.jpg`,
    channel: first.uploader || 'YouTube'
  };
}

async function searchVideo(query) {
  try {
    return await searchViaYtSearch(query);
  } catch {
    return searchViaSamu(query);
  }
}

async function getSennaLink(videoId, type) {
  const res = await withTimeout(
    fg.ytv(`https://youtu.be/${videoId}`, type === 'audio' ? '240p' : '360p'),
    45000
  );
  if (!res?.dl_url) throw new Error('senna_sin_enlace');
  return { url: res.dl_url, title: res.title || 'YouTube Video', source: 'senna' };
}

async function getSamuLink(videoId, type) {
  const { data } = await axios.get(`${SAMU_API}/yt/download`, {
    params: { url: `https://youtu.be/${videoId}`, type: type === 'audio' ? 'mp3' : 'mp4' },
    timeout: 60000
  });
  if (!data || !data.url) throw new Error('No se pudo obtener el enlace de descarga');
  return { url: data.url, title: data.title || 'YouTube Video', source: 'samu' };
}

async function getHikariLink(videoId, type) {
  const apikey = process.env.APIKEY;
  if (!apikey) throw new Error('hikari_sin_apikey');
  const isAudio = type === 'audio';
  const { data } = await axios.get(`${HIKARI_API}/api/scrapers/youtube/${isAudio ? 'audio' : 'video'}`, {
    params: {
      url: `https://www.youtube.com/watch?v=${videoId}`,
      quality: isAudio ? '128k' : '360p',
      apikey
    },
    timeout: 60000
  });
  const body = data?.response ?? data;
  const info = body?.data;
  const url = info?.downloadUrl || info?.url;
  if (!body?.success || !url) throw new Error('hikari_sin_enlace');
  if (info.status && info.status !== 'ready') throw new Error(`hikari_${info.status}`);
  const title = String(info.filename || '')
    .replace(/\.(mp3|mp4)$/i, '')
    .replace(/\s*\(\d{3,4}p[^)]*\)\s*$/i, '')
    .trim();
  return { url, title: title || 'YouTube Video', source: 'hikari' };
}

async function streamToFile(url, outputPath) {
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
    timeout: 120000,
    headers: { 'User-Agent': DL_UA }
  });
  await pipeline(response.data, fs.createWriteStream(outputPath));
}

async function downloadYoutube(videoId, type, outputPath) {
  let lastError;
  for (const getLink of [getHikariLink, getSennaLink, getSamuLink]) {
    try {
      const link = await getLink(videoId, type);
      await streamToFile(link.url, outputPath);
      return { title: link.title, source: link.source };
    } catch (err) {
      lastError = err;
      console.warn(`[youtube] ${getLink.name}: ${err.message}`);
      await rm(outputPath, { force: true }).catch(() => {});
    }
  }
  throw lastError;
}

export default new ZenCommand('ytmp4')
  .addAlias('ytv', 'ytvideo', 'ytmp4dl')
  .setCooldown(10)
  .setCategory('Descargas')
  .requireRegistration()
  .setUsage('<link|texto>')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const command = ctx.commandName.toLowerCase();
    const prefix = ZenConfig.prefix;

    if (command === 'ytmp4dl') {
      if ((user.kogen || 0) < 1) {
        await ctx.react('⚠️');
        return ctx.reply(V.kogen.insufficient('descargar', 1));
      }

      let type = ctx.args[0];
      let videoId = ctx.args[1];

      if (!videoId && type) {
        videoId = type;
        type = 'norm';
      }

      if (!videoId) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *FORMATO INVÁLIDO*\n\n> Eso no me cierra 😵‍💫\n> Usá: ${prefix}ytmp4dl norm <id>`);
      }

      await ctx.react('⏳');
      const isDoc = type === 'doc';
      const tmpDir = path.resolve('./tmp');

      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

      const localFilePath = path.join(tmpDir, `ytmp4_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`);

      try {
        const dl = await downloadYoutube(videoId, 'video', localFilePath);

        if (!fs.existsSync(localFilePath) || fs.statSync(localFilePath).size < 1000) {
          throw new Error('Archivo corrupto');
        }

        let dlTitle = dl.title || 'YouTube Video';
        if (!dl.title) {
          try {
            const info = await searchVideo(videoId);
            dlTitle = info.title;
          } catch {}
        }

        const safeName = `${sanitizeFilename(dlTitle)}.mp4`;

        if (isDoc) {
          await ctx.sock.sendMessage(ctx.chat, {
            document: { url: localFilePath },
            mimetype: 'video/mp4',
            fileName: safeName,
            caption: `🎬 *${dlTitle}*`
          }, { quoted: ctx.rawMsg });
        } else {
          await ctx.sock.sendMessage(ctx.chat, {
            video: { url: localFilePath },
            mimetype: 'video/mp4',
            caption: `🎬 *${dlTitle}*`
          }, { quoted: ctx.rawMsg });
        }

        user.kogen = Math.max(0, (user.kogen || 0) - 1);
        await user.save();
        await ctx.react('✅');
        await ctx.reply(V.kogen.used());
      } catch {
        await ctx.react('❌');
        return ctx.reply(`『 ❌ 』 *ERROR DE DESCARGA*\n\n> No pude descargar el video 😭 Probá de nuevo.`);
      } finally {
        await rm(localFilePath, { force: true }).catch(() => {});
      }
      return;
    }

    const query = ctx.args.join(' ').trim();
    if (!query) {
      await ctx.react('🎬');
      return ctx.reply(
        `『 🎬 』 *YOUTUBE MP4*\n\n` +
        `✦ *Uso:* ${prefix}ytmp4 <link|texto>\n` +
        `✦ *Costo:* 1 ${ZenConfig.currencies.kogen.emoji}\n` +
        `> _Ejemplo: ${prefix}ytmp4 https://youtu.be/xxx_`
      );
    }

    if ((user.kogen || 0) < 1) {
      await ctx.react('⚠️');
      return ctx.reply(V.kogen.insufficient('buscar', 1));
    }

    await ctx.react('🔍');
    let videoInfo;
    try {
      videoInfo = await searchVideo(query);
    } catch {
      await ctx.react('❌');
      return ctx.reply(`『 ⚠️ 』 *SIN RESULTADOS*\n\n> No encontré resultados 😕 Probá con otro título.`);
    }

    const buttons = [{
      type: 'single_select',
      title: 'Elegir formato',
      sections: [{
        title: 'Formatos de video',
        rows: [
          { header: '', title: 'Video (MP4)', description: 'Reproductor de video estándar', id: `${prefix}ytmp4dl norm ${videoInfo.id}` },
          { header: '', title: 'Video (Documento)', description: 'Archivo original descargable', id: `${prefix}ytmp4dl doc ${videoInfo.id}` }
        ]
      }]
    }];

    await ctx.sock.sendButtons(ctx.chat, {
      text: `╔━᳀『 🎬 *YOUTUBE MP4* 』═᳀\n⌬ *Título:* ${videoInfo.title}\n⌬ *Canal:* ${videoInfo.channel}\n⌬ *Duración:* ${videoInfo.duration}\n⌬ Selecciona el formato para descargar:\n╚═━═━═━═━═━═━═━═᳀`,
      footer: ZenConfig.botName,
      image: videoInfo.thumbnail,
      buttons
    });
  });
