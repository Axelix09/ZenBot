import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { igStalk } from '../../lib/scraping/instagram.js';

export default new ZenCommand('igstalk')
  .addAlias('instagramstalk')
  .setCooldown(5)
  .setCategory('tools')
  .requireRegistration()
  .setUsage('<usuario>')
  .onExecute(async (ctx) => {
    const [username] = ctx.args;
    const prefix = ZenConfig.prefix;

    if (!username) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *USUARIO REQUERIDO*\n\n` +
        `> Indicá el nombre de usuario de Instagram 🤔\n` +
        `> _Ejemplo: ${prefix}igstalk cristiano_`
      );
    }

    await ctx.react('⏳');

    try {
      const d = await igStalk(username);

      const caption = `『 📸 』 *INSTAGRAM*\n\n` +
        `✦ *Nombre:* ${d.fullName}\n` +
        `✦ *Usuario:* @${d.username}\n` +
        `✦ *Bio:* ${d.bio || '—'}\n` +
        `✦ *Posts:* ${d.posts}\n` +
        `✦ *Seguidores:* ${d.followers}\n` +
        `✦ *Siguiendo:* ${d.following}\n` +
        `✦ *Verificado:* ${d.isVerified ? '✅ Sí' : '❌ No'}\n` +
        `✦ *Privado:* ${d.isPrivate ? '🔒 Sí' : '🔓 No'}\n` +
        `✦ *Enlace:* ${d.url}`;

      await ctx.react('✅');

      if (d.avatar) {
        return ctx.sock.sendMessage(ctx.chat, {
          image: { url: d.avatar },
          caption
        }, { quoted: ctx.rawMsg });
      }
      return ctx.reply(caption);

    } catch {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *PERFIL NO ENCONTRADO*\n\n` +
        `> No pude obtener la información de *${username}* 🥲`
      );
    }
  });
