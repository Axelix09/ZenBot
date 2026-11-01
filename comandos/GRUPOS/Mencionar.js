import { ZenCommand } from '../../lib/core/factory.js';

export default new ZenCommand('tag')
  .addAlias('n', 'mensaje', 'notify', 'mencionar')
  .setCooldown(3)
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .setUsage('<mensaje>')
  .onExecute(async (ctx) => {
    await ctx.react('📢');
    let meta;
    try { meta = await ctx.sock.groupMetadata(ctx.chat); } catch { return ctx.reply(`『 ⚠️ 』 *ERROR DE RED*\n\n> No pude cargar el registro del grupo 😵`); }
    const participants = meta.participants || [];
    const mentions = participants.map(p => p.id);

    const quoted = ctx.rawMsg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const msgContext = quoted || ctx.rawMsg.message;
    const mtype = msgContext ? Object.keys(msgContext)[0] : '';
    const isMedia = /image|video|audio|sticker|document/.test(mtype);

    const finalMsg = ctx.args.join(' ') || (quoted ? (msgContext.conversation || msgContext.extendedTextMessage?.text || '') : '📢');

    if (isMedia) {
      const mediaMsg = msgContext[mtype];
      const buffer = Buffer.from(await ctx.sock.downloadMedia(mediaMsg, mtype.replace('Message', '')));

      const mime = mediaMsg.mimetype || '';
      const ptt = mediaMsg.ptt || false;
      const fileName = mediaMsg.fileName || 'archivo';

      if (/image/.test(mtype)) {
        await ctx.sock.sendMessage(ctx.chat, { image: buffer, caption: finalMsg, mentions }, { quoted: ctx.rawMsg });
      } else if (/video/.test(mtype)) {
        await ctx.sock.sendMessage(ctx.chat, { video: buffer, caption: finalMsg, mentions }, { quoted: ctx.rawMsg });
      } else if (/audio/.test(mtype)) {
        await ctx.sock.sendMessage(ctx.chat, { audio: buffer, ptt, mimetype: mime || 'audio/mpeg', mentions }, { quoted: ctx.rawMsg });
      } else if (/sticker/.test(mtype)) {
        await ctx.sock.sendMessage(ctx.chat, { sticker: buffer, mentions }, { quoted: ctx.rawMsg });
      } else if (/document/.test(mtype)) {
        await ctx.sock.sendMessage(ctx.chat, { document: buffer, caption: finalMsg, mimetype: mime || 'application/octet-stream', fileName, mentions }, { quoted: ctx.rawMsg });
      }
    } else {
      await ctx.sock.sendMessage(ctx.chat, { text: finalMsg, mentions }, { quoted: ctx.rawMsg });
    }
  });