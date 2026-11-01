import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import axios from 'axios';
import { bookSearch, bookInfo } from '../../lib/scraping/books.js';
import { createWriteStream, statSync, mkdirSync } from 'fs';
import { rm } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

const TMP_DIR = join(process.cwd(), 'tmp', 'books');
mkdirSync(TMP_DIR, { recursive: true });

async function downloadFile(url, destPath) {
  const res = await axios.get(url, {
    responseType: 'stream',
    timeout: 120000,
    maxRedirects: 10
  });

  await pipeline(res.data, createWriteStream(destPath));
  const { size } = statSync(destPath);
  if (size < 1000) throw new Error(`Archivo inválido (${size} bytes)`);
  return size;
}

export default new ZenCommand('libro')
  .addAlias('lectulandia')
  .setCooldown(15)
  .setCategory('Descargas')
  .requireRegistration()
  .setUsage('<nombre|link>')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const [query] = ctx.args;

    if (!query) {
      await ctx.react('📚');
      return ctx.reply(
        `『 📚 』 *LECTULANDIA DOWNLOAD*\n\n` +
        `✦ *Uso:* ${ZenConfig.prefix}${ctx.commandName} <nombre|link>\n` +
        `✦ *Costo:* 1 ${ZenConfig.currencies.kogen.emoji}\n` +
        `> _Ejemplo: ${ZenConfig.prefix}${ctx.commandName} el principito_`
      );
    }

    if (user.kogen < 1) {
      await ctx.react('⚠️');
      return ctx.reply(V.kogen.insufficient('descargar', 1));
    }

    const chatId = ctx.chat;
    await ctx.react('⏳');
    const tmpPath = join(TMP_DIR, randomUUID());

    try {
      const [first] = await bookSearch(query.trim(), 1);
      const info = await bookInfo(first.url);

      if (info.thumb) {
        try {
          await ctx.sock.sendMessage(chatId, {
            image: { url: info.thumb },
            caption: `╔━᳀『 📚 *${info.title}* 』═᳀\n` +
              `⌬ *Autor:* ${info.author || 'Desconocido'}\n` +
              `⌬ *Género:* ${info.genre || '-'}\n` +
              `⌬ *Publicado:* ${info.year || '-'}\n` +
              `⌬ *Formatos:* ${[info.download?.pdf && 'PDF', info.download?.epub && 'EPUB'].filter(Boolean).join(' · ') || '-'}\n` +
              `⌬ 📖 ${(info.description || '').slice(0, 500)}${(info.description?.length || 0) > 500 ? '...' : ''}\n╚═━═━═━═━═━═━═━═᳀`
          }, { quoted: ctx.rawMsg });
        } catch {}
      }

      let dlDataUrl = info.download?.pdf || info.download?.epub;
      let ext = info.download?.pdf ? 'pdf' : 'epub';
      let mime = ext === 'pdf' ? 'application/pdf' : 'application/epub+zip';

      if (!dlDataUrl) throw new Error('Sin enlaces disponibles');

      const fileName = `${info.title} - ${info.author || 'Autor'}.${ext}`;
      const destPath = `${tmpPath}.${ext}`;

      await downloadFile(dlDataUrl, destPath);

      await ctx.sock.sendMessage(chatId, {
        document: { url: destPath },
        mimetype: mime,
        fileName,
        caption: `✅ *${info.title}*`
      }, { quoted: ctx.rawMsg });

      user.kogen -= 1;
      await user.save();
      await ctx.react('✅');
      return ctx.reply(V.kogen.charged(1));

    } catch (e) {
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *ERROR DE DESCARGA*\n\n> No pude procesar el libro 😢 Probá de nuevo.`);
    } finally {
      await rm(`${tmpPath}.pdf`, { force: true }).catch(() => {});
      await rm(`${tmpPath}.epub`, { force: true }).catch(() => {});
    }
  });