import { ZenCommand } from '../../lib/core/factory.js';
import fetch from 'node-fetch';
import { upload } from '@axel-dev09/zen-dl';

export default new ZenCommand('comprimir')
  .addAlias('compress')
  .setCooldown(10)
  .setCategory('tools')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const [url] = ctx.args;
    const quoted = ctx.rawMsg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    let buffer;

    if (quoted) {
      const mtype = Object.keys(quoted)[0] || '';
      const mediaMsg = quoted[mtype];
      const mime = mediaMsg?.mimetype || '';

      if (mime.startsWith('image/')) {
        buffer = Buffer.from(await ctx.sock.downloadMedia(mediaMsg, 'image'));
      }
    } else if (url && /^https?:\/\/.*\.(jpe?g|png|gif)$/i.test(url)) {
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      buffer = Buffer.from(await res.arrayBuffer());
    }

    if (!buffer) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *IMAGEN REQUERIDA*\n\n` +
        `> Respondé a una imagen o envía un link directo 🤔`
      );
    }

    await ctx.react('📤');

    try {
      const { url: urlCatbox } = await upload(buffer, `compress_${Date.now()}.jpg`);
      const response = await fetch(`https://api.siputzx.my.id/api/iloveimg/compress?image=${encodeURIComponent(urlCatbox)}`);
      
      if (!response.ok) throw new Error();
      const compressed = Buffer.from(await response.arrayBuffer());
      
      await ctx.react('✅');
      return ctx.sock.sendMessage(ctx.chat, {
        image: compressed,
        caption: `『 🎯 』 *IMAGEN COMPRIMIDA*\n\n> La imagen fue comprimida exitosamente 😄`
      }, { quoted: ctx.rawMsg });
    } catch {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR AL COMPRIMIR*\n\n` +
        `> No pude completar la compresión 😭`
      );
    }
  });