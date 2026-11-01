import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

export default new ZenCommand('todocvid')
  .addAlias('docvid', 'videodoc')
  .setCooldown(3)
  .setCategory('convertidores')
  .requireRegistration()
  .setUsage('<nombre>')
  .onExecute(async (ctx) => {
    const name = ctx.args.join(' ') || 'video';
    const quoted = ctx.rawMsg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *VIDEO REQUERIDO*\n\n` +
        `> Respondé a un video para convertirlo a documento 😵‍💫\n` +
        `> _Ejemplo: ${ZenConfig.prefix}docvid mi_video_`
      );
    }

    const mtype = Object.keys(quoted)[0] || '';
    const mediaMsg = quoted[mtype];

    if (mtype !== 'videoMessage') {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *VIDEO REQUERIDO*\n\n` +
        `> Solo se soportan videos 😵‍💫`
      );
    }

    const fileName = `${name.replace(/[^\w\s.-]/g, '').trim() || 'video'}.mp4`;

    await ctx.react('⏳');

    try {
      const buffer = Buffer.from(await ctx.sock.downloadMedia(mediaMsg, 'video'));

      await ctx.react('✅');
      await ctx.sock.sendMessage(ctx.chat, {
        document: buffer,
        mimetype: 'video/mp4',
        fileName: fileName,
        caption: `『 📄 』 *VIDEO COMO DOCUMENTO*\n\n> 📁 *Archivo:* ${fileName}\n> 📦 *Tamaño:* ${(buffer.length / 1024).toFixed(1)} KB`
      }, { quoted: ctx.rawMsg });

    } catch {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR AL CONVERTIR*\n\n` +
        `> No pude pasar el video a documento 😣 Probá de nuevo.`
      );
    }
  });