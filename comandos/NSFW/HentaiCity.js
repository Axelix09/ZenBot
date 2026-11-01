import fs from 'node:fs';
import { spawn } from 'node:child_process';
import axios from 'axios';
import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { downloadToRuntimeFile, removeRuntimeFile } from '../../lib/runtime/download-file.js';
import { runtimePath } from '../../lib/runtime/tmpdir.js';
import { hentaicityRandom, hentaicitySearch, hentaicityDownload } from '../../lib/database/json/nsfw/hentaicity.js';

const COST = 2;
const UA = 'Mozilla/5.0 (Linux; Android 11; Redmi Note 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const REFERER = 'https://www.hentaicity.com/';

function hlsToMp4(playlistUrl) {
  const output = runtimePath('hentaihls', 'mp4');
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-y', '-loglevel', 'error',
      '-user_agent', UA,
      '-headers', `Referer: ${REFERER}\r\n`,
      '-rw_timeout', '30000000',
      '-i', playlistUrl,
      '-c', 'copy',
      '-bsf:a', 'aac_adtstoasc',
      '-movflags', '+faststart',
      output
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    ff.stderr.on('data', (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => ff.kill('SIGKILL'), 300000);
    ff.on('error', (error) => { clearTimeout(timer); reject(error); });
    ff.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) return resolve(output);
      removeRuntimeFile(output);
      reject(new Error(`ffmpeg ${code}: ${stderr.trim().slice(-160)}`));
    });
  });
}

async function assertVideoFile(filePath) {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const { buffer } = await handle.read(Buffer.alloc(12), 0, 12, 0);
    const isMp4 = buffer.toString('latin1', 4, 8) === 'ftyp';
    const isWebm = buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
    if (!isMp4 && !isWebm) throw new Error('el archivo descargado no es un video válido');
  } finally {
    await handle.close();
  }
}

async function getThumbnailBuffer(url) {
  if (!url) return undefined;
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
    return res.data;
  } catch {
    return undefined;
  }
}

function cleanTitle(str) {
  if (!str) return 'Video';
  return str
    .replace(/&iacute;/g, 'í').replace(/&Iacute;/g, 'Í')
    .replace(/&aacute;/g, 'á').replace(/&Aacute;/g, 'Á')
    .replace(/&eacute;/g, 'é').replace(/&Eacute;/g, 'É')
    .replace(/&oacute;/g, 'ó').replace(/&Oacute;/g, 'Ó')
    .replace(/&uacute;/g, 'ú').replace(/&Uacute;/g, 'Ú')
    .replace(/&ntilde;/g, 'ñ').replace(/&Ntilde;/g, 'Ñ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&hellip;/g, '...')
    .replace(/&[a-z]+;/gi, '').trim();
}

async function obtainVideo(url) {
  const data = await hentaicityDownload(url);
  if (!data.videoUrl) throw new Error('No se encontraron fuentes de video en el enlace.');

  let filePath = null;
  try {
    if (data.videoUrl.includes('.m3u8')) {
      filePath = await hlsToMp4(data.videoUrl);
    } else {
      filePath = await downloadToRuntimeFile(data.videoUrl, {
        prefix: 'hentai',
        extension: 'mp4',
        timeout: 240000,
        minBytes: 10240,
        headers: { 'User-Agent': UA, Referer: REFERER }
      });
    }
    await assertVideoFile(filePath);
    return { info: { title: data.title, duration: data.duration, thumb: data.thumb }, filePath };
  } catch (error) {
    if (filePath) await removeRuntimeFile(filePath);
    throw error;
  }
}

export default new ZenCommand('hentai')
  .addAlias('hentaicity', 'hc', 'hentaivid')
  .setCooldown(10)
  .setCategory('Nsfw')
  .setNSFW()
  .requireGroup()
  .requireRegistration()
  .setUsage('[búsqueda]')
  .onExecute(async (ctx) => {
    const group = await ctx.getGroup();
    if (!group.nsfw) {
      await ctx.react('⛔');
      return ctx.reply(V.nsfw.off());
    }

    const user = await ctx.getUser();
    const query = ctx.args.join(' ').trim();
    const prefix = ZenConfig.prefix;
    await ctx.react('🔞');

    if (!query) {
      return ctx.reply(
        `『 🔞 』 *HENTAICITY*\n\n` +
        `✦ *Uso:* ${prefix}hentai <búsqueda>\n` +
        `✦ *Aleatorio:* ${prefix}hentai random\n` +
        `✦ *Costo:* ${COST} ${ZenConfig.currencies.kogen.emoji}\n\n` +
        `> _Ejemplo: ${prefix}hentai amateur_\n` +
        `> _Aleatorio: ${prefix}hentai random_`
      );
    }

    if (user.kogen < COST) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *${ZenConfig.currencies.kogen.name.toUpperCase()} INSUFICIENTE*\n\n` +
        `> Necesitás *${COST} ${ZenConfig.currencies.kogen.name}* para descargar 🫣\n` +
        `> Usá *${prefix}kbuy <cantidad>* o *${prefix}kbuy all*.`
      );
    }

    await ctx.reply(`『 ⏳ 』 *Procesando solicitud...*\n\n> Un momento, ya casi está 😌`);

    let filePath = null;
    try {
      let videoUrl = '';
      const isRandom = query.toLowerCase() === 'random' || query.toLowerCase() === 'aleatorio';

      if (isRandom) {
        const randomVideos = await hentaicityRandom(1);
        if (!randomVideos.length) throw new Error('No se encontraron videos aleatorios.');
        videoUrl = randomVideos[0].url;
      } else {
        const searchResults = await hentaicitySearch(query, 1);
        if (!searchResults.length) throw new Error(`No se encontraron resultados para "${query}".`);
        videoUrl = searchResults[0].url;
      }

      const result = await obtainVideo(videoUrl);
      filePath = result.filePath;
      const { info } = result;

      const cleanName = cleanTitle(info.title);
      const thumbBuffer = await getThumbnailBuffer(info.thumb);

      await ctx.sock.sendMessage(ctx.chat, {
        document: { url: filePath },
        mimetype: 'video/mp4',
        fileName: `${cleanName.replace(/[\/\\:*?"<>|]/g, '_').slice(0, 100)}.mp4`,
        jpegThumbnail: thumbBuffer,
        caption:
          `╔━᳀『 🔞 *HENTAICITY* 』═᳀\n` +
          `⌬ *Título:* ${cleanName}\n` +
          (info.duration ? `⌬ *Duración:* ${info.duration}\n` : '') +
          `⌬ *Fuente:* ${isRandom ? 'Aleatorio' : 'Búsqueda'}\n` +
          `╚═━═━═━═━═━═━═━═᳀`
      }, { quoted: ctx.rawMsg });

      user.kogen -= COST;
      await user.save();
      await ctx.react('✅');
      return ctx.reply(
        V.kogen.charged(COST)
      );

    } catch (e) {
      console.error('[hentai]', e);
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *ERROR*\n\n> ${e.message || 'No pude procesar ese video 😳 Probá con otro término.'}`);
    } finally {
      if (filePath) await removeRuntimeFile(filePath);
    }
  });