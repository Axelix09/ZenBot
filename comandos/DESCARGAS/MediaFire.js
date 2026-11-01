import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import axios from 'axios';
import { createWriteStream, statSync, mkdirSync } from 'fs';
import { rm } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { mediafireInfo } from '../../lib/scraping/mediafire.js';
import fg from 'fg-senna';

const MAX_MB = 1536;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const TMP_DIR = join(process.cwd(), 'tmp', 'mfire');

const MF_MIMES = {
  apk: 'application/vnd.android.package-archive',
  xapk: 'application/zip',
  apks: 'application/zip',
  apkm: 'application/zip',
  pdf: 'application/pdf',
  zip: 'application/zip',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
  tar: 'application/x-tar',
  gz: 'application/gzip',
  tgz: 'application/gzip',
  bz2: 'application/x-bzip2',
  xz: 'application/x-xz',
  iso: 'application/x-iso9660-image',
  mp4: 'video/mp4',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  mov: 'video/quicktime',
  webm: 'video/webm',
  '3gp': 'video/3gpp',
  wmv: 'video/x-ms-wmv',
  flv: 'video/x-flv',
  mpeg: 'video/mpeg',
  mpg: 'video/mpeg',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  opus: 'audio/ogg',
  flac: 'audio/flac',
  aac: 'audio/aac',
  wma: 'audio/x-ms-wma',
  amr: 'audio/amr',
  mid: 'audio/midi',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  tiff: 'image/tiff',
  heic: 'image/heic',
  psd: 'image/vnd.adobe.photoshop',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odp: 'application/vnd.oasis.opendocument.presentation',
  rtf: 'application/rtf',
  epub: 'application/epub+zip',
  mobi: 'application/x-mobipocket-ebook',
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
  xml: 'application/xml',
  html: 'text/html',
  md: 'text/markdown',
  srt: 'application/x-subrip',
  vcf: 'text/vcard',
  js: 'text/javascript',
  css: 'text/css',
  py: 'text/x-python',
  java: 'text/x-java-source',
  sql: 'application/sql',
  sh: 'application/x-sh',
  exe: 'application/x-msdownload',
  dll: 'application/x-msdownload',
  msi: 'application/x-msi',
  bat: 'application/x-msdos-program',
  jar: 'application/java-archive',
  deb: 'application/vnd.debian.binary-package',
  dmg: 'application/x-apple-diskimage',
  ttf: 'font/ttf',
  otf: 'font/otf',
  woff: 'font/woff',
  woff2: 'font/woff2',
  torrent: 'application/x-bittorrent'
};

mkdirSync(TMP_DIR, { recursive: true });

async function downloadFile(url, destPath) {
  const res = await axios.get(url, {
    headers: {
      'User-Agent': UA,
      'Referer': 'https://www.mediafire.com/',
      'Accept': '*/*',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate'
    },
    responseType: 'stream',
    timeout: 300000,
    maxRedirects: 10
  });

  const cl = parseInt(res.headers['content-length'] || '0', 10);
  if (cl > 0 && cl / (1024 * 1024) > MAX_MB) {
    throw new Error(`LIMITE:${Math.round(cl / (1024 * 1024))}`);
  }

  await pipeline(res.data, createWriteStream(destPath));
  const { size } = statSync(destPath);
  if (size < 100) throw new Error(`Archivo inválido (${size} bytes)`);
  return size;
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

async function resolveMediafire(url) {
  let firstError;
  try {
    const data = await mediafireInfo(url);
    if (data?.download) return data;
  } catch (e) {
    firstError = e;
  }
  try {
    const res = await withTimeout(fg.mediafire(url), 30000);
    if (res?.url) return { download: res.url, name: res.filename, uploaded: res.aploud };
  } catch {}
  if (firstError) throw firstError;
  return null;
}

export default new ZenCommand('mediafire')
  .addAlias('mf', 'mfire', 'mediafiredl')
  .setCooldown(15)
  .setCategory('Descargas')
  .requireRegistration()
  .setUsage('<link>')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const [url] = ctx.args;

    if (!url) {
      await ctx.react('📁');
      return ctx.reply(
        `『 📁 』 *MEDIAFIRE DOWNLOAD*\n\n` +
        `✦ *Uso:* ${ZenConfig.prefix}${ctx.commandName} <link>\n` +
        `✦ *Costo:* 1 ${ZenConfig.currencies.kogen.emoji}\n` +
        `✦ *Límite:* ${MAX_MB} MB (1.5 GB)`
      );
    }

    if (!url.includes('mediafire.com')) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *ENLACE INVÁLIDO*\n\n> Asegurate de que sea un enlace de MediaFire 🤨`);
    }

    if (user.kogen < 1) {
      await ctx.react('⚠️');
      return ctx.reply(V.kogen.insufficient('descargar', 1));
    }

    const chatId = ctx.chat;
    await ctx.react('⏳');

    const tmpPath = join(TMP_DIR, randomUUID());
    let destPath = '';

    try {
      const data = await resolveMediafire(url);

      if (!data?.download) {
        return ctx.reply(`『 ⚠️ 』 *SIN ENLACE*\n\n> No encontré nada válido en ese link 😕`);
      }

      const rawExt = data.name?.includes('.') ? data.name.split('.').pop().toLowerCase() : '';
      const ext = /^[a-z0-9]{1,8}$/.test(rawExt) ? rawExt : '';
      const uploaded = data.uploaded && data.uploaded !== 'N/A' ? data.uploaded : '';
      const mime = MF_MIMES[ext] || 'application/octet-stream';
      const fileName = data.name || 'archivo';
      destPath = `${tmpPath}.${ext || 'bin'}`;

      const size = await downloadFile(data.download, destPath);
      const sizeMB = (size / 1024 / 1024).toFixed(2);

      if (size / (1024 * 1024) > MAX_MB) {
        return ctx.reply(`『 ⚠️ 』 *ARCHIVO DEMASIADO GRANDE*\n\n> Supera el límite de *${MAX_MB} MB* (${sizeMB} MB) 😉`);
      }

      await ctx.sock.sendMessage(chatId, {
        document: { url: destPath },
        mimetype: mime,
        fileName,
        caption: `╔━᳀『 📁 *${fileName}* 』═᳀\n⌬ *Tamaño:* ${sizeMB} MB\n` +
          (uploaded ? `⌬ *Subido:* ${uploaded}\n` : '') +
          `╚═━═━═━═━═━═━═━═᳀`
      }, { quoted: ctx.rawMsg });

      user.kogen -= 1;
      await user.save();
      await ctx.react('✅');
      return ctx.reply(V.kogen.charged(1));

    } catch (e) {
      console.error('[MEDIAFIRE ERROR]', e.message);
      await ctx.react('❌');

      if (e.message?.startsWith('LIMITE:')) {
        const mb = e.message.split(':')[1];
        return ctx.reply(`『 ⚠️ 』 *ARCHIVO MUY GRANDE*\n\n> El archivo pesa *${mb} MB* y supera el límite de *${MAX_MB} MB* 😄`);
      }
      if (e.message?.includes('Cloudflare')) {
        return ctx.reply(`『 ❌ 』 *BLOQUEO DE SERVIDOR*\n\n> La IP del VPS está bloqueada. Probá más tarde 🙂`);
      }
      return ctx.reply(`『 ❌ 』 *ERROR DE DESCARGA*\n\n> ${e.message || 'No pude descargar de MediaFire 😖'}`);
    } finally {
      if (destPath) await rm(destPath, { force: true }).catch(() => {});
    }
  });