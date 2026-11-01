import { ZenCommand } from '../../lib/core/factory.js';

export default new ZenCommand('nombre')
  .addAlias('groupname', 'setnombre')
  .setCooldown(3)
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .requireBotAdmin()
  .setUsage('<texto>')
  .onExecute(async (ctx) => {
    const text = ctx.args.join(' ');
    if (!text) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *NOMBRE REQUERIDO*\n\n> Uy, algo no cuadra 🤨\n\n` +
        `> Indicá el nuevo nombre del grupo 🧐`
      );
    }

    await ctx.sock.groups.rename(ctx.chat, text);
    await ctx.react('✅');
    return ctx.reply(
      `『 ✅ 』 *NOMBRE ACTUALIZADO*\n\n` +
      `> El nombre del grupo fue cambiado a: ${text} 🙂`
    );
  });