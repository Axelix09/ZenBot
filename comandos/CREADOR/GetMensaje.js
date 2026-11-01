import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

function toBase64(buf) {
  return Buffer.isBuffer(buf) ? buf.toString('base64') : Buffer.from(buf).toString('base64');
}

export default new ZenCommand('getcode')
  .addAlias('gen', 'msgcode')
  .setCooldown(2)
  .setCategory('Owner')
  .requireOwner()
  .setUsage('(responder a mensaje)')
  .onExecute(async (ctx) => {
    const quoted = ctx.rawMsg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *MENSAJE REQUERIDO*\n\n` +
        `> Respondé a un mensaje para obtener su código 😵‍💫`
      );
    }

    await ctx.react('⏳');

    const msg = quoted;
    const type = Object.keys(msg)[0] || 'conversation';
    const content = msg[type];

    const replacer = (key, value) => {
      if (value && value.type === 'Buffer' && Array.isArray(value.data)) {
        return Buffer.from(value.data).toString('base64');
      }
      if (value instanceof Uint8Array) return toBase64(value);
      if (typeof value === 'object' && value && value.low !== undefined && value.high !== undefined) {
        return value.toNumber ? value.toNumber() : Number(value.low);
      }
      return value;
    };

    const json = JSON.stringify(msg, replacer, 2);

    if (json.length > 4000) {
      await ctx.sock.sendMessage(ctx.chat, {
        document: Buffer.from(json, 'utf8'),
        mimetype: 'application/json',
        fileName: `msg_${type}_${Date.now()}.json`,
        caption: `『 📄 』 *CÓDIGO DEL MENSAJE*\n\n✦ *Tipo:* ${type}`
      }, { quoted: ctx.rawMsg });
    } else {
      await ctx.react('✅');
      await ctx.reply(
        `『 📄 』 *CÓDIGO DEL MENSAJE*\n\n` +
        `✦ *Tipo:* ${type}\n\n` +
        `\`\`\`json\n${json}\n\`\`\``
      );
    }
  });