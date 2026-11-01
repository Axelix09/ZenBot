import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { rm } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { pinvid } from '../../lib/scraping/pinterest.js';

export default new ZenCommand('pinvid')
  .addAlias('pin2')
  .setCooldown(10)
  .setCategory('Descargas')
  .requireRegistration()
  .setUsage('<link>')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const [url] = ctx.args;
    const prefix = ZenConfig.prefix;

    if (!url) {
      await ctx.react('📌');
      return ctx.reply(
        `『 📌 』 *PINTEREST DOWNLOAD*\n\n` +
        `✦ *Uso:* ${prefix}pinvid <link>\n` +
        `✦ *Costo:* 1 ${ZenConfig.currencies.kogen.emoji}\n` +
        `> _Ejemplo: ${prefix}pinvid https://pinterest.com/..._`
      );
    }

    if (!url.includes('pinterest.com') && !url.includes('pin.it')) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *ENLACE INVÁLIDO*\n\n> Asegurate de que sea un enlace de Pinterest 🤨`);
    }

    if (user.kogen < 1) {
      await ctx.react('⚠️');
      return ctx.reply(V.kogen.insufficient('descargar', 1));
    }

    const chatId = ctx.chat;
    await ctx.react('⏳');

    const tmpDir = path.resolve('./tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const localFilePath = path.join(tmpDir, `pin_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`);

    try {
      const videos = await pinvid(url, 5);
      const videoUrl = videos.find((item) => item?.video)?.video;
      if (!videoUrl) return ctx.reply(`『 ⚠️ 』 *SIN VIDEO*\n\n> No encontré un video en ese pin 🥲`);

      const mediaRes = await axios.get(videoUrl, { responseType: 'stream', timeout: 120000 });
      await pipeline(mediaRes.data, fs.createWriteStream(localFilePath));
      if (!fs.existsSync(localFilePath) || fs.statSync(localFilePath).size < 1000) {
        throw new Error('Video descargado vacío o corrupto.');
      }

      await ctx.sock.sendMessage(chatId, {
        video: { url: localFilePath },
        mimetype: 'video/mp4',
        caption: '📌 *PINTEREST VIDEO*'
      }, { quoted: ctx.rawMsg });

      user.kogen -= 1;
      await user.save();
      await ctx.react('✅');
      return ctx.reply(V.kogen.charged(1));

    } catch (e) {
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *ERROR DE DESCARGA*\n\n> No pude descargar de Pinterest 😞 Probá de nuevo.`);
    } finally {
      if (fs.existsSync(localFilePath)) {
        await rm(localFilePath, { force: true }).catch(() => {});
      }
    }
  });
