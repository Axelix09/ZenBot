import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import axios from 'axios';
import { an1Search, an1Download } from '../../lib/scraping/an1.js';
import { createWriteStream, statSync, mkdirSync } from 'fs';
import { rm } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

const TMP_DIR = join(process.cwd(), 'tmp', 'apks');
const UA = 'Mozilla/5.0 (Linux; Android 11; Redmi Note 8) AppleWebKit/537.36';

async function downloadApk(url, destPath) {
  mkdirSync(join(destPath, '..'), { recursive: true });
  const res = await axios.get(url, {
    responseType: 'stream',
    headers: { 'User-Agent': UA, 'Referer': 'https://an1.com' },
    timeout: 300000,
    maxRedirects: 10
  });
  await pipeline(res.data, createWriteStream(destPath));
  const { size } = statSync(destPath);
  if (size < 1000) throw new Error(`Archivo inválido (${size} bytes)`);
  return size;
}

export default new ZenCommand('an1')
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
        `『 📱 』 *AN1 DOWNLOAD*\n\n` +
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
      const isPage = /an1\.com\/\S+/i.test(query);
      const found = isPage ? null : (await an1Search(query, 1).catch(() => []))[0];
      const pageUrl = isPage ? query : found?.url;
      const info = pageUrl ? await an1Download(pageUrl).catch(() => null) : null;

      if (!info?.download) {
        return ctx.reply(`『 ⚠️ 』 *SIN RESULTADOS*\n\n> No encontré nada para: *${query}* 😕 Probá con otro nombre.`);
      }

      const titleStr = info.title || query;
      const developer = found?.developer && found.developer !== 'Unknown' ? found.developer : '';
      const versionStr = info.version || '-';

      await ctx.sock.sendMessage(chatId, {
        image: { url: info.thumb || 'https://an1.com/templates/an1/images/logo.png' },
        caption: `╔━᳀『 📱 *${titleStr}* 』═᳀\n` +
          `⌬ *Versión:* ${versionStr}\n` +
          (developer ? `⌬ *Desarrollador:* ${developer}\n` : '') +
          `⌬ *Tamaño:* ${info.size || '-'}\n` +
          `⌬ *Fuente:* AN1.com\n╚═━═━═━═━═━═━═━═᳀`
      }, { quoted: ctx.rawMsg });

      await downloadApk(info.download, tmpPath);

      const fileName = `${titleStr.replace(/[^\w\s.-]/g, '').trim()} v${versionStr}.apk`;

      await ctx.sock.sendMessage(chatId, {
        document: { url: tmpPath },
        mimetype: 'application/vnd.android.package-archive',
        fileName,
        caption: `✅ *${titleStr}* v${versionStr}`
      }, { quoted: ctx.rawMsg });

      user.kogen -= 1;
      await user.save();
      await ctx.react('✅');
      return ctx.reply(V.kogen.charged(1));

    } catch (e) {
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *ERROR DE DESCARGA*\n\n> No pude descargar esa app de An1 😵‍💫 Probá de nuevo.`);
    } finally {
      await rm(tmpPath, { force: true }).catch(() => {});
    }
  });