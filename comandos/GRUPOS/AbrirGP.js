import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

export default new ZenCommand('abrir')
  .addAlias('open', 'opengroup')
  .setCooldown(3)
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .requireBotAdmin()
  .onExecute(async (ctx) => {
    await ctx.react('🔓');

    let meta;
    try {
      meta = await ctx.sock.groupMetadata(ctx.chat);
    } catch {
      return ctx.reply(`『 ⚠️ 』 *ERROR DE RED*\n\n> No pude cargar la información del grupo 😤`);
    }

    const isAlreadyOpen = meta.announce === false || meta.announce === undefined;

    if (isAlreadyOpen) {
      await ctx.react('ℹ️');
      return ctx.reply(
        `『 ℹ️ 』 *GRUPO YA ABIERTO*\n\n` +
        `> El grupo ya se encuentra en modo abierto 🤨\n` +
        `> Todos los miembros pueden enviar mensajes libremente.\n\n` +
        `> Para cerrarlo: *${ZenConfig.prefix}cerrar*`
      );
    }

    await ctx.sock.groups.everyoneTalks(ctx.chat);
    return ctx.reply(
      `『 🔓 』 *GRUPO ABIERTO*\n\n` +
      `> Todos los miembros pueden enviar mensajes libremente 😌\n\n` +
      `> Para cerrarlo: *${ZenConfig.prefix}cerrar*`
    );
  });