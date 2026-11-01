import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { listRunning, countRunning, getLimit } from '../../lib/services/subbots.js';

export default new ZenCommand('bots')
  .addAlias('listabots', 'subbots')
  .setCooldown(5)
  .setCategory('jadibot')
  .onExecute(async (ctx) => {
    const prefix = ZenConfig.prefix;
    const running = listRunning();

    if (!running.length) {
      return ctx.reply(`『 ℹ️ 』 *VACÍO*\n\n> No hay ningún sub-bot activo en este momento 🙂\n> _Usá ${prefix}serbot para alojar el tuyo._`);
    }

    const lines = running.map((numero, index) => `> *${index + 1}.* wa.me/${numero}`).join('\n');
    return ctx.reply(
      `『 🤖 』 *SUB-BOTS*\n\n` +
      `> 📊 *Conectados:* ${countRunning()} de ${getLimit()}\n\n` +
      `${lines}\n\n` +
      `> _Usá ${prefix}serbot para alojar el tuyo._`,
      { mentions: [] }
    );
  });
  