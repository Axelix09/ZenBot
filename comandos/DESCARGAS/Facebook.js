import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { downloadToRuntimeFile, removeRuntimeFile } from '../../lib/runtime/download-file.js';
import { fgetDownload } from '../../lib/scraping/facebook.js';
import fg from 'fg-senna';

const COST = 1;
const UA = 'Mozilla/5.0 (Linux; Android 11; Redmi Note 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const LINK_REGEX = /(?:https?:\/\/)?(?:www\.|m\.|web\.)?(?:facebook\.com|fb\.watch)\/.+/i;

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), ms);
    })
  ]).finally(() => clearTimeout(timer));
}

async function resolveFacebook(url) {
  let firstError;
  try {
    const data = await fgetDownload(url);
    if (data?.downloads?.length) return { ...data, referer: 'https://fget.io/' };
  } catch (e) {
    firstError = e;
  }
  try {
    const res = await withTimeout(fg.fbdl(url), 30000);
    const link = res?.HD || res?.SD;
    if (link) {
      return {
        title: res.title || 'Facebook Video',
        downloads: [{ type: 'video', url: link, quality: res.HD ? 'HD' : 'SD' }],
        referer: null
      };
    }
  } catch {}
  throw firstError || new Error('No se pudo obtener el video.');
}

export default new ZenCommand('fbdl')
  .addAlias('fb', 'facebook', 'facebookdl')
  .setCooldown(10)
  .setCategory('Descargas')
  .requireRegistration()
  .setUsage('<link>')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const [url] = ctx.args;
    const prefix = ZenConfig.prefix;

    if (!url) {
      await ctx.react('📘');
      return ctx.reply(
        `『 📘 』 *FACEBOOK DOWNLOAD*\n\n` +
        `✦ *Uso:* ${prefix}fbdl <link>\n` +
        `✦ *Costo:* ${COST} ${ZenConfig.currencies.kogen.emoji}\n` +
        `> _Ejemplo: ${prefix}fbdl https://facebook.com/..._`
      );
    }

    if (!LINK_REGEX.test(url)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *ENLACE INVÁLIDO*\n\n> Asegúrate de que sea un enlace de Facebook 🤨`);
    }

    if (user.kogen < COST) {
      await ctx.react('⚠️');
      return ctx.reply(
        V.kogen.insufficient('descargar', COST)
      );
    }

    const chatId = ctx.chat;
    await ctx.react('⏳');

    let filePath = null;
    try {
      const data = await resolveFacebook(url);
      const bestQuality = data.downloads.find(d => d.type === 'video') || data.downloads[0];
      const isAudio = bestQuality.type === 'audio';

      filePath = await downloadToRuntimeFile(bestQuality.url, {
        prefix: 'facebook',
        extension: isAudio ? 'mp3' : 'mp4',
        timeout: 120000,
        minBytes: 1024,
        headers: data.referer ? { 'User-Agent': UA, Referer: data.referer } : { 'User-Agent': UA }
      });

      const caption = `╔━᳀『 📘 *FACEBOOK* 』═᳀\n` +
        `⌬ *Título:* ${data.title}\n` +
        `⌬ *Calidad:* ${bestQuality.quality}\n` +
        `╚═━═━═━═━═━═━═━═᳀`;

      if (isAudio) {
        await ctx.sock.sendMessage(chatId, {
          audio: { url: filePath },
          mimetype: 'audio/mpeg',
          ptt: false
        }, { quoted: ctx.rawMsg });
      } else {
        await ctx.sock.sendMessage(chatId, {
          video: { url: filePath },
          mimetype: 'video/mp4',
          caption
        }, { quoted: ctx.rawMsg });
      }

      user.kogen -= COST;
      await user.save();
      await ctx.react('✅');
      return ctx.reply(
        V.kogen.charged(COST)
      );

    } catch (e) {
      console.error('[FACEBOOK ERROR]', e);
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *ERROR DE DESCARGA*\n\n> ${e.message || 'No pude bajar ese video de Facebook 😩'}`);
    } finally {
      if (filePath) await removeRuntimeFile(filePath);
    }
  });