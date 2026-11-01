import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { File } from 'megajs';
import mime from 'mime-types';
import { createWriteStream } from 'fs';
import { rm } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

const MAX_MB = 300;

function formatBytes(bytes) {
  if (!bytes) return '0 Bytes';
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

export default new ZenCommand('mega')
  .addAlias('mg')
  .setCooldown(20)
  .setCategory('Descargas')
  .requireRegistration()
  .setUsage('<link>')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const [url] = ctx.args;

    if (!url) {
      await ctx.react('📂');
      return ctx.reply(
        `『 📂 』 *MEGA DOWNLOAD*\n\n` +
        `✦ *Uso:* ${ZenConfig.prefix}${ctx.commandName} <link>\n` +
        `✦ *Costo:* 1 ${ZenConfig.currencies.kogen.emoji}\n` +
        `✦ *Límite:* ${MAX_MB} MB\n` +
        `> _Ejemplo: ${ZenConfig.prefix}${ctx.commandName} https://mega.nz/..._`
      );
    }

    if (!url.includes('mega.nz')) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *ENLACE INVÁLIDO*\n\n> Creo que te faltó algo 🤔\n\n> Asegurate de que sea un enlace de Mega 🧐`);
    }

    if (user.kogen < 1) {
      await ctx.react('⚠️');
      return ctx.reply(V.kogen.insufficient('descargar', 1));
    }

    const chatId = ctx.chat;
    await ctx.react('⏳');
    let tmpPath = '';

    try {
      const file = File.fromURL(url);
      await file.loadAttributes();

      const mimeType = mime.lookup(file.name.split('.').pop()) || 'application/octet-stream';
      const sizeMB = Math.round(file.size / (1024 * 1024));
      if (sizeMB > MAX_MB) {
        return ctx.reply(`『 ⚠️ 』 *ARCHIVO DEMASIADO GRANDE*\n\n> Supera el límite de ${MAX_MB} MB (*${sizeMB} MB*) 🙂`);
      }

      tmpPath = join(process.cwd(), 'tmp', `${randomUUID()}.tmp`);
      await pipeline(file.download(), createWriteStream(tmpPath));

      await ctx.sock.sendMessage(chatId, {
        document: { url: tmpPath },
        fileName: file.name,
        mimetype: mimeType,
        caption: `╔━᳀『 📂 *${file.name}* 』═᳀\n⌬ *Tamaño:* ${formatBytes(file.size)}\n╚═━═━═━═━═━═━═━═᳀`
      }, { quoted: ctx.rawMsg });

      user.kogen -= 1;
      await user.save();
      await ctx.react('✅');
      await ctx.reply(V.kogen.charged(1));

    } catch (error) {
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *ERROR DE DESCARGA*\n\n> ${error.message} 😭`);
    } finally {
      if (tmpPath) {
        await rm(tmpPath, { force: true }).catch(() => {});
      }
    }
  });