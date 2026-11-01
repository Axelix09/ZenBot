import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import {
  startSubBot,
  pauseSubBot,
  pauseAllSubBots,
  hasSession,
  isRunning,
  requesterNumber,
  isMainOwner,
  digits
} from '../../lib/services/subbots.js';

const usage = (prefix) =>
  `『 ⚙️ 』 *USO*\n\n> ${prefix}bot on — encender tu sub-bot 😌\n> ${prefix}bot off — apagar tu sub-bot`;

export default new ZenCommand('bot')
  .addAlias('botonoff')
  .setCooldown(3)
  .setCategory('jadibot')
  .setUsage('on | off')
  .onExecute(async (ctx) => {
    const prefix = ZenConfig.prefix;
    const action = String(ctx.args[0] || '').toLowerCase();
    const sender = requesterNumber(ctx);
    const mainOwner = isMainOwner(sender);

    if (!['on', 'off'].includes(action)) return ctx.reply(usage(prefix));

    if (action === 'off' && String(ctx.args[1] || '').toLowerCase() === 'todos') {
      if (ctx.sock.isSubBot || !mainOwner) {
        return ctx.reply(V.perm.mainOwner('apagar todos los sub-bots'));
      }
      const total = await pauseAllSubBots();
      return ctx.reply(`『 ⏸️ 』 *SUB-BOTS APAGADOS*\n\n> Se pausaron *${total}* sub-bot(s) 😄\n> El bot principal continúa activo.`);
    }

    if (ctx.sock.isSubBot) {
      const numero = ctx.sock.subbotNumber;
      if (sender !== numero && !mainOwner) {
        return ctx.reply(V.perm.owner(numero, 'usar este control'));
      }
      if (action === 'on') {
        return ctx.reply(`『 ✅ 』 *BOT ACTIVO*\n\n> Este sub-bot (+${numero}) ya está encendido 😅`);
      }
      await ctx.reply(`『 ⏸️ 』 *BOT OFF*\n\n> Tu sub-bot (+${numero}) fue pausado solo para esta sesión 🙂\n> Encendelo desde el bot principal con *${prefix}bot on*.`);
      return pauseSubBot(numero);
    }

    const requested = digits(ctx.args[1]);
    const numero = mainOwner && requested ? requested : sender;
    if (!/^\d{8,15}$/.test(numero)) return ctx.reply(usage(prefix));

    if (action === 'off') {
      if (!isRunning(numero)) {
        return ctx.reply(`『 ℹ️ 』 *BOT OFF*\n\n> El sub-bot (+${numero}) ya estaba apagado 🙂`);
      }
      await pauseSubBot(numero);
      return ctx.reply(`『 ⏸️ 』 *BOT OFF*\n\n> Se pausó únicamente el sub-bot (+${numero}) 🙂\n> Los demás sub-bots no fueron afectados.`);
    }

    if (!hasSession(numero)) {
      return ctx.reply(`『 ⚠️ 』 *SIN SESIÓN*\n\n> No existe una sesión guardada para +${numero}. Usá *${prefix}serbot* para vincularlo 😕`);
    }
    if (isRunning(numero)) {
      return ctx.reply(`『 ✅ 』 *BOT ON*\n\n> El sub-bot (+${numero}) ya está activo 😌`);
    }

    const started = startSubBot(numero);
    if (!started) {
      return ctx.reply(`『 ⚠️ 』 *ERROR DE INICIO*\n\n> No se pudo iniciar el sub-bot (+${numero}) por límite de instancias o falta de memoria RAM en el servidor 🥺`);
    }

    return ctx.reply(`『 ▶️ 』 *BOT ON*\n\n> Se inició únicamente el sub-bot (+${numero}) 😌`);
  });