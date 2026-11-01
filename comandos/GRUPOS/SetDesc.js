import { ZenCommand } from '../../lib/core/factory.js';

export default new ZenCommand('desc')
  .addAlias('descripcion', 'setdesc')
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
        `『 ⚠️ 』 *TEXTO REQUERIDO*\n\n> Uy, algo no cuadra 🤨\n\n` +
        `> Indicá la nueva descripción del grupo 🧐`
      );
    }

    await ctx.sock.groups.describe(ctx.chat, text);
    await ctx.react('✅');
    return ctx.reply(
      `『 ✅ 』 *DESCRIPCIÓN ACTUALIZADA*\n\n` +
      `> La descripción del grupo fue cambiada 😄`
    );
  });