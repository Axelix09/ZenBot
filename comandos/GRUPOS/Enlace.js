import { ZenCommand } from '../../lib/core/factory.js';

export default new ZenCommand('link')
  .addAlias('invitar', 'invite')
  .setCooldown(3)
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .requireBotAdmin()
  .onExecute(async (ctx) => {
    await ctx.react('🔗');
    const code = await ctx.sock.groups.inviteCode(ctx.chat);
    return ctx.reply(
      `『 🔗 』 *ENLACE DE INVITACIÓN*\n\n` +
      `> https://chat.whatsapp.com/${code} 🙂`
    );
  });