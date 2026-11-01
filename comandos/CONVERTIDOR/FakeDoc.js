import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

export default new ZenCommand('fakedoc')
  .addAlias('fdoc', 'falso')
  .setCooldown(3)
  .setCategory('convertidores')
  .requireRegistration()
  .setUsage('<nombre> <tamaño> <formato>')
  .onExecute(async (ctx) => {
    const args = ctx.args.join(' ').trim();
    const quoted = ctx.rawMsg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    let nombre = 'archivo';
    let tamanioKB = 0;
    let formato = null;

    if (args) {
      const parts = args.split(/\s+/);
      
      let tamanioIndex = -1;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        const num = parseFloat(p.replace(/[kmg]b?$/i, ''));
        if (!isNaN(num) && num > 0) {
          tamanioIndex = i;
          const unidad = p.replace(/[\d.]/g, '').toLowerCase();
          switch (unidad) {
            case 'kb': tamanioKB = num; break;
            case 'mb': tamanioKB = num * 1024; break;
            case 'gb': tamanioKB = num * 1024 * 1024; break;
            default: tamanioKB = num; break;
          }
          break;
        }
      }

      let formatoIndex = -1;
      for (let i = parts.length - 1; i >= 0; i--) {
        if (i === tamanioIndex) continue;
        const p = parts[i].toLowerCase();
        if (/^[a-zA-Z0-9]{1,10}$/.test(p) && !/^\d+$/.test(p)) {
          formatoIndex = i;
          formato = p;
          break;
        }
      }

      const nombreParts = [];
      for (let i = 0; i < parts.length; i++) {
        if (i === tamanioIndex || i === formatoIndex) continue;
        nombreParts.push(parts[i]);
      }
      nombre = nombreParts.join(' ') || 'archivo';
    }

    nombre = nombre.replace(/[^\w\s.-]/g, '').trim() || 'archivo';

    const mimeMap = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
      webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml', ico: 'image/x-icon',
      tiff: 'image/tiff', tif: 'image/tiff', heic: 'image/heic', heif: 'image/heif',
      raw: 'image/x-raw', psd: 'image/vnd.adobe.photoshop',
      mp4: 'video/mp4', webm: 'video/webm', avi: 'video/x-msvideo',
      mov: 'video/quicktime', mkv: 'video/x-matroska', flv: 'video/x-flv',
      wmv: 'video/x-ms-wmv', mpg: 'video/mpeg', mpeg: 'video/mpeg',
      '3gp': 'video/3gpp', ogv: 'video/ogg', ts: 'video/mp2t',
      mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
      aac: 'audio/aac', flac: 'audio/flac', m4a: 'audio/mp4',
      opus: 'audio/opus', wma: 'audio/x-ms-wma',
      pdf: 'application/pdf', doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain', rtf: 'application/rtf', odt: 'application/vnd.oasis.opendocument.text',
      ods: 'application/vnd.oasis.opendocument.spreadsheet', odp: 'application/vnd.oasis.opendocument.presentation',
      zip: 'application/zip', rar: 'application/vnd.rar',
      '7z': 'application/x-7z-compressed', tar: 'application/x-tar',
      gz: 'application/gzip', bz2: 'application/x-bzip2',
      exe: 'application/x-msdownload', msi: 'application/x-msi',
      apk: 'application/vnd.android.package-archive',
      bin: 'application/octet-stream',
      json: 'application/json', xml: 'application/xml',
      csv: 'text/csv', log: 'text/plain',
      md: 'text/markdown', yaml: 'text/yaml', yml: 'text/yaml'
    };

    if (!formato) {
      if (quoted) {
        const mtype = Object.keys(quoted)[0] || '';
        const mediaMsg = quoted[mtype];
        const mime = mediaMsg?.mimetype || '';
        if (mime) {
          const ext = mime.split('/')[1]?.split(';')[0] || 'bin';
          if (mimeMap[ext] || ext) formato = ext;
        }
      }
      if (!formato) formato = 'bin';
    }

    formato = formato.toLowerCase();
    const mimeType = mimeMap[formato] || 'application/octet-stream';
    const fileName = `${nombre}.${formato}`;

    if (!quoted && tamanioKB > 0) {
      await ctx.react('⏳');
      try {
        const buffer = Buffer.alloc(tamanioKB * 1024);
        for (let i = 0; i < buffer.length; i += 4096) {
          const chunkSize = Math.min(4096, buffer.length - i);
          buffer.fill(Math.floor(Math.random() * 256), i, i + chunkSize);
        }

        await ctx.react('✅');
        await ctx.sock.sendMessage(ctx.chat, {
          document: buffer,
          mimetype: mimeType,
          fileName: fileName,
          caption: `『 📄 』 *DOCUMENTO FALSO*\n\n` +
            `📁 *Nombre:* ${fileName}\n` +
            `📦 *Tamaño:* ${(buffer.length / 1024).toFixed(1)} KB (${(buffer.length / (1024 * 1024)).toFixed(2)} MB)\n` +
            `📌 *Formato:* ${formato.toUpperCase()}\n` +
            `⚡ *Generado sin archivo real*`
        }, { quoted: ctx.rawMsg });

      } catch {
        await ctx.react('❌');
        return ctx.reply(
          `『 ❌ 』 *ERROR AL GENERAR*\n\n` +
          `> No pude armar el archivo falso 😅 Probá de nuevo.`
        );
      }
      return;
    }

    if (!quoted) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *USO DEL COMANDO*\n\n` +
        `✦ *Con media:* ${ZenConfig.prefix}fakedoc <nombre> <tamaño> <formato>\n` +
        `  _Ejemplo: .fakedoc mi_archivo 500 pdf_\n\n` +
        `✦ *Sin media (generar vacío):* ${ZenConfig.prefix}fakedoc <nombre> <tamaño> <formato>\n` +
        `  _Ejemplo: .fakedoc video 1024 mp4_\n\n` +
        `✦ *Formatos soportados:*\n` +
        `  ${Object.keys(mimeMap).join(', ')}\n\n` +
        `✦ *Unidades:* kb, mb, gb`
      );
    }

    const mtype = Object.keys(quoted)[0] || '';
    const mediaMsg = quoted[mtype];
    const mime = mediaMsg?.mimetype || '';

    const tiposValidos = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'];
    if (!tiposValidos.includes(mtype)) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *FORMATO NO SOPORTADO*\n\n` +
        `> Creo que te faltó algo 🤔\n> Solo se soportan: imágenes, videos, audios, stickers y documentos.`
      );
    }

    await ctx.react('⏳');

    try {
      const mediaType = mtype === 'stickerMessage' ? 'sticker' : mtype.replace('Message', '').toLowerCase();
      let buffer = Buffer.from(await ctx.sock.downloadMedia(mediaMsg, mediaType));

      if (tamanioKB > 0) {
        const targetSize = tamanioKB * 1024;
        if (buffer.length < targetSize) {
          const newBuffer = Buffer.alloc(targetSize);
          buffer.copy(newBuffer, 0);
          for (let i = buffer.length; i < newBuffer.length; i += 4096) {
            const chunkSize = Math.min(4096, newBuffer.length - i);
            newBuffer.fill(Math.floor(Math.random() * 256), i, i + chunkSize);
          }
          buffer = newBuffer;
        } else if (buffer.length > targetSize) {
          buffer = buffer.slice(0, targetSize);
        }
      }

      const finalSizeKB = (buffer.length / 1024).toFixed(1);
      const finalSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);

      await ctx.react('✅');
      await ctx.sock.sendMessage(ctx.chat, {
        document: buffer,
        mimetype: mimeType,
        fileName: fileName,
        caption: `『 📄 』 *DOCUMENTO FALSO*\n\n` +
          `📁 *Nombre:* ${fileName}\n` +
          `📦 *Tamaño:* ${finalSizeKB} KB (${finalSizeMB} MB)\n` +
          `📌 *Formato:* ${formato.toUpperCase()}\n` +
          `⚡ *Archivo camuflado como ${formato.toUpperCase()}*`
      }, { quoted: ctx.rawMsg });

    } catch {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR AL ENVIAR*\n\n` +
        `> No pude enviar el documento falso 😢`
      );
    }
  });