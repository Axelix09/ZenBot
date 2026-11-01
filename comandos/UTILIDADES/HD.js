import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import fetch from 'node-fetch';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { spawn } from 'child_process';

async function hdEnhance(inputBuf, inputMime) {
  const API = 'https://us-central1-vector-ink.cloudfunctions.net/upscaleImage';
  const tmpDir = path.join(os.tmpdir(), 'vectorink');
  const ext = /png/i.test(inputMime) ? 'png' : /webp/i.test(inputMime) ? 'webp' : 'jpg';
  const tmpPath = path.join(tmpDir, `img_${Date.now()}.${ext}`);
  const out = { ok: false };
  
  try {
    await fs.mkdir(tmpDir, { recursive: true });
    await fs.writeFile(tmpPath, inputBuf);
    
    const r = await fetch(API, {
      method: 'POST',
      headers: { 
        'content-type': 'application/json', 
        origin: 'https://vectorink.io', 
        referer: 'https://vectorink.io/', 
        'user-agent': 'Mozilla/5.0' 
      },
      body: JSON.stringify({ data: { image: inputBuf.toString('base64') } }),
    });
    
    if (!r.ok) { out.error = `HTTP ${r.status}`; return out; }
    
    const j = JSON.parse(await r.text().catch(() => '{}'));
    const inner = JSON.parse(j?.result || '{}');
    const webpB64 = inner?.image?.b64_json;
    
    if (!webpB64) { out.error = 'no_b64'; return out; }
    
    const webpBuf = Buffer.from(webpB64, 'base64');
    const inP = path.join(tmpDir, `in_${Date.now()}.webp`);
    const outP = path.join(tmpDir, `out_${Date.now()}.png`);
    
    await fs.writeFile(inP, webpBuf);
    await new Promise((res, rej) => {
      const p = spawn('ffmpeg', ['-y', '-i', inP, '-frames:v', '1', outP], { stdio: 'pipe' });
      p.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg failed')));
      p.on('error', rej);
    });
    
    out.ok = true;
    out.buffer = await fs.readFile(outP);
    try { await fs.unlink(inP); await fs.unlink(outP) } catch {}
    return out;
  } catch (e) { 
    out.error = e.message; 
    return out; 
  } finally { 
    try { await fs.unlink(tmpPath) } catch {} 
  }
}

export default new ZenCommand('hd')
  .addAlias('enhance', 'remini')
  .setCooldown(10)
  .setCategory('tools')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const quoted = ctx.rawMsg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *IMAGEN REQUERIDA*\n\n` +
        `> Respondé a una imagen para mejorarla 😵‍💫\n` +
        `> _Ejemplo: Respondé a una imagen con ${ZenConfig.prefix}${ctx.commandName}_`
      );
    }

    const mtype = Object.keys(quoted)[0] || '';
    const mediaMsg = quoted[mtype];
    const mime = mediaMsg?.mimetype || '';

    if (!mime.startsWith('image/')) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *FORMATO INVÁLIDO*\n\n> Creo que te faltó algo 🤔\n\n` +
        `> El archivo debe ser una imagen 🧐`
      );
    }

    await ctx.react('⏳');

    try {
      const buffer = Buffer.from(await ctx.sock.downloadMedia(mediaMsg, 'image'));

      const result = await hdEnhance(buffer, mime);
      
      if (!result.ok) {
        return ctx.reply(
          `『 ❌ 』 *ERROR AL MEJORAR*\n\n` +
          `> No pude mejorar la imagen. (${result.error || 'error interno'}) 😵`
        );
      }

      await ctx.react('✅');
      return ctx.sock.sendMessage(ctx.chat, {
        image: result.buffer,
        caption: `『 ✨ 』 *IMAGEN MEJORADA*\n\n> La imagen fue mejorada con IA 🤩`
      }, { quoted: ctx.rawMsg });
    } catch {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR AL MEJORAR*\n\n` +
        `> No pude completar el proceso 😵`
      );
    }
  });