import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

const getInnerViewOnce = (message) => {
  if (!message) return null;
  let m = message;
  if (m.ephemeralMessage) m = m.ephemeralMessage.message || m.ephemeralMessage;
  
  if (m.viewOnceMessage) {
    const type = Object.keys(m.viewOnceMessage.message || {})[0];
    return { type, message: m.viewOnceMessage.message };
  }
  if (m.viewOnceMessageV2) {
    const type = Object.keys(m.viewOnceMessageV2.message || {})[0];
    return { type, message: m.viewOnceMessageV2.message };
  }

  const mtype = Object.keys(m)[0] || '';
  const innerMsg = m[mtype];
  if (innerMsg && (innerMsg.viewOnce || innerMsg.viewOnceV2)) {
    return { type: mtype, message: m };
  }
  return null;
};

export default new ZenCommand('ver')
  .addAlias('verfoto', 'verview', 'verft', 'vervideo', 'vervid', 'veraudio', 'voaudio')
  .setCooldown(3)
  .setCategory('tools')
  .onExecute(async (ctx) => {
    const quoted = ctx.rawMsg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const viewOnceObj = getInnerViewOnce(quoted);

    if (!quoted || !viewOnceObj) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *SIN CONTENIDO EFÍMERO*\n\n` +
        `> Respondé a un mensaje de imagen, video o nota de voz de *una sola vez* para revelarlo 🤔`
      );
    }

    const ownerJids = ZenConfig.ownerNumbers.map(n => n.replace(/[^0-9]/g, '') + '@s.whatsapp.net');
    if (ownerJids.includes(ctx.quotedParticipant)) {
      await ctx.react('🔒');
      return ctx.reply(
        `『 🔒 』 *ACCESO DENEGADO*\n\n` +
        `> No se permite revelar contenido efímero del propietario del bot 😬`
      );
    }

    await ctx.react('👁️');

    try {
      const innerType = viewOnceObj.type;
      const innerMsg = viewOnceObj.message;
      const mediaMsg = innerMsg[innerType];
      const mediaType = innerType.replace('Message', '');

      const buffer = Buffer.from(await ctx.sock.downloadMedia(mediaMsg, mediaType));

      if (innerType === 'imageMessage') {
        await ctx.sock.sendMessage(ctx.chat, {
          image: buffer,
          caption: `『 👁️ 』 *CONTENIDO REVELADO*\n\n> Esta imagen era de una sola vista 🙂`
        }, { quoted: ctx.rawMsg });
      } else if (innerType === 'videoMessage') {
        await ctx.sock.sendMessage(ctx.chat, {
          video: buffer,
          caption: `『 👁️ 』 *CONTENIDO REVELADO*\n\n> Este video era de una sola vista 🙂`
        }, { quoted: ctx.rawMsg });
      } else if (innerType === 'audioMessage') {
        await ctx.reply(`『 👁️ 』 *CONTENIDO REVELADO*\n\n> Esta nota de voz era de una sola vista 🙂`);
        await ctx.sock.sendMessage(ctx.chat, {
          audio: buffer,
          mimetype: mediaMsg.mimetype || 'audio/mpeg',
          ptt: mediaMsg.ptt || false
        }, { quoted: ctx.rawMsg });
      }
    } catch (e) {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR AL RECUPERAR*\n\n` +
        `> No pude recuperar el archivo de una sola vista 😭\n` +
        `> _${e.message}_`
      );
    }
  });