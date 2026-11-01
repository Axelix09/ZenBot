import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFileSync, readFileSync, rmSync } from 'fs';

const tmp = ext => join(tmpdir(), `doc_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);

export default new ZenCommand('todoc')
  .addAlias('todocumento', 'doc')
  .setCooldown(3)
  .setCategory('convertidores')
  .requireRegistration()
  .setUsage('<nombre>')
  .onExecute(async (ctx) => {
    const name = ctx.args.join(' ') || 'archivo';
    const quoted = ctx.rawMsg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *MEDIA REQUERIDA*\n\n` +
        `> Respondé a una imagen, video, audio o sticker para convertirlo a documento 🤨\n` +
        `> _Ejemplo: ${ZenConfig.prefix}todoc mi_imagen_`
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
        `> Uy, algo no cuadra 🤨\n> Solo se soportan: imágenes, videos, audios, stickers y documentos.`
      );
    }

    const extMap = {
      imageMessage: 'jpg',
      videoMessage: 'mp4',
      audioMessage: 'mp3',
      stickerMessage: 'webp',
      documentMessage: 'bin'
    };

    const mimeMap = {
      imageMessage: 'image/jpeg',
      videoMessage: 'video/mp4',
      audioMessage: 'audio/mpeg',
      stickerMessage: 'image/webp',
      documentMessage: 'application/octet-stream'
    };

    const ext = extMap[mtype] || 'bin';
    const mimeType = mimeMap[mtype] || 'application/octet-stream';
    const fileName = `${name.replace(/[^\w\s.-]/g, '').trim() || 'archivo'}.${ext}`;

    await ctx.react('⏳');

    try {
      const mediaType = mtype === 'stickerMessage' ? 'sticker' : mtype.replace('Message', '').toLowerCase();
      const buffer = Buffer.from(await ctx.sock.downloadMedia(mediaMsg, mediaType));

      const filePath = tmp(ext);
      writeFileSync(filePath, buffer);

      await ctx.react('✅');
      await ctx.sock.sendMessage(ctx.chat, {
        document: readFileSync(filePath),
        mimetype: mimeType,
        fileName: fileName,
        caption: `『 📄 』 *DOCUMENTO CREADO*\n\n> ¡Bien ahí! 😎\n\n> 📁 *Archivo:* ${fileName}\n> 📦 *Tamaño:* ${(buffer.length / 1024).toFixed(1)} KB`
      }, { quoted: ctx.rawMsg });

      rmSync(filePath, { force: true });

    } catch {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR AL CONVERTIR*\n\n` +
        `> No pude convertirlo a documento 😣 Probá de nuevo.`
      );
    }
  });