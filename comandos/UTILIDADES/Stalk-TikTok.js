import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import fg from 'fg-senna';

export default new ZenCommand('tiktokstalk')
  .addAlias('ttstalk', 'tkstal')
  .setCooldown(5)
  .setCategory('tools')
  .requireRegistration()
  .setUsage('<usuario>')
  .onExecute(async (ctx) => {
    const username = (ctx.args[0] || '').replace(/^@/, '').trim();
    const prefix = ZenConfig.prefix;

    if (!username) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *USUARIO REQUERIDO*\n\n` +
        `> Indicá el nombre de usuario de TikTok 🤨\n` +
        `> _Ejemplo: ${prefix}ttstalk khaby_`
      );
    }

    await ctx.react('⏳');

    try {
      const res = await fg.ttstalk(username);
      if (!res?.username) throw new Error();

      const caption = `『 🎵 』 *TIKTOK*\n\n` +
        `✦ *Nombre:* ${res.name || res.username}\n` +
        `✦ *Usuario:* @${res.username}\n` +
        `✦ *Bio:* ${res.bio || '—'}\n` +
        `✦ *Seguidores:* ${res.followers ?? '—'}\n` +
        `✦ *Siguiendo:* ${res.following ?? '—'}\n` +
        `✦ *Likes:* ${res.likes ?? '—'}\n` +
        `✦ *Videos:* ${res.videos ?? '—'}\n` +
        `✦ *Amigos:* ${res.friends ?? '—'}\n` +
        `✦ *Enlace:* https://tiktok.com/@${res.username}`;

      await ctx.react('✅');

      if (res.avatar) {
        return ctx.sock.sendMessage(ctx.chat, {
          image: { url: res.avatar },
          caption
        }, { quoted: ctx.rawMsg });
      }
      return ctx.reply(caption);

    } catch {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *PERFIL NO ENCONTRADO*\n\n` +
        `> No pude obtener la información de *${username}* 🤔`
      );
    }
  });
