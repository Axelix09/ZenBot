import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { gdriveInfo, gdriveDownload } from '../../lib/scraping/gdrive.js';
import { downloadToRuntimeFile, removeRuntimeFile } from '../../lib/runtime/download-file.js';
import { statSync } from 'fs';
import fg from 'fg-senna';

const MAX_MB = 500;

const GDRIVE_MIMES = {
  'audio/mpeg': { ext: 'mp3', tipo: 'audio' },
  'audio/mp4': { ext: 'm4a', tipo: 'audio' },
  'audio/ogg': { ext: 'ogg', tipo: 'audio' },
  'video/mp4': { ext: 'mp4', tipo: 'video' },
  'video/x-matroska': { ext: 'mkv', tipo: 'document' },
  'image/jpeg': { ext: 'jpg', tipo: 'image' },
  'image/png': { ext: 'png', tipo: 'image' },
  'image/gif': { ext: 'gif', tipo: 'image' },
  'application/pdf': { ext: 'pdf', tipo: 'document' },
  'application/zip': { ext: 'zip', tipo: 'document' },
  'application/vnd.android.package-archive': { ext: 'apk', tipo: 'document' }
};

function formatSize(bytes) {
  if (!bytes) return '?';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
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

async function gdriveViaSenna(url) {
  const res = await withTimeout(fg.gdrive(url), 30000);
  if (!res?.downloadUrl) throw new Error('senna_sin_enlace');
  const sizeB = Number(res.fileSizeB) || 0;
  const name = res.fileName || null;
  if (sizeB > MAX_MB * 1024 * 1024) return { name, file: { tooLarge: true, size: sizeB } };
  const rawExt = name?.includes('.') ? name.split('.').pop().toLowerCase() : '';
  const filePath = await downloadToRuntimeFile(res.downloadUrl, {
    prefix: 'gdrive',
    extension: /^[a-z0-9]{1,8}$/.test(rawExt) ? rawExt : 'bin',
    timeout: 300000,
    minBytes: 100
  });
  return {
    name,
    file: {
      path: filePath,
      size: statSync(filePath).size,
      contentType: res.mimetype || 'application/octet-stream'
    }
  };
}

export default new ZenCommand('gdrive')
  .addAlias('googledrive', 'gdl')
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
        `『 📁 』 *GOOGLE DRIVE DOWNLOAD*\n\n` +
        `✦ *Uso:* ${ZenConfig.prefix}${ctx.commandName} <link>\n` +
        `✦ *Costo:* 1 ${ZenConfig.currencies.kogen.emoji}\n` +
        `✦ *Límite:* ${MAX_MB} MB`
      );
    }

    if (!/drive\.google\.com/i.test(url)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *ENLACE INVÁLIDO*\n\n> Asegurate de que sea un enlace de Google Drive 🤔`);
    }

    if (user.kogen < 1) {
      await ctx.react('⚠️');
      return ctx.reply(V.kogen.insufficient('descargar', 1));
    }

    const chatId = ctx.chat;
    await ctx.react('⏳');

    let file = null;

    try {
      let info = await gdriveInfo(url).catch(() => null);
      let localError = null;

      if (info) {
        await ctx.react('⬇️');
        try {
          file = await gdriveDownload(url, { maxBytes: MAX_MB * 1024 * 1024 });
        } catch (err) {
          localError = err;
        }
      }

      if (!file) {
        const fallback = await gdriveViaSenna(url).catch(() => null);
        if (fallback) {
          info = info || { name: fallback.name };
          file = fallback.file;
        }
      }

      if (!file) {
        await ctx.react('⚠️');
        if (!info) {
          return ctx.reply(`『 ⚠️ 』 *ENLACE INVÁLIDO*\n\n> No pude leer el ID del archivo de Google Drive 🤔`);
        }
        const privado = /público|permisos/i.test(localError?.message || '');
        return ctx.reply(`『 ⚠️ 』 *ERROR DE SERVIDOR*\n\n> ${privado ? 'El archivo no es público o requiere permisos.' : 'No se pudo obtener el archivo de Google Drive.'} 😢`);
      }

      if (file.tooLarge) {
        return ctx.reply(`『 ⚠️ 』 *ARCHIVO DEMASIADO GRANDE*\n\n> El archivo supera el límite de ${MAX_MB} MB (*${(file.size / (1024 * 1024)).toFixed(1)} MB*) 😄`);
      }

      const sizeBytes = file.size;
      if (sizeBytes < 100) throw new Error('Archivo descargado corrupto o vacío.');

      const sizeMB = sizeBytes / (1024 * 1024);
      if (sizeMB > MAX_MB) {
        return ctx.reply(`『 ⚠️ 』 *ARCHIVO DEMASIADO GRANDE*\n\n> El archivo supera el límite de ${MAX_MB} MB (*${sizeMB.toFixed(1)} MB*) 😄`);
      }

      const contentType = (file.contentType || 'application/octet-stream').split(';')[0].trim();
      const { ext, tipo } = GDRIVE_MIMES[contentType] || { ext: 'bin', tipo: 'document' };
      const fileName = info.name || `archivo.${ext}`;
      const caption = `╔━᳀『 📁 *${fileName}* 』═᳀\n⌬ *Tamaño:* ${formatSize(sizeBytes)}\n⌬ *Tipo:* ${contentType}\n╚═━═━═━═━═━═━═━═᳀`;

      if (tipo === 'audio') {
        await ctx.sock.sendMessage(chatId, {
          audio: { url: file.path },
          mimetype: contentType,
          ptt: false,
          fileName
        }, { quoted: ctx.rawMsg });
      } else if (tipo === 'video') {
        await ctx.sock.sendMessage(chatId, {
          video: { url: file.path },
          mimetype: contentType,
          fileName,
          caption
        }, { quoted: ctx.rawMsg });
      } else if (tipo === 'image') {
        await ctx.sock.sendMessage(chatId, {
          image: { url: file.path },
          caption
        }, { quoted: ctx.rawMsg });
      } else {
        await ctx.sock.sendMessage(chatId, {
          document: { url: file.path },
          mimetype: contentType,
          fileName,
          caption
        }, { quoted: ctx.rawMsg });
      }

      user.kogen -= 1;
      await user.save();
      await ctx.react('✅');
      return ctx.reply(V.kogen.charged(1));

    } catch (e) {
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *ERROR DE DESCARGA*\n\n> No pude descargar de Drive 😖 Revisá que el archivo sea público.`);
    } finally {
      if (file?.path) await removeRuntimeFile(file.path);
    }
  });
