import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import {
  startSubBot, isRunning, hasSession, countRunning, getLimit,
  requesterNumber, isMainOwner, mainNumber, digits
} from '../../lib/services/subbots.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default new ZenCommand('serbot')
  .addAlias('code', 'jadibot', 'subbot')
  .setCooldown(10)
  .setCategory('jadibot')
  .setUsage('')
  .onExecute(async (ctx) => {
    const prefix = ZenConfig.prefix;

    if (ctx.sock.isSubBot) {
      return ctx.reply(
        `『 ⚠️ 』 *SOLO BOT PRINCIPAL*\n\n` +
        `> Este comando solo se puede usar en el bot oficial 😉\n` +
        `> 👉 Escribí aquí: wa.me/${mainNumber()}?text=${prefix}serbot`
      );
    }

    const sender = requesterNumber(ctx);
    const requested = digits(ctx.args[0]);
    const unresolved = !sender;
    const numero = (isMainOwner(sender) || unresolved) && requested ? requested : sender;

    if (!/^\d{8,15}$/.test(numero)) {
      if (unresolved) {
        return ctx.reply(
          `『 ⚠️ 』 *NÚMERO NO DETECTADO*\n\n` +
          `> WhatsApp no me permitió leer tu número automáticamente 🙂\n` +
          `> Escribilo manualmente con código de país, sin + ni espacios:\n` +
          `> *${prefix}serbot 5491112345678*`
        );
      }
      return ctx.reply(`『 ⚠️ 』 *NÚMERO NO VÁLIDO*\n\n> No pude leer tu número de WhatsApp. Probá de nuevo desde un chat privado con el bot 😌`);
    }

    if (isRunning(numero)) {
      return ctx.reply(`『 ⚠️ 』 *SESIÓN ACTIVA*\n\n> Ya tenés un sub-bot funcionando 😅\n> Usá *${prefix}stopbot* para pausarlo.`);
    }

    if (countRunning() >= getLimit()) {
      return ctx.reply(`『 ❌ 』 *LÍMITE ALCANZADO*\n\n> No se pueden conectar más de ${getLimit()} sub-bots en este servidor 😌`);
    }

    const reconnecting = hasSession(numero);
    await ctx.react('🤖');

    const entry = startSubBot(numero, {
      onCode: async (formatted) => {
        await ctx.reply(
          `『 🤖 』 *SUB-BOT*\n\n` +
          `> ✦ *Paso 1:* Abrí WhatsApp > Dispositivos vinculados.\n` +
          `> ✦ *Paso 2:* Tocá "Vincular con número de teléfono".\n` +
          `> ✦ *Paso 3:* Escribí el código que aparece abajo.\n\n` +
          `> ⏳ El código dura 2 minutos.`
        );
        await sleep(1000);
        await ctx.reply(formatted);
      },
      onOpen: () => ctx.reply(
        reconnecting
          ? `『 ✅ 』 *SUB-BOT ACTIVO*\n\n> Tu sub-bot ya está operando 😅`
          : `『 ✅ 』 *CONEXIÓN EXITOSA*\n\n> Tu sub-bot ya está activo. Te envié un mensaje a tu chat personal 😎`
      ),
      onExpire: () => ctx.reply(`『 ⏳ 』 *TIEMPO AGOTADO*\n\n> No pusiste el código a tiempo. Volvé a usar *${prefix}serbot* 🫠`),
      onClosed: (reason) => ctx.reply(`『 ⚠️ 』 *SESIÓN CERRADA*\n\n> No pude mantener la sesión del sub-bot (+${numero}) 😄\n> Motivo: ${reason}`)
    });

    if (!entry) {
      return ctx.reply(
        `『 ⚠️ 』 *NO DISPONIBLE*\n\n` +
        `> El servidor no tiene recursos de memoria suficientes en este momento para alojar otro sub-bot. Probá más tarde 🥺`
      );
    }

    return ctx.reply(
      reconnecting
        ? `『 ♻️ 』 *RECONECTANDO*\n\n> Levantando tu sesión guardada, aguardá un momento 😌`
        : `『 ⏳ 』 *PROCESANDO*\n\n> Generando un código de vinculación para +${numero} 😄`
    );
  });