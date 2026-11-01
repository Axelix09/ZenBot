import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { requesterNumber, isMainOwner } from '../../lib/services/subbots.js';
import { isSubBotAnticallEnabled, setSubBotAnticall } from '../../lib/runtime/subbot-settings.js';

const ON = ['on', 'activar'];
const OFF = ['off', 'desactivar'];

export default new ZenCommand('anticallbot')
  .addAlias('anticallsub', 'antillamadabot')
  .setCooldown(3)
  .setCategory('jadibot')
  .setUsage('on|off')
  .onExecute(async (ctx) => {
    const prefix = ZenConfig.prefix;

    if (!ctx.sock.isSubBot) {
      return ctx.reply(
        `『 📞 』 *ANTI-LLAMADA*\n\n` +
        `> En el bot principal está siempre activo 😌\n` +
        `> Este comando es solo para sub-bots.`
      );
    }

    const numero = ctx.sock.subbotNumber;
    const sender = requesterNumber(ctx);
    const permitido = ctx.rawMsg?.key?.fromMe || sender === numero || isMainOwner(sender);

    if (!permitido) {
      return ctx.reply(V.perm.owner(numero, 'cambiar esto'));
    }

    const modo = (ctx.args[0] || '').toLowerCase();

    if (!ON.includes(modo) && !OFF.includes(modo)) {
      const estado = isSubBotAnticallEnabled(numero) ? '✅ ACTIVADO' : '❌ DESACTIVADO';
      await ctx.react('📞');
      return ctx.reply(
        `『 📞 』 *ANTI-LLAMADA DEL SUB-BOT*\n\n` +
        `> Estado: *${estado}*\n\n` +
        `✦ *Activar:* ${prefix}${ctx.commandName} on\n` +
        `✦ *Desactivar:* ${prefix}${ctx.commandName} off`
      );
    }

    const activar = ON.includes(modo);
    setSubBotAnticall(numero, activar);
    await ctx.react('📞');

    if (activar) {
      return ctx.reply(
        `『 📞 』 *ANTI-LLAMADA ACTIVADO*\n\n` +
        `> Las llamadas a este sub-bot se rechazarán y quien insista será bloqueado 😄`
      );
    }

    return ctx.reply(
      `『 📞 』 *ANTI-LLAMADA DESACTIVADO*\n\n` +
      `> Este sub-bot ya no toca las llamadas que recibas 😎`
    );
  });
