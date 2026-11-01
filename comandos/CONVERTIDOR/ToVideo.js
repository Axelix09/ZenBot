import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFileSync, readFileSync } from 'fs';
import { rm } from 'fs/promises';
import { execAsync } from '../../lib/runtime/exec-async.js';

const tmp = ext => join(tmpdir(), `conv_${Date.now()}.${ext}`);
const clean = async (...ps) => { for (const p of ps) if (p) await rm(p, { force: true }).catch(() => {}); };
const VELOCIDADES = [0.25, 0.5, 1.5, 2, 3];

export default new ZenCommand('tovideo')
  .addAlias('tomp4', 'reversevid', 'speedvid')
  .setCooldown(5)
  .setCategory('convertidores')
  .requireRegistration()
  .setUsage('<velocidad>')
  .onExecute(async (ctx) => {
    const command = ctx.commandName.toLowerCase();
    const speedRaw = ctx.args[0];
    const speed = parseFloat(speedRaw);
    const prefix = ZenConfig.prefix;
    const quoted = ctx.rawMsg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *MEDIA REQUERIDA*\n\n` +
        `> Respondé a un audio o video para procesarlo 🤔`
      );
    }

    const mtype = Object.keys(quoted)[0] || '';
    const mediaMsg = quoted[mtype];
    const mime = mediaMsg?.mimetype || '';

    if (command === 'tovideo' || command === 'tomp4') {
      if (!/audio/i.test(mime)) {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *AUDIO REQUERIDO*\n\n` +
          `> Respondé a un audio para convertirlo a video 😵‍💫`
        );
      }

      await ctx.react('⏳');
      let i, o;
      try {
        const buffer = Buffer.from(await ctx.sock.downloadMedia(mediaMsg, 'audio'));
        i = tmp('mp3'); o = tmp('mp4');
        writeFileSync(i, buffer);
        await execAsync(`ffmpeg -y -f lavfi -i color=c=black:s=1280x720:r=1 -i "${i}" -shortest -c:v libx264 -c:a aac -strict experimental "${o}"`, { timeout: 60000 });
        await ctx.react('✅');
        return ctx.sock.sendMessage(ctx.chat, { video: readFileSync(o), mimetype: 'video/mp4' }, { quoted: ctx.rawMsg });
      } catch {
        await ctx.react('❌');
        return ctx.reply(
          `『 ❌ 』 *ERROR AL CONVERTIR*\n\n` +
          `> No pude convertir el audio a video 😵‍💫 Probá de nuevo.`
        );
      } finally { await clean(i, o); }
    }

    if (!/video/i.test(mime)) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *VIDEO REQUERIDO*\n\n` +
        `> Respondé a un video para procesarlo 🤔`
      );
    }

    let i, o;
    try {
      const buffer = Buffer.from(await ctx.sock.downloadMedia(mediaMsg, 'video'));
      i = tmp('mp4'); o = tmp('mp4');
      writeFileSync(i, buffer);

      if (command === 'reversevid') {
        await ctx.react('⏳');
        await execAsync(`ffmpeg -y -i "${i}" -vf reverse -af areverse "${o}"`, { timeout: 60000 });
      } else if (command === 'speedvid') {
        if (!VELOCIDADES.includes(speed)) {
          await ctx.react('⚠️');
          return ctx.reply(
            `『 ⚠️ 』 *VELOCIDAD INVÁLIDA*\n\n> Revisá cómo lo escribiste 🧐\n\n` +
            `> Revisá cómo lo escribiste 🧐\n> Opciones: *0.25 · 0.5 · 1.5 · 2 · 3*\n` +
            `> _Ejemplo: ${prefix}speedvid 2_`
          );
        }
        await ctx.react('⏳');
        const vf = `setpts=${(1 / speed).toFixed(4)}*PTS`;
        const af = `atempo=${speed <= 0.5 ? 0.5 : speed >= 2 ? 2 : speed}`;
        await execAsync(`ffmpeg -y -i "${i}" -vf "${vf}" -af "${af}" "${o}"`, { timeout: 60000 });
      }

      await ctx.react('✅');
      return ctx.sock.sendMessage(ctx.chat, { video: readFileSync(o), mimetype: 'video/mp4' }, { quoted: ctx.rawMsg });

    } catch {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR AL PROCESAR*\n\n` +
        `> No pude procesar ese video 😬 Probá con otro.`
      );
    } finally { await clean(i, o); }
  });