import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { addExifWithUser } from '../../lib/media/sticker.js';

export default new ZenCommand('brat')
  .addAlias('bratvid', 'brattext', 'bratsticker')
  .setCooldown(5)
  .setCategory('Convertidores')
  .requireRegistration()
  .setUsage('<texto>')
  .onExecute(async (ctx) => {
    const [text] = ctx.args;
    const isVideo = ctx.commandName === 'bratvid';
    const prefix = ZenConfig.prefix;
    const user = await ctx.getUser();
    const userName = user.name || user.nickname || 'Usuario';

    if (!text) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *TEXTO REQUERIDO*\n\n` +
        `✦ *Uso (estático):* ${prefix}brat [texto]\n` +
        `✦ *Uso (animado):* ${prefix}bratvid [texto]\n` +
        `✦ *Ejemplo:* ${prefix}brat Hola\n\n` +
        `> _Genera sticker con estilo BRAT 😵‍💫_`
      );
    }

    await ctx.react('⏳');

    try {
      const url = `https://zone.api.br/api/brat?text=${encodeURIComponent(text)}${isVideo ? '&animado=True' : ''}`;
      const res = await fetch(url);
      const json = await res.json();

      if (!json.status || !json.imagem) {
        throw new Error('API falló');
      }

      const imgRes = await fetch(json.imagem);
      const buf = Buffer.from(await imgRes.arrayBuffer());

      let stickerBuf = await addExifWithUser(buf, userName);

      await ctx.react('✅');

      if (isVideo) {
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
      } else {
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
      }

    } catch {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR AL GENERAR*\n\n` +
        `> No pude generar tu sticker BRAT 😭\n` +
        `> Probá con otro texto o en un rato 🥺`
      );
    }
  });