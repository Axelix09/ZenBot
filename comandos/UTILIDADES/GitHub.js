import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import axios from 'axios';

export default new ZenCommand('github')
  .addAlias('popgithub')
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
        `> Indicá el nombre de usuario de GitHub 🤔\n` +
        `> _Ejemplo: ${prefix}github octocat_`
      );
    }

    await ctx.react('⏳');

    try {
      const res = await axios.get(`https://api.popcat.xyz/v2/github/${encodeURIComponent(username)}`);
      const d = res.data?.message;
      if (!d || res.data?.error) throw new Error();

      const caption = `『 👤 』 *${d.name || d.login || username}*\n\n` +
        `✦ *URL:* ${d.url}\n` +
        `✦ *Tipo:* ${d.account_type}\n` +
        `✦ *Ubicación:* ${d.location || '—'}\n` +
        `✦ *Email:* ${d.email || '—'}\n` +
        `✦ *Repositorios:* ${d.public_repos}\n` +
        `✦ *Seguidores:* ${d.followers}\n` +
        `✦ *Siguiendo:* ${d.following}\n` +
        `✦ *Bio:* ${d.bio || '—'}\n` +
        `✦ *Creado:* ${d.created_at}`;

      await ctx.react('✅');
      return ctx.sock.sendMessage(ctx.chat, {
        image: { url: d.avatar },
        caption
      }, { quoted: ctx.rawMsg });
    } catch {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *USUARIO NO ENCONTRADO*\n\n` +
        `> No pude encontrar el usuario *${username}* en GitHub 😕`
      );
    }
  });