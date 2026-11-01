import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { rm } from 'fs/promises';
import { spawn } from 'child_process';
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
  return (name || 'media').replace(/[\/:*?"<>|]/g, '').slice(0, 60).trim();
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

function compressAudio(inputPath, outputPath) {
  return new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', inputPath,
      '-vn',
      '-c:a', 'libmp3lame',
      '-b:a', '128k',
      '-ar', '44100',
      '-y',
      outputPath
    ]);
    ffmpeg.on('close', (code) => resolve(code === 0));
    ffmpeg.on('error', () => resolve(false));
  });
}

async function searchViaYtSearch(query) {
  const vidId = extractVideoId(query);
  const result = vidId ? await ytSearch({ videoId: vidId }) : await ytSearch(query);
  const item = vidId ? result : result?.videos?.[0];
  const id = item?.videoId || vidId;
  if (!item || !id) throw new Error('sin_resultados');

  return {
    id,
    title: item.title || 'YouTube Media',
    duration: item.duration?.timestamp || item.timestamp || '-',
    thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
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
          title: data.metadata.title || 'YouTube Media',
          duration: data.metadata.duration || (data.metadata.duration_seconds ? `${Math.floor(data.metadata.duration_seconds / 60)}:${String(data.metadata.duration_seconds % 60).padStart(2, '0')}` : '-'),
          thumbnail: data.metadata.thumbnail || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`
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
    thumbnail: first.thumbnail || `https://i.ytimg.com/vi/${first.id}/hqdefault.jpg`
  };
}

async function searchMedia(query) {
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
  return { url: res.dl_url, title: res.title || 'YouTube Media', source: 'senna' };
}

async function getSamuLink(videoId, type) {
  const { data } = await axios.get(`${SAMU_API}/yt/download`, {
    params: { url: `https://youtu.be/${videoId}`, type: type === 'audio' ? 'mp3' : 'mp4' },
    timeout: 60000
  });
  if (!data || !data.url) throw new Error('No se pudo obtener el enlace de descarga');
  return { url: data.url, title: data.title || 'YouTube Media', source: 'samu' };
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
  return { url, title: title || 'YouTube Media', source: 'hikari' };
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

export default new ZenCommand('play')
  .addAlias('playvid', 'play2')
  .setCooldown(10)
  .setCategory('Descargas')
  .requireRegistration()
  .setUsage('<texto|link>')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const query = ctx.args.join(' ').trim();
    const prefix = ZenConfig.prefix;

    if (!query) {
      await ctx.react('▶️');
      return ctx.reply(
        `『 ▶️ 』 *YOUTUBE PLAY*\n\n` +
        `✦ *Uso:* ${prefix}${ctx.commandName} <texto|link>\n` +
        `✦ *Costo:* 1 ${ZenConfig.currencies.kogen.emoji}\n` +
        `> _Ejemplo: ${prefix}${ctx.commandName} sia snowman_`
      );
    }

    if ((user.kogen || 0) < 1) {
      await ctx.react('⚠️');
      return ctx.reply(V.kogen.insufficient('buscar', 1));
    }

    await ctx.react('🔍');
    let videoInfo;
    try {
      videoInfo = await searchMedia(query);
    } catch {
      await ctx.react('❌');
      return ctx.reply(`『 ⚠️ 』 *SIN RESULTADOS*\n\n> No encontré nada en YouTube 😢 Probá con otro título.`);
    }

    const videoId = videoInfo.id;
    const buttons = [
      { type: 'quick_reply', text: '🎵 Audio', id: `${prefix}playdl audio ${videoId}` },
      { type: 'quick_reply', text: '🎬 Video', id: `${prefix}playdl video ${videoId}` }
    ];

    await ctx.sock.sendButtons(ctx.chat, {
      text: `╔━᳀『 ▶️ *YOUTUBE PLAY* 』═᳀\n⌬ *Título:* ${videoInfo.title}\n⌬ *Duración:* ${videoInfo.duration}\n⌬ Elige el formato para recibirlo en documento:\n╚═━═━═━═━═━═━═━═᳀`,
      footer: ZenConfig.botName,
      image: videoInfo.thumbnail,
      buttons
    });
  });

export const playDlHandler = new ZenCommand('playdl')
  .setHidden(true)
  .setCooldown(3)
  .setCategory('Descargas')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const type = ctx.args[0];
    const videoId = ctx.args[1];

    if (!type || !videoId) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *FORMATO INVÁLIDO*\n\n> Uy, algo no cuadra 🤨\n> Usá: ${ZenConfig.prefix}playdl audio <id>`);
    }

    if ((user.kogen || 0) < 1) {
      await ctx.react('⚠️');
      return ctx.reply(V.kogen.insufficient('descargar', 1));
    }

    await ctx.react('⏳');
    const isAudio = type === 'audio' || type.includes('mp3');
    const ext = isAudio ? 'mp3' : 'mp4';
    const mime = isAudio ? 'audio/mpeg' : 'video/mp4';
    const tmpDir = path.resolve('./tmp');

    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const rawFilePath = path.join(tmpDir, `raw_${Date.now()}_${Math.random().toString(36).substring(7)}.${isAudio ? 'tmp' : 'mp4'}`);
    const optFilePath = path.join(tmpDir, `play_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`);

    try {
      const dl = await downloadYoutube(videoId, isAudio ? 'audio' : 'video', rawFilePath);

      if (!fs.existsSync(rawFilePath) || fs.statSync(rawFilePath).size < 1000) {
        throw new Error('Archivo corrupto');
      }

      let finalPath = rawFilePath;
      if (isAudio && dl.source !== 'hikari') {
        const compressed = await compressAudio(rawFilePath, optFilePath);
        if (compressed && fs.existsSync(optFilePath) && fs.statSync(optFilePath).size > 1000) {
          finalPath = optFilePath;
        } else if (dl.source === 'senna') {
          throw new Error('Conversión fallida');
        }
      }

      let dlTitle = dl.title || 'YouTube Media';
      if (!dl.title) {
        try {
          const info = await searchMedia(videoId);
          dlTitle = info.title;
        } catch {}
      }

      const safeName = `${sanitizeFilename(dlTitle)}.${ext}`;
      await ctx.sock.sendMessage(ctx.chat, {
        document: { url: finalPath },
        mimetype: mime,
        fileName: safeName,
        caption: isAudio ? `🎧 *${dlTitle}*` : `🎬 *${dlTitle}*`
      }, { quoted: ctx.rawMsg });

      user.kogen = Math.max(0, (user.kogen || 0) - 1);
      await user.save();
      await ctx.react('✅');
      await ctx.reply(V.kogen.used());
    } catch {
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *ERROR DE DESCARGA*\n\n> El servidor no me dejó descargarlo 😤 Probá de nuevo.`);
    } finally {
      await rm(rawFilePath, { force: true }).catch(() => {});
      await rm(optFilePath, { force: true }).catch(() => {});
    }
  });
