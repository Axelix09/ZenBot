import { ZenCommand } from '../../lib/core/factory.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFileSync, readFileSync } from 'fs';
import { rm } from 'fs/promises';
import { execAsync } from '../../lib/runtime/exec-async.js';

const tmp = ext => join(tmpdir(), `conv_${Date.now()}.${ext}`);
const clean = async (...ps) => { for (const p of ps) if (p) await rm(p, { force: true }).catch(() => {}); };

export default new ZenCommand('toimg')
  .addAlias('togif')
  .setCooldown(3)
  .setCategory('convertidores')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const command = ctx.commandName.toLowerCase();
    const quoted = ctx.rawMsg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *MEDIA REQUERIDA*\n\n> Revisá cómo lo escribiste 🧐\n\n` +
        `> Respondé a un sticker o video para convertirlo 🧐`
      );
    }

    const mtype = Object.keys(quoted)[0] || '';
    const mediaMsg = quoted[mtype];
    const mime = mediaMsg?.mimetype || '';

    if (command === 'toimg') {
      if (!/webp/i.test(mime)) {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *STICKER REQUERIDO*\n\n> Creo que te faltó algo 🤔\n\n` +
          `> Respondé a un sticker para convertirlo a imagen 🧐`
        );
      }

      await ctx.react('⏳');
      let i, o;
      try {
        const buffer = Buffer.from(await ctx.sock.downloadMedia(mediaMsg, 'sticker'));
        i = tmp('webp'); o = tmp('png');
        writeFileSync(i, buffer);
        await execAsync(`ffmpeg -y -i "${i}" -vframes 1 -c:v png "${o}"`);
        await ctx.react('✅');
        return ctx.sock.sendMessage(ctx.chat, { image: readFileSync(o) }, { quoted: ctx.rawMsg });
      } catch {
        await ctx.react('❌');
        return ctx.reply(
          `『 ❌ 』 *ERROR AL CONVERTIR*\n\n` +
          `> No pude pasar ese sticker a imagen 😵 Probá de nuevo.`
        );
      } finally { await clean(i, o); }
    }

    if (command === 'togif') {
      const esVid = /video/i.test(mime);
      const esSticker = /webp/i.test(mime);

      if (!esVid && !esSticker) {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *VIDEO O STICKER REQUERIDO*\n\n` +
          `> Respondé a un video o sticker animado para convertirlo a GIF 🤨`
        );
      }

      if (esVid && (mediaMsg?.seconds || 0) >= 15) {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *ARCHIVO MUY LARGO*\n\n` +
          `> El video debe durar menos de 15 segundos 😄`
        );
      }

      await ctx.react('⏳');
      let i, o;
      try {
        const mediaType = esVid ? 'video' : 'sticker';
        const buffer = Buffer.from(await ctx.sock.downloadMedia(mediaMsg, mediaType));
        const ext = esSticker ? 'webp' : 'mp4';
        i = tmp(ext); o = tmp('mp4');
        writeFileSync(i, buffer);
        await execAsync(`ffmpeg -y -i "${i}" -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p" -c:v libx264 -movflags +faststart "${o}"`);
        await ctx.react('✅');
        return ctx.sock.sendMessage(ctx.chat, {
          video: readFileSync(o),
          mimetype: 'video/mp4',
          gifPlayback: true
        }, { quoted: ctx.rawMsg });
      } catch {
        await ctx.react('❌');
        return ctx.reply(
          `『 ❌ 』 *ERROR AL CONVERTIR*\n\n` +
          `> No pude convertirlo a GIF 😩 Probá de nuevo.`
        );
      } finally { await clean(i, o); }
    }
  });