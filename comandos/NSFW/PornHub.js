import fs from 'node:fs';
import { spawn } from 'node:child_process';
import axios from 'axios';
import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { downloadToRuntimeFile, removeRuntimeFile } from '../../lib/runtime/download-file.js';
import { runtimePath } from '../../lib/runtime/tmpdir.js';
import { phDownload } from '../../lib/database/json/nsfw/phdl.js';

const COST = 3;
const UA = 'Mozilla/5.0 (Linux; Android 11; Redmi Note 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const REFERER = 'https://www.pornhub.com/';
const LINK_REGEX = /^https?:\/\/(?:[\w-]+\.)?pornhub\d*\.(?:com|org)\//i;

function hlsToMp4(playlistUrl) {
  const output = runtimePath('phhls', 'mp4');
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
    
    ff.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    
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

async function obtainVideo(link) {
  const data = await phDownload(link);
  
  if (!data.download || Object.keys(data.download).length === 0) {
    throw new Error('No se encontraron fuentes de video en el enlace.');
  }

  const qualities = Object.keys(data.download).sort((a, b) => parseInt(b) - parseInt(a));
  const sources = qualities.map(q => ({ type: 'hls', url: data.download[q].url, quality: q }));

  const failures = [];
  for (const source of sources) {
    let filePath = null;
    try {
      filePath = await hlsToMp4(source.url);
      await assertVideoFile(filePath);
      return { 
        info: { title: data.title, duration: data.duration, thumb: data.thumb, uploadDate: data.uploadDate }, 
        source, 
        filePath 
      };
    } catch (error) {
      if (filePath) await removeRuntimeFile(filePath);
      failures.push(`${source.quality}: ${error.message}`);
    }
  }
  
  throw new Error(`No se pudo descargar. Errores: ${failures.join(' | ')}`);
}

export default new ZenCommand('ph')
  .addAlias('phdl', 'pornhub', 'pornhubdl')
  .setCooldown(8)
  .setCategory('Nsfw')
  .setNSFW()
  .requireGroup()
  .requireRegistration()
  .setUsage('<link>')
  .onExecute(async (ctx) => {
    const group = await ctx.getGroup();
    if (!group.nsfw) {
      await ctx.react('⛔');
      return ctx.reply(V.nsfw.off());
    }
    
    const user = await ctx.getUser();
    const link = ctx.args.join(' ').trim();
    const prefix = ZenConfig.prefix;
    await ctx.react('🔞');
    
    if (!LINK_REGEX.test(link)) {
      return ctx.reply(
        `『 🔞 』 *PORNHUB DOWNLOAD*\n\n` +
        `✦ *Uso:* ${prefix}ph <link>\n` +
        `✦ *Costo:* ${COST} ${ZenConfig.currencies.kogen.emoji}\n\n` +
        `> _Ejemplo: ${prefix}ph https://pornhub.com/view_video.php?viewkey=xxx_\n\n` +
        `💡 *Buscar videos:* ${prefix}phsearch <término>`
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
    
    await ctx.reply(`『 ⏳ 』 *Descargando video, esto puede tardar...*\n\n> Aguantame que ya casi 😬`);
    
    let filePath = null;
    try {
      const result = await obtainVideo(link);
      filePath = result.filePath;
      const { info, source } = result;
      
      const cleanName = cleanTitle(info.title);
      const thumbBuffer = await getThumbnailBuffer(info.thumb);
      
      await ctx.sock.sendMessage(ctx.chat, {
        document: { url: filePath },
        mimetype: 'video/mp4',
        fileName: `${cleanName.replace(/[\/\\:*?"<>|]/g, '_').slice(0, 100)}.mp4`,
        jpegThumbnail: thumbBuffer,
        caption:
          `╔━᳀『 🔞 *PORNHUB* 』═᳀\n` +
          `⌬ *Título:* ${cleanName}\n` +
          `⌬ *Duración:* ${info.duration || 'N/A'}\n` +
          (info.uploadDate ? `⌬ *Subido:* ${info.uploadDate}\n` : '') +
          `⌬ *Calidad:* ${source.quality}\n` +
          `╚═━═━═━═━═━═━═━═᳀`
      }, { quoted: ctx.rawMsg });
      
      user.kogen -= COST;
      await user.save();
      await ctx.react('✅');
      return ctx.reply(
        V.kogen.charged(COST)
      );
      
    } catch (e) {
      console.error('[ph]', e);
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *ERROR*\n\n> ${e.message || 'Ese video me ganó 😵‍💫 Probá con otro enlace.'}`);
    } finally {
      if (filePath) await removeRuntimeFile(filePath);
    }
  });