import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

export default new ZenCommand('cerrar')
  .addAlias('closegroup', 'close')
  .setCooldown(3)
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .requireBotAdmin()
  .onExecute(async (ctx) => {
    await ctx.react('🔒');

    let meta;
    try {
      meta = await ctx.sock.groupMetadata(ctx.chat);
    } catch {
      return ctx.reply(`『 ⚠️ 』 *ERROR DE RED*\n\n> No pude cargar la información del grupo 😵`);
    }

    const isAlreadyClosed = meta.announce === true;

    if (isAlreadyClosed) {
      await ctx.react('ℹ️');
      return ctx.reply(
        `『 ℹ️ 』 *GRUPO YA CERRADO*\n\n` +
        `> El grupo ya se encuentra en modo cerrado 😅\n` +
        `> Solo los administradores pueden enviar mensajes.\n\n` +
        `> Para abrirlo: *${ZenConfig.prefix}abrir*`
      );
    }

    await ctx.sock.groups.onlyAdminsTalk(ctx.chat);
    return ctx.reply(
      `『 🔒 』 *GRUPO CERRADO*\n\n` +
      `> Solo los administradores pueden enviar mensajes 🙂\n\n` +
      `> Para abrirlo: *${ZenConfig.prefix}abrir*`
    );
  });