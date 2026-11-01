import fs from 'node:fs';
import path from 'node:path';
import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { deleteSubBot, isRunning, requesterNumber, isMainOwner, digits } from '../../lib/services/subbots.js';

const sessionExists = (numero) => fs.existsSync(path.resolve('ZenSessions', 'subbots', numero));

export default new ZenCommand('delbot')
  .addAlias('borrarbot')
  .setCooldown(5)
  .setCategory('jadibot')
  .onExecute(async (ctx) => {
    const sender = requesterNumber(ctx);
    const owner = isMainOwner(sender);

    if (ctx.sock.isSubBot) {
      const numero = ctx.sock.subbotNumber;
      if (sender !== numero && !owner) {
        return ctx.reply(V.perm.owner(numero, 'eliminar este sub-bot'));
      }
      await ctx.reply(`『 🗑️ 』 *ELIMINADO*\n\n> La sesión fue borrada permanentemente del servidor 😉`);
      return deleteSubBot(numero);
    }

    const requested = digits(ctx.args[0]);
    const numero = owner && requested ? requested : sender;

    if (!isRunning(numero) && !sessionExists(numero)) {
      return ctx.reply(`『 ❌ 』 *ERROR*\n\n> No tenés ninguna sesión guardada 😭`);
    }

    const wasRunning = isRunning(numero);
    await deleteSubBot(numero);
    return ctx.reply(
      `『 🗑️ 』 *ELIMINADO*\n\n> Los datos de la sesión (+${numero}) fueron borrados.` +
      (wasRunning ? '' : `\n> _Como estaba pausada, quitá el dispositivo desde WhatsApp > Dispositivos vinculados 😉_`)
    );
  });
  