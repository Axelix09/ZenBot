import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { UserModel } from '../../lib/database/adapter.js';

export default new ZenCommand('broadcast')
  .addAlias('bc', 'anuncio', 'global')
  .setCooldown(30)
  .setCategory('Owner')
  .requireOwner()
  .setUsage('<mensaje>')
  .onExecute(async (ctx) => {
    const text = ctx.args.join(' ');
    const prefix = ZenConfig.prefix;

    if (!text) {
      return ctx.reply(
        `『 📢 』 *BROADCAST GLOBAL*\n\n` +
        `✦ *Uso:* ${prefix}broadcast [mensaje]\n` +
        `✦ *Ejemplo:* ${prefix}broadcast Hola a todos!\n\n` +
        `> _Envía un mensaje a todos los usuarios registrados 😉_`
      );
    }

    await ctx.react('⏳');
    await ctx.reply(`『 ⏳ 』 *Enviando mensaje a todos los usuarios...*`);

    try {
      const users = await UserModel.find({ registered: true });
      let sent = 0;
      let failed = 0;

      for (const user of users) {
        try {
          await ctx.sock.sendMessage(user.id, {
            text: `『 📢 』 *ANUNCIO GLOBAL*\n\n${text}\n\n> _Enviado por el administrador 😌_`
          });
          sent++;
        } catch {
          failed++;
        }
        await new Promise(r => setTimeout(r, 500));
      }

      await ctx.react('✅');
      return ctx.reply(
        `『 ✅ 』 *BROADCAST COMPLETADO*\n\n> ¡Eso estuvo bueno! 😄\n\n` +
        `✦ *Enviados:* ${sent}\n` +
        `✦ *Fallidos:* ${failed}\n` +
        `✦ *Total:* ${sent + failed}`
      );
    } catch (error) {
      console.error('[broadcast] Error:', error);
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *ERROR*\n\n> ${error.message || 'No pude enviar el mensaje 😵‍💫'}`);
    }
  });