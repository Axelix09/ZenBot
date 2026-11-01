import { ZenCommand } from '../../lib/core/factory.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFileSync, readFileSync } from 'fs';
import { rm } from 'fs/promises';
import { execAsync } from '../../lib/runtime/exec-async.js';

const tmp = ext => join(tmpdir(), `conv_${Date.now()}.${ext}`);
const clean = async (...ps) => { for (const p of ps) if (p) await rm(p, { force: true }).catch(() => {}); };

export default new ZenCommand('toaudio')
  .addAlias('tomp3', 'todoc')
  .setCooldown(5)
  .setCategory('convertidores')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const command = ctx.commandName.toLowerCase();
    const quoted = ctx.rawMsg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *MEDIA REQUERIDA*\n\n` +
        `> Respondé a un video o audio para procesarlo 🤔`
      );
    }

    const mtype = Object.keys(quoted)[0] || '';
    const mediaMsg = quoted[mtype];
    const mime = mediaMsg?.mimetype || '';

    if (command === 'todoc') {
      if (!/video|audio/i.test(mime)) {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *VIDEO O AUDIO REQUERIDO*\n\n` +
          `> Respondé a un video o audio para convertirlo a documento 🤔`
        );
      }

      await ctx.react('⏳');

      try {
        const mediaType = /video/i.test(mime) ? 'video' : 'audio';
        const buffer = Buffer.from(await ctx.sock.downloadMedia(mediaMsg, mediaType));

        const isVid = /video/i.test(mime);
        await ctx.react('✅');
        return ctx.sock.sendMessage(ctx.chat, {
          document: buffer,
          mimetype: isVid ? 'video/mp4' : 'audio/mpeg',
          fileName: isVid ? 'archivo.mp4' : 'archivo.mp3'
        }, { quoted: ctx.rawMsg });
      } catch {
        await ctx.react('❌');
        return ctx.reply(
          `『 ❌ 』 *ERROR AL CONVERTIR*\n\n` +
          `> No pude convertirlo a audio 😖 Probá con otro archivo.`
        );
      }
    }

    if (!/video/i.test(mime)) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *VIDEO REQUERIDO*\n\n` +
        `> Respondé a un video para extraer el audio 🤔`
      );
    }

    await ctx.react('⏳');
    let i, o;
    try {
      const buffer = Buffer.from(await ctx.sock.downloadMedia(mediaMsg, 'video'));
      i = tmp('mp4'); o = tmp('mp3');
      writeFileSync(i, buffer);
      await execAsync(`ffmpeg -y -i "${i}" -vn -acodec libmp3lame -q:a 2 "${o}"`, { timeout: 60000 });
      await ctx.react('✅');
      return ctx.sock.sendMessage(ctx.chat, {
        audio: readFileSync(o),
        mimetype: 'audio/mpeg',
        ptt: false
      }, { quoted: ctx.rawMsg });
    } catch {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR AL EXTRAER AUDIO*\n\n` +
        `> No pude extraer el audio del video 😭`
      );
    } finally { await clean(i, o); }
  });