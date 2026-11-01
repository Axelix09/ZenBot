import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import axios from 'axios';
import { threadsDownload } from '../../lib/scraping/threads.js';
import { sendAlbum } from '../../lib/messaging/album.js';
import { createRuntimeFiles } from '../../lib/runtime/download-file.js';

export default new ZenCommand('threads')
  .addAlias('th', 'threadspost', 'threadsvid')
  .setCooldown(10)
  .setCategory('Descargas')
  .requireRegistration()
  .setUsage('<link>')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const [url] = ctx.args;
    const prefix = ZenConfig.prefix;

    if (!url) {
      await ctx.react('🧵');
      return ctx.reply(
        `『 🧵 』 *THREADS DOWNLOAD*\n\n` +
        `✦ *Uso:* ${prefix}threads <link>\n` +
        `✦ *Costo:* 1 ${ZenConfig.currencies.kogen.emoji}\n` +
        `> _Ejemplo: ${prefix}threads https://www.threads.net/..._`
      );
    }

    if (!url.includes('threads.net') && !url.includes('threads.com')) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *ENLACE INVÁLIDO*\n\n> Asegurate de que sea un enlace de Threads 🤔`);
    }

    if (user.kogen < 1) {
      await ctx.react('⚠️');
      return ctx.reply(V.kogen.insufficient('descargar', 1));
    }

    const chatId = ctx.chat;
    await ctx.react('⏳');

    try {
      const result = await threadsDownload(url).catch(() => null);
      const media = [];

      if (result?.type === 'video') {
        const videoUrl = result.hd || result.sd;
        if (videoUrl) media.push({ type: 'video', url: videoUrl });
      } else if (result?.images?.length) {
        media.push(...result.images.map(u => ({ type: 'image', url: u })));
      }

      if (!media.length) {
        return ctx.reply(`『 ⚠️ 』 *SIN RESULTADOS*\n\n> No pude ver ese post 🙈 Fijate que sea público.`);
      }

      const idLine = result?.videoId && result.videoId !== 'unknown' ? `⌬ *ID:* ${result.videoId}\n` : '';

      const files = createRuntimeFiles();
      try {
        if (media.length === 1) {
          const item = media[0];
          const file = await files.download(item.url, { prefix: 'threads', extension: item.type === 'video' ? 'mp4' : 'jpg', timeout: 120000, minBytes: 100 });
          const caption = `╔━᳀『 🧵 *THREADS ${item.type === 'video' ? 'VIDEO' : 'IMAGEN'}* 』═᳀\n` +
            `⌬ *Tipo:* ${item.type === 'video' ? 'Video' : 'Imagen'}\n` +
            idLine +
            `╚═━═━═━═━═━═━═━═᳀`;
          await ctx.sock.sendMessage(chatId, {
            [item.type]: { url: file },
            mimetype: item.type === 'video' ? 'video/mp4' : undefined,
            caption
          }, { quoted: ctx.rawMsg });
        } else {
          await sendAlbum(ctx, media.map((item, i) => async () => {
            try {
              const file = await files.download(item.url, { prefix: 'threads', extension: item.type === 'video' ? 'mp4' : 'jpg', timeout: 120000, minBytes: 100 });
              return {
                [item.type]: { url: file },
                mimetype: item.type === 'video' ? 'video/mp4' : undefined,
                caption: i === 0 ? `╔━᳀『 🧵 *THREADS CARRUSEL* 』═᳀\n⌬ *Archivos:* ${media.length}\n${idLine}╚═━═━═━═━═━═━═━═᳀` : ''
              };
            } catch {}
          }));
        }
      } finally {
        await files.cleanup();
      }

      user.kogen -= 1;
      await user.save();
      await ctx.react('✅');
      return ctx.reply(V.kogen.charged(1));

    } catch (e) {
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *ERROR DE DESCARGA*\n\n> No pude descargar ese hilo 😣 Probá de nuevo.`);
    }
  });