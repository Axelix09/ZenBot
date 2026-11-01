import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

export default new ZenCommand('nsfw')
  .addAlias('adult', 'contenidoadulto')
  .setCooldown(3)
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .setUsage('on|off')
  .onExecute(async (ctx) => {
    const type = ctx.args[0]?.toLowerCase();
    const prefix = ZenConfig.prefix;

    if (!type) {
      const group = await ctx.getGroup();
      const status = group.nsfw === true ? '✅ ACTIVADO' : '❌ DESACTIVADO';
      
      await ctx.react('ℹ️');
      return ctx.reply(
        `『 🔞 』 *ESTADO NSFW*\n\n` +
        `> Contenido adulto: *${status}*\n\n` +
        `✦ *Activar:* ${prefix}nsfw on\n` +
        `✦ *Desactivar:* ${prefix}nsfw off`
      );
    }

    if (!['on', 'off'].includes(type)) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *MODO INVÁLIDO*\n\n` +
        `> Creo que te faltó algo 🤔\n> Usá: *${prefix}nsfw on* o *${prefix}nsfw off*`
      );
    }

    const group = await ctx.getGroup();
    const isEnable = type === 'on';

    if (group.nsfw === isEnable) {
      await ctx.react('ℹ️');
      return ctx.reply(
        `『 ℹ️ 』 *YA ${isEnable ? 'ACTIVADO' : 'DESACTIVADO'}*\n\n> ¡Bien ahí! 😎\n\n` +
        `> El contenido adulto ya está ${isEnable ? '✅ *activado*' : '❌ *desactivado*'} en este grupo.`
      );
    }

    group.nsfw = isEnable;
    await group.save();

    await ctx.react('✅');
    return ctx.reply(
      `『 🔞 』 *NSFW ${isEnable ? 'ACTIVADO ✅' : 'DESACTIVADO ❌'}*\n\n` +
      `> El contenido para adultos ${isEnable ? '*está permitido* en este grupo.' : '*NO está permitido* en este grupo.'} 😄`
    );
  });
