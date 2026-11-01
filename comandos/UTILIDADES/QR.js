import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { qrGenerate } from '@axel-dev09/zen-dl';

export default new ZenCommand('qrcode')
  .addAlias('qr')
  .setCooldown(5)
  .setCategory('tools')
  .requireRegistration()
  .setUsage('<texto>')
  .onExecute(async (ctx) => {
    const [text] = ctx.args;
    const prefix = ZenConfig.prefix;

    if (!text) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *TEXTO REQUERIDO*\n\n` +
        `> Indicá el texto o link para generar el código QR 🤔\n` +
        `> _Ejemplo: ${prefix}qr https://github.com_`
      );
    }

    await ctx.react('⏳');

    try {
      const qr = await qrGenerate(text, 300);
      await ctx.react('✅');
      return ctx.sock.sendMessage(ctx.chat, {
        image: qr.buffer,
        caption: `『 ✅ 』 *QR GENERADO*\n\n> 📎 *Contenido:* ${text}`
      }, { quoted: ctx.rawMsg });
    } catch {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR AL GENERAR QR*\n\n` +
        `> No pude generar el código QR 😢`
      );
    }
  });