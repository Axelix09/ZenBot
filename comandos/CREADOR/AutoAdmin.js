import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

export default new ZenCommand('autoadmin')
  .addAlias('dameadmin', 'selfadmin', 'hacermeadmin', 'daradmin')
  .setCooldown(5)
  .setCategory('Owner')
  .requireOwner()
  .requireGroup()
  .requireBotAdmin()
  .setUsage('@usuario (opcional)')
  .onExecute(async (ctx) => {
    const target = ctx.mentions?.[0] || ctx.quotedParticipant || ctx.sender;

    await ctx.react('⏳');

    try {
      await ctx.sock.groups.promote(ctx.chat, [target]);

      const date = new Date().toLocaleDateString('es-ES');
      const time = new Date().toLocaleTimeString('es-ES', { hour: 'numeric', minute: 'numeric', hour12: true });

      await ctx.react('✅');
      return ctx.reply(
        `『 👑 』 *AUTOADMIN*\n\n` +
        `✦ *Usuario:* @${target.split('@')[0]}\n` +
        `✦ *Estado:* Administrador otorgado\n` +
        `✦ *Fecha:* ${date} | ${time}\n\n` +
        `> _Acceso de owner verificado correctamente 😌_`,
        { mentions: [target] }
      );

    } catch (error) {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR EN AUTOADMIN*\n\n` +
        `> ${error.message || 'No se pudo completar la promoción. Revisa los permisos del bot.'} 😭`
      );
    }
  });