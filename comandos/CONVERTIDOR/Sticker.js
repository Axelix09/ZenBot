import { ZenCommand } from '../../lib/core/factory.js';
import { downloadMediaBuffer, sendImageAsSticker, sendVideoAsSticker } from '../../lib/media/sticker.js';

const MEDIA_KEYS = ['imageMessage', 'videoMessage', 'stickerMessage'];

const unwrap = (message) => {
  let current = message;
  for (let i = 0; i < 5 && current; i++) {
    const wrapper = ['ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension', 'documentWithCaptionMessage']
      .find((key) => current[key]?.message);
    if (!wrapper) break;
    current = current[wrapper].message;
  }
  return current || {};
};

const findQuoted = (message) => {
  const unwrapped = unwrap(message);
  for (const value of Object.values(unwrapped)) {
    if (value && typeof value === 'object' && value.contextInfo?.quotedMessage) {
      return value.contextInfo.quotedMessage;
    }
  }
  return null;
};

export default new ZenCommand('sticker')
  .addAlias('s', 'stiker', 'stic', 'figurinha')
  .setCooldown(3)
  .setCategory('convertidores')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const own = unwrap(ctx.rawMsg.message);

    const ownKey = MEDIA_KEYS.find((key) => own[key]);
    const rawSource = ownKey ? own : findQuoted(ctx.rawMsg.message);

    if (!rawSource) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *MEDIA REQUERIDA*\n\n` +
        `> Enviá una imagen o video con el comando, o responde a uno 🤔\n` +
        `> *Ejemplo:* responde a una foto con *${ctx.commandName}*`
      );
    }

    const source = unwrap(rawSource);
    const mtype = MEDIA_KEYS.find((key) => source[key]);
    if (!mtype) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *FORMATO NO SOPORTADO*\n\n` +
        `> Solo se soportan imágenes y videos 😵‍💫`
      );
    }

    const mediaMsg = source[mtype];
    const esImg = mtype === 'imageMessage';
    const esVid = mtype === 'videoMessage';
    const esSticker = mtype === 'stickerMessage';

    if (esSticker) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *YA ES UN STICKER*\n\n` +
        `> Ese archivo ya es un sticker. Respondé a una imagen o video 😅`
      );
    }

    await ctx.react('⏳');

    try {
      let buffer;
      try {
        buffer = Buffer.from(await ctx.sock.downloadMedia(source, esImg ? 'image' : 'video'));
      } catch (streamError) {
        buffer = await downloadMediaBuffer(ctx.sock, { key: ctx.rawMsg.key, message: source });
        if (!buffer) throw streamError;
      }

      if (!buffer || buffer.length < 32) throw new Error('buffer de media vacío');

      const userName = user.name || user.nickname || 'Usuario';
      const contextInfo = { mentionedJid: [ctx.sender] };

      if (esVid) {
        const seconds = mediaMsg?.seconds || 0;
        if (seconds > 11) {
          await ctx.react('⚠️');
          return ctx.reply(
            `『 ⚠️ 』 *VIDEO MUY LARGO*\n\n` +
            `> El video debe durar menos de 11 segundos 😄`
          );
        }
        await sendVideoAsSticker(ctx.sock, ctx.chat, buffer, ctx.rawMsg, { userName, contextInfo });
      } else {
        await sendImageAsSticker(ctx.sock, ctx.chat, buffer, ctx.rawMsg, { userName, contextInfo });
      }

      await ctx.react('✅');
    } catch (error) {
      console.error(`[sticker] Error: ${error?.message || error}`);
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR AL CREAR STICKER*\n\n` +
        `> No pude crear el sticker 😭\n` +
        `> Verificá que el archivo sea una imagen o video válido.`
      );
    }
  });