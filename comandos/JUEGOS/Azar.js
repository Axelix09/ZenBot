import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { enviarSticker } from '../../lib/game/stickers.js';

const APUESTA_MIN = 10;
const APUESTA_MAX = 5000;
const COOLDOWN_EMOJI = 10;

const ultimoDado = new Map();
const moneda = ZenConfig.currencies.zencoins.emoji;
const rnd = (n) => Math.floor(Math.random() * n);

function leerApuesta(texto) {
  if (!/^\d+$/.test(texto || '')) return null;
  const n = parseInt(texto, 10);
  if (n < APUESTA_MIN || n > APUESTA_MAX) return null;
  return n;
}

async function duelo(ctx, user, apuesta) {
  const prefix = ZenConfig.prefix;
  const tuyo = rnd(6) + 1;
  const mio = rnd(6) + 1;

  let veredicto;
  let emoji;
  if (tuyo > mio) {
    veredicto = apuesta ? `¡Ganaste! 💰 +${apuesta} ${moneda}` : '¡Ganaste!';
    emoji = '🎉';
    user.zencoins += apuesta;
  } else if (tuyo < mio) {
    veredicto = apuesta ? `Perdiste. 💸 -${apuesta} ${moneda}` : 'Perdiste.';
    emoji = '😔';
    user.zencoins -= apuesta;
  } else {
    veredicto = 'Empate, no se mueve nada.';
    emoji = '🤝';
  }

  if (apuesta) await user.save();

  await enviarSticker(ctx, 'dado', String(tuyo), { esperar: false });
  await enviarSticker(ctx, 'dado', String(mio));

  await ctx.react(emoji);
  return ctx.reply(
    `『 🎲 』 *DADO*\n\n✦ *Vos:* ${tuyo}\n✦ *Yo:* ${mio}\n\n> ${veredicto}${apuesta ? '' : `\n> _Sumá una apuesta: ${prefix}dado 100_`} 😉`
  );
}

export default new ZenCommand('dado')
  .setCooldown(8)
  .setCategory('Juegos')
  .requireRegistration()
  .setUsage('[apuesta]')
  .onExecute(async (ctx) => {
    const prefix = ZenConfig.prefix;
    const user = await ctx.getUser();
    let apuesta = 0;

    if (ctx.args.length > 0) {
      apuesta = leerApuesta(ctx.args[0]);
      if (apuesta === null) {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *APUESTA INVÁLIDA*\n\n> Entre *${APUESTA_MIN}* y *${APUESTA_MAX}* ${moneda} 🤨\n> _Ejemplo: ${prefix}dado 100_`
        );
      }
      if (user.zencoins < apuesta) {
        await ctx.react('❌');
        return ctx.reply(`『 ❌ 』 *SALDO INSUFICIENTE*\n\n> Tenés *${user.zencoins}* ${moneda} 😬`);
      }
    }

    return duelo(ctx, user, apuesta);
  });

export const dadoListener = {
  before: async (msg, sock, ctx) => {
    if (ctx.rawMsg.key.fromMe) return;

    const body = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim();
    if (body !== '🎲') return;

    const user = await ctx.getUser();
    if (!user?.registered) return;

    const ahora = Date.now();
    const previo = ultimoDado.get(ctx.sender) || 0;
    if (ahora - previo < COOLDOWN_EMOJI * 1000) return ctx.react('😡');
    ultimoDado.set(ctx.sender, ahora);

    return duelo(ctx, user, 0);
  }
};
