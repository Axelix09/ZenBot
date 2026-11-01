import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { writeFile, readFile, rm } from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { attp } from '@axel-dev09/zen-dl';

async function generateWithAPI(text) {
  const res = await fetch(`https://zone.api.br/canvas/attp?text=${encodeURIComponent(text)}`);
  const json = await res.json();
  
  if (!json.status || !json.imagem) {
    throw new Error('API falló');
  }
  
  const imgRes = await fetch(json.imagem);
  return Buffer.from(await imgRes.arrayBuffer());
}

async function generateWithFFmpeg(text) {
  const inputPath = path.join(tmpdir(), `${randomUUID()}.gif`);
  const outputPath = path.join(tmpdir(), `${randomUUID()}.webp`);
  
  const gifBuf = await attp(text);
  await writeFile(inputPath, gifBuf);
  
  const stickerBuf = await new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-i', inputPath,
      '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,fps=15,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
      '-vcodec', 'libwebp', '-loop', '0', '-ss', '00:00:00.0', '-t', '00:00:10.0',
      '-preset', 'default', '-an', '-vsync', '0', '-s', '512:512', outputPath,
    ]);
    ff.on('close', async (code) => {
      await rm(inputPath, { force: true }).catch(() => {});
      if (code !== 0) {
        await rm(outputPath, { force: true }).catch(() => {});
        return reject(new Error('ffmpeg falló'));
      }
      const buf = await readFile(outputPath);
      await rm(outputPath, { force: true }).catch(() => {});
      resolve(buf);
    });
  });
  
  return stickerBuf;
}

export default new ZenCommand('attp')
  .addAlias('atextpng', 'textgif')
  .setCooldown(5)
  .setCategory('Convertidores')
  .requireRegistration()
  .setUsage('<texto>')
  .onExecute(async (ctx) => {
    const [text] = ctx.args;
    const prefix = ZenConfig.prefix;

    if (!text) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *TEXTO REQUERIDO*\n\n` +
        `✦ *Uso:* ${prefix}attp [texto]\n` +
        `✦ *Ejemplo:* ${prefix}attp Hola\n\n` +
        `> _Genera un sticker animado con tu texto 🤨_`
      );
    }

    await ctx.react('⏳');

    try {
      let stickerBuf = null;

      try {
        stickerBuf = await generateWithAPI(text);
      } catch {
        stickerBuf = await generateWithFFmpeg(text);
      }

      await ctx.react('✅');

      await ctx.sock.sendMessage(ctx.chat, {
        sticker: stickerBuf,
        contextInfo: {
          isForwarded: true,
          forwardingScore: 1,
          forwardedNewsletterMessageInfo: {
            newsletterJid: ZenConfig.newsletterJid,
            serverMessageId: 1
          }
        }
      }, { quoted: ctx.rawMsg });

    } catch {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR AL GENERAR*\n\n` +
        `> No pude generar el sticker animado 😵‍💫\n` +
        `> Probá con otro texto o más tarde 🙏`
      );
    }
  });