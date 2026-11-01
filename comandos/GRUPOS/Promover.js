import { ZenCommand } from '../../lib/core/factory.js';

export default new ZenCommand('promover')
  .addAlias('promote', 'admin')
  .setCooldown(3)
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .requireBotAdmin()
  .setUsage('@usuario')
  .onExecute(async (ctx) => {
    const targetJid = await ctx.resolveMentionTarget();
    if (!targetJid) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *USUARIO REQUERIDO*\n\n> Eso no me cierra 😵‍💫\n\n` +
        `> Mencioná al usuario que deseas promover 🧐`
      );
    }

    await ctx.sock.groups.promote(ctx.chat, [targetJid]);
    await ctx.react('⬆️');
    return ctx.reply(
      `『 ⬆️ 』 *ADMINISTRADOR PROMOVIDO*\n\n` +
      `> @${targetJid.split('@')[0]} ahora es administrador 😌`,
      { mentions: [targetJid] }
    );
  });