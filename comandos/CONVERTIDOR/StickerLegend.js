import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { downloadMediaBuffer } from '../../lib/media/sticker.js';

export default new ZenCommand('stickerlegend')
  .addAlias('stickertexto', 'stickerleyenda', 'slegend')
  .setCooldown(5)
  .setCategory('Convertidores')
  .requireRegistration()
  .setUsage('<texto> (responder a imagen)')
  .onExecute(async (ctx) => {
    const [text] = ctx.args;
    const quoted = ctx.rawMsg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const prefix = ZenConfig.prefix;

    if (!text) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *TEXTO REQUERIDO*\n\n` +
        `✦ *Uso:* ${prefix}stickerlegend [texto]\n` +
        `✦ *Ejemplo:* ${prefix}stickerlegend Hola mundo\n\n` +
        `> _Responde a una imagen para convertirla en sticker con texto 🤨_`
      );
    }

    if (!quoted?.imageMessage && !quoted?.videoMessage) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *IMAGEN REQUERIDA*\n\n` +
        `> Respondé a una imagen o video con el comando 🤨\n` +
        `> _Ejemplo: Respondé a una foto y escribe ${prefix}stickerlegend Mi texto_`
      );
    }

    await ctx.react('⏳');

    try {
      const mediaBuffer = await downloadMediaBuffer(ctx.sock, {
        key: ctx.rawMsg.key,
        message: quoted
      });

      if (!mediaBuffer) {
        await ctx.react('❌');
        return ctx.reply(`『 ❌ 』 *ERROR DE DESCARGA*\n\n> No pude descargar tu imagen 😣`);
      }

      const formData = new FormData();
      const blob = new Blob([mediaBuffer], { type: 'image/jpeg' });
      formData.append('image', blob);
      formData.append('text', text);

      const res = await fetch('https://zone.api.br/api/canvas/legendafigu', {
        method: 'POST',
        body: formData
      });

      const json = await res.json();

      if (!json.status || !json.result?.image) {
        throw new Error('API falló');
      }

      const imgRes = await fetch(json.result.image);
      const buf = Buffer.from(await imgRes.arrayBuffer());

      await ctx.react('✅');

      const user = await ctx.getUser();
      const packname = user.name || 'ZenBot';
      const author = ctx.rawMsg.pushName || 'Usuario';

      const { addExif } = await import('../../lib/media/sticker.js');
      const stickerBuf = await addExif(buf, packname, author);

      await ctx.sock.sendMessage(ctx.chat, {
        sticker: stickerBuf,
        contextInfo: {
          isForwarded: true,
          forwardingScore: 1,
          forwardedNewsletterMessageInfo: {
            newsletterJid: ZenConfig.newsletterJid,
            serverMessageId: 1
          }
        }
      }, { quoted: ctx.rawMsg });

    } catch {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR AL GENERAR*\n\n` +
        `> No pude hacer el sticker con texto 😵\n` +
        `> Probá con otra imagen u otro texto 🙏`
      );
    }
  });