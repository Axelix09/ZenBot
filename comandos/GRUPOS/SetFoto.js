import { ZenCommand } from '../../lib/core/factory.js';
import sharp from 'sharp';

export default new ZenCommand('fotog')
  .addAlias('setfoto', 'groupfoto')
  .setCooldown(10)
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .requireBotAdmin()
  .setUsage('(responder a una imagen)')
  .onExecute(async (ctx) => {
    const msg = ctx.rawMsg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage 
      || ctx.rawMsg.message?.imageMessage 
      || null;

    if (!msg) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *IMAGEN REQUERIDA*\n\n` +
        `> Respondé a una imagen para establecerla como foto del grupo 🤨`
      );
    }

    try {
      const buffer = Buffer.from(await ctx.sock.downloadMedia(msg, 'image'));

      const metadata = await sharp(buffer).metadata();
      const size = Math.min(metadata.width || 0, metadata.height || 0);
      if (!size) throw new Error('imagen sin dimensiones válidas');
      const finalBuffer = await sharp(buffer)
        .extract({
          left: Math.floor(((metadata.width || size) - size) / 2),
          top: Math.floor(((metadata.height || size) - size) / 2),
          width: size,
          height: size
        })
        .resize(640, 640, { fit: 'fill' })
        .jpeg({ quality: 90, mozjpeg: true })
        .toBuffer();

      await ctx.sock.query({
        tag: 'iq',
        attrs: {
          to: 's.whatsapp.net',
          type: 'set',
          xmlns: 'w:profile:picture',
          target: ctx.chat
        },
        content: [{
          tag: 'picture',
          attrs: { type: 'image' },
          content: finalBuffer
        }]
      });

      await ctx.react('✅');
      return ctx.reply(
        `『 ✅ 』 *FOTO ACTUALIZADA*\n\n` +
        `> La foto de perfil del grupo fue cambiada 😉`
      );
    } catch {
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *ERROR AL PROCESAR*\n\n> No pude procesar esa imagen 😵 Probá con otra.`);
    }
  });
