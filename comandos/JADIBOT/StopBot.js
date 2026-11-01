import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { pauseSubBot, isRunning, requesterNumber, isMainOwner, digits } from '../../lib/services/subbots.js';

export default new ZenCommand('stopbot')
  .addAlias('pausarbot')
  .setCooldown(5)
  .setCategory('jadibot')
  .onExecute(async (ctx) => {
    const prefix = ZenConfig.prefix;
    const sender = requesterNumber(ctx);
    const owner = isMainOwner(sender);

    if (ctx.sock.isSubBot) {
      const numero = ctx.sock.subbotNumber;
      if (sender !== numero && !owner) {
        return ctx.reply(V.perm.owner(numero, 'pausar este sub-bot'));
      }
      await ctx.reply(`『 ⏸️ 』 *PAUSADO*\n\n> Sesión desconectada temporalmente 😄\n> Para reactivarla, usá *${prefix}serbot* en el bot principal.`);
      return pauseSubBot(numero);
    }

    const requested = digits(ctx.args[0]);
    const numero = owner && requested ? requested : sender;

    if (!isRunning(numero)) {
      return ctx.reply(`『 ❌ 』 *ERROR*\n\n> No tenés ninguna sesión activa en este momento 😤`);
    }

    await pauseSubBot(numero);
    return ctx.reply(`『 ⏸️ 』 *PAUSADO*\n\n> El sub-bot (+${numero}) fue apagado 😄\n> _Tus datos siguen guardados. Usá ${prefix}serbot para reactivarlo._`);
  });
  