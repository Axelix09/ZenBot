import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { addExifWithUser } from '../../lib/media/sticker.js';

export default new ZenCommand('wm')
  .addAlias('take', 'watermark', 'stickerinfo', 'setwm')
  .setCooldown(3)
  .setCategory('convertidores')
  .requireRegistration()
  .setUsage('<pack | autor>')
  .onExecute(async (ctx) => {
    const text = ctx.args.join(' ');
    const prefix = ZenConfig.prefix;
    const quoted = ctx.rawMsg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const user = await ctx.getUser();
    const userName = user.name || user.nickname || 'Usuario';

    if (!quoted) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *STICKER REQUERIDO*\n\n> Eso no me cierra 😵‍💫\n\n` +
        `> Respondé a un sticker para editarle el nombre 🧐\n` +
        `> _Ejemplo: ${prefix}wm MiPack | MiAutor_`
      );
    }

    const mtype = Object.keys(quoted)[0] || '';
    const mediaMsg = quoted[mtype];
    const mime = mediaMsg?.mimetype || '';

    if (!/webp/i.test(mime)) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *STICKER REQUERIDO*\n\n> Eso no me cierra 😵‍💫\n\n` +
        `> Solo se soportan stickers 🧐`
      );
    }

    let author = `Para: ${userName}`;
    let packname = `Creado por ${ZenConfig.botName}`;

    if (text?.trim()) {
      const partes = text.split('|').map(s => s.trim());
      if (partes[0]) packname = partes[0];
      if (partes[1]) author = partes[1];
    }

    await ctx.react('⏳');

    try {
      const buffer = Buffer.from(await ctx.sock.downloadMedia(mediaMsg, 'sticker'));

      const stickerBuf = await addExifWithUser(buffer, author);
      await ctx.react('✅');
      await ctx.sock.sendMessage(ctx.chat, { sticker: stickerBuf }, { quoted: ctx.rawMsg });

      return ctx.reply(
        `『 ✅ 』 *STICKER EDITADO*\n\n` +
        `✦ *Pack:* ${packname}\n` +
        `✦ *Autor:* ${author}`
      );
    } catch {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR AL EDITAR*\n\n` +
        `> No pude editar el sticker 😵`
      );
    }
  });