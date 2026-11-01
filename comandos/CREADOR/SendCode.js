import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

export default new ZenCommand('sendcode')
  .addAlias('ejecutarjson', 'runjson')
  .setCooldown(2)
  .setCategory('Owner')
  .requireOwner()
  .setUsage('(responder a JSON)')
  .onExecute(async (ctx) => {
    const quoted = ctx.rawMsg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *JSON REQUERIDO*\n\n` +
        `> Respondé a un mensaje con código JSON para enviarlo 🤔`
      );
    }

    let txt = quoted.conversation || quoted.extendedTextMessage?.text || '';
    txt = txt.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      const raw = JSON.parse(txt);
      const originalKey = Object.keys(raw)[0];
      const content = raw[originalKey];

      const mapMessage = {
        'productMessage': 'product',
        'imageMessage': 'image',
        'videoMessage': 'video',
        'audioMessage': 'audio',
        'stickerMessage': 'sticker',
        'documentMessage': 'document',
        'locationMessage': 'location',
        'conversation': 'text',
        'extendedTextMessage': 'text'
      };

      const targetKey = mapMessage[originalKey] || originalKey;
      let payload = {};

      if (originalKey === 'conversation' || originalKey === 'extendedTextMessage') {
        payload = { text: content.text || content };
      } else if (originalKey === 'productMessage') {
        payload = { product: content.product, businessOwnerJid: content.businessOwnerJid };
      } else {
        payload = { [targetKey]: content };
      }

      await ctx.sock.sendMessage(ctx.chat, payload, { quoted: ctx.rawMsg });
      await ctx.react('✅');

    } catch (error) {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR AL EJECUTAR JSON*\n\n` +
        `> ${error.message || 'JSON inválido'} 😤`
      );
    }
  });