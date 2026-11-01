import fs from 'node:fs';
import { spawn } from 'node:child_process';
import axios from 'axios';
import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { downloadToRuntimeFile, removeRuntimeFile } from '../../lib/runtime/download-file.js';
import { runtimePath } from '../../lib/runtime/tmpdir.js';
import { xnxxDownload } from '../../lib/database/json/nsfw/xnxxdl.js';

const COST = 3;
const UA = 'Mozilla/5.0 (Linux; Android 11; Redmi Note 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const REFERER = 'https://www.xnxx.com/';
const LINK_REGEX = /^https?:\/\/(?:[\w-]+\.)?xnxx\d*\.(?:com|es)\//i;

function hlsToMp4(playlistUrl) {
  const output = runtimePath('xnxxhls', 'mp4');
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-y', '-loglevel', 'error', '-user_agent', UA, '-headers', `Referer: ${REFERER}\r\n`,
      '-rw_timeout', '30000000', '-i', playlistUrl, '-c', 'copy', '-bsf:a', 'aac_adtstoasc',
      '-movflags', '+faststart', output
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
  } finally { await handle.close(); }
}

async function getThumbnailBuffer(url) {
  if (!url) return undefined;
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
    return res.data;
  } catch { return undefined; }
}

async function obtainVideo(link) {
  const data = await xnxxDownload(link);
  if (!data.download || (!data.download.high && !data.download.low && !data.download.hls)) {
    throw new Error('No se encontraron fuentes de video en el enlace.');
  }
  const sources = [];
  if (data.download.high) sources.push({ type: 'mp4', url: data.download.high.url, quality: data.download.high.quality });
  if (data.download.low) sources.push({ type: 'mp4', url: data.download.low.url, quality: data.download.low.quality });
  if (data.download.hls) sources.push({ type: 'hls', url: data.download.hls.url, quality: 'HLS' });

  const failures = [];
  for (const source of sources) {
    let filePath = null;
    try {
      if (source.type === 'hls') {
        filePath = await hlsToMp4(source.url);
      } else {
        filePath = await downloadToRuntimeFile(source.url, {
          prefix: 'xnxx', extension: 'mp4', timeout: 240000, minBytes: 10240,
          headers: { 'User-Agent': UA, Referer: REFERER }
        });
      }
      await assertVideoFile(filePath);
      return { info: { title: data.title, duration: data.duration, views: data.views, thumb: data.thumb }, source, filePath };
    } catch (error) {
      if (filePath) await removeRuntimeFile(filePath);
      failures.push(`${source.quality}: ${error.message}`);
    }
  }
  throw new Error(`No se pudo descargar. Errores: ${failures.join(' | ')}`);
}

function cleanTitle(str) {
  if (!str) return 'Video';
  return str.replace(/&iacute;/g, 'í').replace(/&Iacute;/g, 'Í').replace(/&aacute;/g, 'á').replace(/&Aacute;/g, 'Á')
    .replace(/&eacute;/g, 'é').replace(/&Eacute;/g, 'É').replace(/&oacute;/g, 'ó').replace(/&Oacute;/g, 'Ó')
    .replace(/&uacute;/g, 'ú').replace(/&Uacute;/g, 'Ú').replace(/&ntilde;/g, 'ñ').replace(/&Ntilde;/g, 'Ñ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

export default new ZenCommand('xnxx')
  .addAlias('xx', 'xxdl', 'xnxxdl')
  .setCooldown(8).setCategory('Nsfw').setNSFW().requireGroup().requireRegistration().setUsage('<link>')
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
      return ctx.reply(`『 🔞 』 *XNXX DOWNLOAD*\n\n✦ *Uso:* ${prefix}xnxx <link>\n✦ *Costo:* ${COST} ${ZenConfig.currencies.kogen.emoji}\n\n> _Ejemplo: ${prefix}xnxx https://xnxx.com/video-xxx_\n\n💡 *Buscar videos:* ${prefix}xnxxsearch <término>`);
    }
    if (user.kogen < COST) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *${ZenConfig.currencies.kogen.name.toUpperCase()} INSUFICIENTE*\n\n> Necesitás *${COST} ${ZenConfig.currencies.kogen.name}* para descargar 😬\n> Usá *${prefix}kbuy <cantidad>* o *${prefix}kbuy all*.`);
    }
    
    await ctx.reply(`『 ⏳ 』 *Descargando video, esto puede tardar...*\n\n> Ya lo estoy bajando 😌`);
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
        caption: `╔━᳀『 🔞 *XNXX* 』═᳀\n⌬ *Título:* ${cleanName}\n⌬ *Duración:* ${info.duration || 'N/A'}\n⌬ *Vistas:* ${info.views ? Number(info.views).toLocaleString() : '0'}\n⌬ *Calidad:* ${source.quality}\n╚═━═━═━═━═━═━═━═᳀`
      }, { quoted: ctx.rawMsg });
      
      user.kogen -= COST;
      await user.save();
      await ctx.react('✅');
      return ctx.reply(V.kogen.charged(COST));
    } catch (e) {
      console.error('[xnxx]', e);
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *ERROR*\n\n> ${e.message || 'No pude procesar ese video 😬 Probá con otro enlace.'}`);
    } finally {
      if (filePath) await removeRuntimeFile(filePath);
    }
  });