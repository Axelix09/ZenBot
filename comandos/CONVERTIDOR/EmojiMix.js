import { ZenCommand } from '../../lib/core/factory.js';
import { writeFileSync, readFileSync, existsSync, statSync } from 'fs';
import { writeFile, readFile, rm } from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { execAsync } from '../../lib/runtime/exec-async.js';
import fetch from 'node-fetch';
import { addExifWithUser } from '../../lib/media/sticker.js';
import { ZenConfig } from '../../zen.config.js';

const TMP = tmpdir();
const toUni = e => [...e].map(c => c.codePointAt(0).toString(16)).join('-');
const tmpFile = ext => path.join(TMP, `emj_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);
const clean = async (...paths) => { for (const p of paths) if (p) await rm(p, { force: true }).catch(() => {}); };
const NOTO_BASE = 'https://fonts.gstatic.com/s/e/notoemoji/latest';

function emojiToCode(input) {
  input = input.trim();
  if (/^[0-9a-f]{4,}(-[0-9a-f]{4,})*$/i.test(input)) return input.toLowerCase();
  const points = [];
  for (const char of input) {
    const cp = char.codePointAt(0);
    if (cp > 0xFFFF || cp >= 0x200D || cp === 0xFE0F || cp > 0x20) {
      if (cp !== 0xFE0F) points.push(cp.toString(16));
    }
  }
  return points.join('-');
}

async function fetchEmojiGif(code) {
  const tryFetch = async url => {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15000) });
    if (res.ok) return res.buffer();
    return null;
  };
  const buf = await tryFetch(`${NOTO_BASE}/${code}/512.gif`);
  if (buf) return buf;
  const baseCode = code.split('-')[0];
  if (baseCode !== code) {
    const buf2 = await tryFetch(`${NOTO_BASE}/${baseCode}/512.gif`);
    if (buf2) return buf2;
  }
  throw new Error('noAnimado');
}

async function gifToWebp(gifBuffer) {
  const gifPath = tmpFile('gif');
  const webpPath = tmpFile('webp');
  try {
    writeFileSync(gifPath, gifBuffer);
    await execAsync(`ffmpeg -y -i "${gifPath}" -vf "scale=512:512:flags=lanczos,split[s0][s1];[s0]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[s1][p]paletteuse" -loop 0 "${webpPath}"`, { timeout: 30000 });
    if (!existsSync(webpPath) || statSync(webpPath).size < 100) {
      await execAsync(`ffmpeg -y -i "${gifPath}" -vcodec libwebp -vf "scale=512:512:flags=lanczos" -loop 0 -preset default -an -vsync 0 "${webpPath}"`, { timeout: 30000 });
    }
    return readFileSync(webpPath);
  } finally { await clean(gifPath, webpPath); }
}

async function runEmojimix(ctx, e1, e2, userName) {
  const url = `https://www.gstatic.com/android/keyboard/emojikitchen/20201001/u${toUni(e1)}/u${toUni(e1)}_u${toUni(e2)}.png`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('noExiste');
  const buffer = await res.buffer();
  const png = tmpFile('png');
  const webpOut = tmpFile('webp');
  try {
    writeFileSync(png, buffer);
    await execAsync(`ffmpeg -y -i "${png}" -vf "scale=512:512" -vcodec libwebp -lossless 1 "${webpOut}"`, { timeout: 30000 });
    const stickerBuf = await addExifWithUser(readFileSync(webpOut), userName);
    await ctx.sock.sendMessage(ctx.chat, { sticker: stickerBuf }, { quoted: ctx.rawMsg });
  } finally { await clean(png, webpOut); }
}

async function runEmojimix2(ctx, e1, e2) {
  const url = `https://tenor.googleapis.com/v2/featured?key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&contentfilter=high&media_filter=png_transparent&component=proactive&collection=emoji_kitchen_v5&q=${encodeURIComponent(e1)}_${encodeURIComponent(e2)}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.results?.length) throw new Error('noExiste');
  for (const r of json.results) {
    await ctx.sock.sendMessage(ctx.chat, { image: { url: r.url } }, { quoted: ctx.rawMsg });
  }
}

async function runEmojiSticker(ctx, text, userName) {
  const code = emojiToCode(text.trim());
  if (!code) throw new Error('noValido');
  const gifBuf = await fetchEmojiGif(code);
  const webpBuf = await gifToWebp(gifBuf);
  const stickerBuf = await addExifWithUser(webpBuf, userName);
  await ctx.sock.sendMessage(ctx.chat, { sticker: stickerBuf }, { quoted: ctx.rawMsg });
}

export default new ZenCommand('emojimix')
  .addAlias('emojicombine', 'emojimixar', 'emojimix2', 'emojicombine2', 'emojimixar2', 'emojisticker', 'emojianim', 'stickeremoji')
  .setCooldown(5)
  .setCategory('convertidores')
  .requireRegistration()
  .setUsage('<emoji+emoji>')
  .onExecute(async (ctx) => {
    const command = ctx.commandName.toLowerCase();
    const text = ctx.args.join(' ').trim();
    const prefix = ZenConfig.prefix;
    const user = await ctx.getUser();
    const userName = user.name || user.nickname || 'Usuario';

    try {
      if (['emojisticker', 'emojianim', 'stickeremoji'].includes(command)) {
        if (!text) {
          await ctx.react('⚠️');
          return ctx.reply(
            `『 ⚠️ 』 *EMOJI REQUERIDO*\n\n` +
            `> Indicá un emoji para convertirlo a sticker 😵‍💫\n` +
            `> _Ejemplo: ${prefix}emojisticker 😊_`
          );
        }
        await ctx.react('⏳');
        await runEmojiSticker(ctx, text, userName);
        await ctx.react('✅');
        return;
      }

      if (!text?.includes('+')) {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *DOS EMOJIS REQUERIDOS*\n\n` +
          `> Usá: *${prefix}${command} 😊+😂*\n` +
          `> Separa los emojis con *+*`
        );
      }

      const [e1, e2] = text.split('+').map(s => s.trim());
      if (!e1 || !e2) {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *DOS EMOJIS REQUERIDOS*\n\n> Revisá cómo lo escribiste 🧐\n\n` +
          `> Separa los emojis con *+* 🧐`
        );
      }

      await ctx.react('⏳');

      if (['emojimix2', 'emojicombine2', 'emojimixar2'].includes(command)) {
        await runEmojimix2(ctx, e1, e2);
      } else {
        await runEmojimix(ctx, e1, e2, userName);
      }

      await ctx.react('✅');

    } catch (e) {
      if (e.message === 'noExiste') {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *COMBINACIÓN NO EXISTE*\n\n` +
          `> Esa combinación de emojis no existe 🫤`
        );
      }
      if (e.message === 'noAnimado') {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *SIN ANIMACIÓN*\n\n` +
          `> No encontré animación para ese emoji 😕`
        );
      }
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR AL PROCESAR*\n\n` +
        `> No pude mezclar esos emojis 😵‍💫 Probá con otros.`
      );
    }
  });