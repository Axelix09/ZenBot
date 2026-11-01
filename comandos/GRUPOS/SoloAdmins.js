import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

export default new ZenCommand('onlyadmin')
  .addAlias('soloadmin', 'adminonly')
  .setCooldown(3)
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .setUsage('on|off')
  .onExecute(async (ctx) => {
    const group = await ctx.getGroup();
    const modo = ctx.args[0]?.toLowerCase();
    let nuevoEstado;

    if (!modo) {
      nuevoEstado = !group.onlyadmin;
    } else if (['on', 'activar'].includes(modo)) {
      nuevoEstado = true;
    } else if (['off', 'desactivar'].includes(modo)) {
      nuevoEstado = false;
    } else {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *MODO INVÁLIDO*\n\n` +
        `> Creo que te faltó algo 🤔\n> Usá: *${ZenConfig.prefix}${ctx.commandName} on* o *${ZenConfig.prefix}${ctx.commandName} off*.`
      );
    }

    group.onlyadmin = nuevoEstado;
    await group.save();

    await ctx.react('🔒');
    if (nuevoEstado) {
      return ctx.reply(
        `『 🔒 』 *MODO SOLO ADMINS ACTIVADO*\n\n` +
        `> El bot ignorará comandos de usuarios regulares 😉`
      );
    } else {
      return ctx.reply(
        `『 🔓 』 *MODO SOLO ADMINS DESACTIVADO*\n\n` +
        `> El bot opera con normalidad para todos 🥳`
      );
    }
  });
