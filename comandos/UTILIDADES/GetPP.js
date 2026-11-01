import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { jidNormalizedUser } from 'zyrix';

export default new ZenCommand('getpp')
  .addAlias('pfp', 'pp', 'foto')
  .setCooldown(5)
  .setCategory('tools')
  .requireRegistration()
  .setUsage('@usuario')
  .onExecute(async (ctx) => {
    const mentioned = ctx.mentions?.[0] || ctx.quotedParticipant;
    const prefix = ZenConfig.prefix;

    let who = mentioned || ctx.sender;

    if (!mentioned) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *USUARIO REQUERIDO*\n\n` +
        `> Mencioná a alguien, responde a su mensaje o escribe su número 😵‍💫\n` +
        `> _Ejemplos:_\n` +
        `  • ${prefix}getpp @usuario\n` +
        `  • ${prefix}getpp 54911...`
      );
    }

    const user = jidNormalizedUser(who);
    const name = `@${user.split('@')[0]}`;

    try {
      const pp = await ctx.sock.profile.pictureUrl(user, 'image');
      await ctx.react('📸');
      return ctx.sock.sendMessage(ctx.chat, {
        image: { url: pp },
        caption: `『 📸 』 *FOTO DE PERFIL*\n\n> Aquí tenés la foto de ${name} 😌`,
        mentions: [user]
      }, { quoted: ctx.rawMsg });

    } catch {
      try {
        const ppPreview = await ctx.sock.profile.pictureUrl(user, 'preview');
        await ctx.react('📸');
        return ctx.sock.sendMessage(ctx.chat, {
          image: { url: ppPreview },
          caption: `『 📸 』 *FOTO MINIATURA*\n\n> No pude obtener la imagen original por privacidad 😄\n> Aquí tenés la de miniatura para ${name}`,
          mentions: [user]
        }, { quoted: ctx.rawMsg });
      } catch {
        await ctx.react('❌');
        return ctx.reply(
          `『 ❌ 』 *SIN ACCESO*\n\n` +
          `> No pude obtener ninguna foto 🤔\n` +
          `> El usuario no tiene foto de perfil o tiene la privacidad máxima.`
        );
      }
    }
  });