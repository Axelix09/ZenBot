import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

export default new ZenCommand('leavegp')
  .addAlias('leavegroup', 'abandonar', 'salirgp', 'byezen')
  .setCooldown(5)
  .setCategory('Owner')
  .requireOwner()
  .setUsage('<jid>')
  .onExecute(async (ctx) => {
    const [jid] = ctx.args;
    const targetJid = jid || ctx.chat;

    if (!targetJid.endsWith('@g.us')) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *NO ES UN GRUPO*\n\n> El ID proporcionado no es un grupo válido 🤔`);
    }

    await ctx.react('👋');

    try {
      await ctx.sock.sendMessage(targetJid, {
        text: `👋 *Me voy de este grupo, ¡chau a todos! 😢*\n\n> _Me lo pidió el administrador 🥺_`
      });

      await ctx.sock.groups.leave(targetJid);
      
      await ctx.reply(
        `『 👋 』 *SALIENDO DEL GRUPO*\n\n` +
        `✦ *Grupo:* ${targetJid}\n` +
        `> El bot salió del grupo 😄`
      );

    } catch (error) {
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *ERROR*\n\n> ${error.message || 'No pude salirme del grupo 😳'}`);
    }
  });