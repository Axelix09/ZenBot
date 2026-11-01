import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

export default new ZenCommand('anticallgp')
  .addAlias('anticall', 'antillamada')
  .setCooldown(3)
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .setUsage('on|off')
  .onExecute(async (ctx) => {
    const [modo] = ctx.args;
    const group = await ctx.getGroup();

    if (!modo || !['on', 'activar', 'off', 'desactivar'].includes(modo.toLowerCase())) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *MODO INVÁLIDO*\n\n> Uy, algo no cuadra 🤨\n\n` +
        `✦ *Opciones:*\n` +
        `  • ${ZenConfig.prefix}${ctx.commandName} on / activar\n` +
        `  • ${ZenConfig.prefix}${ctx.commandName} off / desactivar`
      );
    }

    const activar = ['on', 'activar'].includes(modo.toLowerCase());
    group.anticallgp = activar;
    await group.save();

    await ctx.react('📞');

    if (activar) {
      return ctx.reply(
        `『 📞 』 *ANTI-LLAMADA GRUPAL ACTIVADO*\n\n` +
        `> Se expulsará automáticamente a cualquier miembro no-administrador que inicie una llamada o videollamada en este grupo 😄`
      );
    } else {
      return ctx.reply(
        `『 📞 』 *ANTI-LLAMADA GRUPAL DESACTIVADO*\n\n` +
        `> Los miembros del grupo pueden iniciar llamadas y videollamadas con normalidad 😄`
      );
    }
  });
