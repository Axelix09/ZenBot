import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import axios from 'axios';
import { createWriteStream, statSync, mkdirSync } from 'fs';
import { rm } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { apkSearch, apkInfo } from '../../lib/scraping/apk.js';

const TMP_DIR = join(process.cwd(), 'tmp', 'apks');
const UA = 'Mozilla/5.0 (Linux; Android 11; Redmi Note 8) AppleWebKit/537.36';
const HEADERS = { 'User-Agent': UA, 'Referer': 'https://apkpure.net' };

async function downloadApkStream(url, destPath) {
  mkdirSync(join(destPath, '..'), { recursive: true });
  const res = await axios.get(url, {
    headers: HEADERS,
    responseType: 'stream',
    timeout: 120000,
    maxRedirects: 10
  });
  await pipeline(res.data, createWriteStream(destPath));
  const { size } = statSync(destPath);
  if (size < 10000) throw new Error(`Archivo inválido (${size} bytes)`);
  return size;
}

async function fetchBuf(url) {
  const res = await axios.get(url, { headers: HEADERS, responseType: 'arraybuffer' });
  return Buffer.from(res.data);
}

export default new ZenCommand('apk2')
  .addAlias('apkpure')
  .setCooldown(15)
  .setCategory('Descargas')
  .requireRegistration()
  .setUsage('<nombre>')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const query = ctx.args.join(' ').trim();

    if (!query) {
      await ctx.react('📱');
      return ctx.reply(
        `『 📱 』 *APKPURE DOWNLOAD*\n\n` +
        `✦ *Uso:* ${ZenConfig.prefix}${ctx.commandName} <nombre>\n` +
        `✦ *Costo:* 1 ${ZenConfig.currencies.kogen.emoji}\n` +
        `> _Ejemplo: ${ZenConfig.prefix}${ctx.commandName} whatsapp_`
      );
    }

    if (user.kogen < 1) {
      await ctx.react('⚠️');
      return ctx.reply(V.kogen.insufficient('descargar', 1));
    }

    const chatId = ctx.chat;
    await ctx.react('⏳');
    const tmpPath = join(TMP_DIR, `${randomUUID()}.apk`);

    try {
      const results = await apkSearch(query, 1).catch(() => []);
      if (!results?.length) return ctx.reply(`『 ⚠️ 』 *SIN RESULTADOS*\n\n> No encontré ninguna APK con ese nombre 🥺`);

      const app = results[0];
      const [info, iconRes] = await Promise.allSettled([
        apkInfo(app.pkg),
        fetchBuf(app.icon)
      ]);

      const infoData = info.status === 'fulfilled' ? info.value : {};

      if (iconRes.status === 'fulfilled') {
        try {
          await ctx.sock.sendMessage(chatId, {
            image: iconRes.value,
            caption: `╔━᳀『 📱 *${infoData.name || app.name}* 』═᳀\n` +
              `⌬ *Desarrollador:* ${infoData.developer || app.developer || '-'}\n` +
              (infoData.version ? `⌬ *Versión:* ${infoData.version}\n` : '') +
              `⌬ *Fecha:* ${app.date || '-'}\n` +
              `⌬ *ID:* ${app.pkg}\n` +
              `⌬ *Tamaño:* ${infoData.size || '-'}\n╚═━═━═━═━═━═━═━═᳀`
          }, { quoted: ctx.rawMsg });
        } catch {}
      }

      await ctx.react('⬇️');

      let sizeBytes;
      let isXapk = false;
      try {
        sizeBytes = await downloadApkStream(infoData.download || app.dlUrl, tmpPath);
      } catch (err) {
        if (!infoData.downloadXapk) throw err;
        sizeBytes = await downloadApkStream(infoData.downloadXapk, tmpPath);
        isXapk = true;
      }

      const sizeMB = (sizeBytes / 1024 / 1024).toFixed(1);
      const version = infoData.version ? ` v${infoData.version}` : '';
      const fileName = `${(infoData.name || app.name).replace(/[^\w\s.-]/g, '').trim()}${version}.${isXapk ? 'xapk' : 'apk'}`;

      await ctx.sock.sendMessage(chatId, {
        document: { url: tmpPath },
        mimetype: isXapk ? 'application/zip' : 'application/vnd.android.package-archive',
        fileName,
        caption: `📦 *${sizeMB} MB*${isXapk ? ' · XAPK' : ''}`
      }, { quoted: ctx.rawMsg });

      user.kogen -= 1;
      await user.save();
      await ctx.react('✅');
      return ctx.reply(V.kogen.charged(1));

    } catch (e) {
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *ERROR DE DESCARGA*\n\n> No pude bajar la APK 😣 Probá de nuevo en un rato.`);
    } finally {
      await rm(tmpPath, { force: true }).catch(() => {});
    }
  });