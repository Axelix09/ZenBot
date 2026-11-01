import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import axios from 'axios';
import { createWriteStream, statSync, mkdirSync } from 'fs';
import { rm } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

const BOT_TMP = join(process.cwd(), 'tmp');
mkdirSync(BOT_TMP, { recursive: true });
process.env.TMPDIR = BOT_TMP;
process.env.TEMP = BOT_TMP;
process.env.TMP = BOT_TMP;

const APK_TMP_DIR = join(BOT_TMP, 'apks');
mkdirSync(APK_TMP_DIR, { recursive: true });

const API_BASE = 'https://ws75.aptoide.com/api/7';
const UA = 'Mozilla/5.0 (Linux; Android 11; Redmi Note 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

function formatBytes(bytes) {
  if (!bytes || isNaN(bytes) || bytes <= 0) return 'N/A';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

async function getAptoideInfo(input) {
  let pkg = input.trim();

  if (!pkg.includes('.')) {
    const { data: searchData } = await axios.get(`${API_BASE}/apps/search`, {
      params: { query: pkg, limit: 1 },
      headers: { 'User-Agent': UA },
      timeout: 10000
    });
    const first = searchData?.datalist?.list?.[0];
    if (!first?.package) return null;
    pkg = first.package;
  }

  let app = null;

  try {
    const { data: resGet } = await axios.get(`${API_BASE}/app/get`, {
      params: { package_name: pkg },
      headers: { 'User-Agent': UA },
      timeout: 10000
    });
    app = resGet?.nodes?.meta?.data || resGet?.datalist?.list?.[0];
  } catch {}

  if (!app) {
    try {
      const { data: resMeta } = await axios.get(`${API_BASE}/app/getMeta`, {
        params: { package_name: pkg },
        headers: { 'User-Agent': UA },
        timeout: 10000
      });
      app = resMeta?.data || resMeta?.nodes?.meta?.data;
    } catch {}
  }

  if (!app || !app.file?.path) return null;

  return {
    title: app.name || 'Desconocido',
    id: app.package,
    version: app.file?.vername || 'N/A',
    size: formatBytes(app.size || app.file?.filesize),
    thumb: app.icon || null,
    downloads: app.stats?.downloads ? app.stats.downloads.toLocaleString() : '0',
    rating: app.stats?.rating?.avg ? app.stats.rating.avg.toFixed(1) : '0.0',
    is_safe: app.file?.malware?.rank === 'TRUSTED',
    min_android: app.file?.hardware?.sdk ? `Android ${app.file.hardware.sdk}+` : 'Varía',
    arch: app.file?.hardware?.cpus?.join(', ') || 'Universal',
    download: app.file.path
  };
}

async function downloadApk(url, destPath) {
  const res = await axios.get(url, {
    responseType: 'stream',
    headers: { 'User-Agent': UA },
    timeout: 300000,
    maxRedirects: 15
  });
  await pipeline(res.data, createWriteStream(destPath));
  const { size } = statSync(destPath);
  if (size < 1000) throw new Error('Archivo descargado inválido o corrupto');
  return size;
}

export default new ZenCommand('aptoide')
  .addAlias('apk')
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
        `『 📱 』 *APTOIDE DOWNLOAD*\n\n` +
        `✦ *Uso:* ${ZenConfig.prefix}${ctx.commandName} <nombre>\n` +
        `✦ *Costo:* 1 ${ZenConfig.currencies.kogen.emoji}\n` +
        `> _Ejemplo: ${ZenConfig.prefix}${ctx.commandName} whatsapp_`
      );
    }

    if ((user.kogen || 0) < 1) {
      await ctx.react('⚠️');
      return ctx.reply(V.kogen.insufficient('descargar', 1));
    }

    const chatId = ctx.chat;
    await ctx.react('⏳');
    const tmpPath = join(APK_TMP_DIR, `${randomUUID()}.apk`);

    try {
      const info = await getAptoideInfo(query);

      if (!info) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *SIN RESULTADOS*\n\n> No encontré nada en Aptoide para: *${query}* 🥲`);
      }

      if (info.thumb) {
        await ctx.sock.sendMessage(chatId, {
          image: { url: info.thumb },
          caption: `╔━᳀『 📱 *${info.title}* 』═᳀\n` +
            `⌬ *Versión:* ${info.version}\n` +
            `⌬ *Tamaño:* ${info.size}\n` +
            `⌬ *Rating:* ${info.rating}\n` +
            `⌬ *Descargas:* ${info.downloads}\n` +
            `⌬ *Android:* ${info.min_android}\n` +
            `⌬ *Arquitectura:* ${info.arch}\n` +
            `⌬ *Estado:* ${info.is_safe ? '✅ Trusted' : '⚠️ Unverified'}\n╚═━═━═━═━═━═━═━═᳀`
        }, { quoted: ctx.rawMsg });
      }

      await downloadApk(info.download, tmpPath);

      const safeFileName = `${info.title.replace(/[\\/:*?"<>|]/g, '')} v${info.version}.apk`;

      await ctx.sock.sendMessage(chatId, {
        document: { url: tmpPath },
        mimetype: 'application/vnd.android.package-archive',
        fileName: safeFileName,
        caption: `✅ *${info.title}*`
      }, { quoted: ctx.rawMsg });

      user.kogen = Math.max(0, (user.kogen || 0) - 1);
      await user.save();
      await ctx.react('✅');
      return ctx.reply(V.kogen.charged(1));

    } catch (err) {
      console.error('[APTOIDE ERROR]:', err);
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *ERROR DE DESCARGA*\n\n> ${err.message || 'No pude descargar de Aptoide 😖'}`);
    } finally {
      await rm(tmpPath, { force: true }).catch(() => {});
    }
  });