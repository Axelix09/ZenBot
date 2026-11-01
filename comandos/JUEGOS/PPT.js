import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

const MOVES = { piedra: 'piedra', papel: 'papel', tijera: 'tijera', rock: 'piedra', paper: 'papel', scissors: 'tijera' };
const EMOJIS = { piedra: '✊ Piedra', papel: '✋ Papel', tijera: '✌️ Tijera' };
const IA_MOVES = ['piedra', 'papel', 'tijera'];

const partidas = new Map();

function ganador(a, b) {
  if (a === b) return 'empate';
  if ((a === 'piedra' && b === 'tijera') || (a === 'papel' && b === 'piedra') || (a === 'tijera' && b === 'papel')) return 'a';
  return 'b';
}

export default new ZenCommand('ppt')
  .addAlias('rps', 'jkp', 'piedrapapeltijera')
  .setCooldown(3)
  .setCategory('Juegos')
  .requireRegistration()
  .setUsage('ia|@usuario [apuesta]')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const args = ctx.args;
    const chatId = ctx.chat;
    const sender = ctx.sender;
    const prefix = ZenConfig.prefix;

    if (partidas.has(chatId)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *PARTIDA ACTIVA*\n\n> Ya hay una partida de PPT en curso 😏`);
    }

    if (!args.length) {
      await ctx.react('✊');
      return ctx.reply(
        `『 ✊ 』 *Piedra Papel Tijera*\n\n✦ *Vs IA:* ${prefix}ppt ia\n✦ *Vs Usuario:* ${prefix}ppt @usuario [apuesta]\n\n> _Ejemplo: ${prefix}ppt ia_\n> _Ejemplo: ${prefix}ppt @usuario 500_`
      );
    }

    const arg0 = args[0].toLowerCase();

    if (['ia', 'ai', 'bot'].includes(arg0)) {
      partidas.set(chatId, { vsIA: true, jugador1: sender, apuesta: 0, esperando: false });
      await ctx.react('✊');
      return ctx.reply(
        `『 ✊ 』 *PPT VS IA*\n\n> Elegí tu jugada sin usar prefijo:\n> *piedra* | *papel* | *tijera* 🙂`
      );
    }

    const rival = ctx.mentions?.[0] || null;
    if (!rival) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *USO CORRECTO*\n\n> ${prefix}ppt ia — vs IA 😌\n> ${prefix}ppt @usuario [apuesta] — vs jugador`
      );
    }

    if (rival === sender) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *AUTO-PARTIDA*\n\n> No podés jugar contra vos mismo 🙂`);
    }

    const betArg = args.find(a => /^\d+$/.test(a));
    const apuesta = betArg ? parseInt(betArg) : 0;

    if (apuesta > 0) {
      if (!user.registered) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *NO REGISTRADO*\n\n> Necesitás estar registrado para apostar 🥲`);
      }
      if (user.zencoins < apuesta) {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *SIN FONDOS*\n\n> Tenés *${user.zencoins}* ${ZenConfig.currencies.zencoins.emoji} y apostás *${apuesta}* 🫣`
        );
      }
    }

    const rivalUser = await ctx.getUserById(rival);
    if (apuesta > 0 && rivalUser.zencoins < apuesta) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *RIVAL SIN FONDOS*\n\n> @${rival.split('@')[0]} tiene *${rivalUser.zencoins}* ${ZenConfig.currencies.zencoins.emoji} 🫣`
      );
    }

    if (apuesta > 0) {
      user.zencoins -= apuesta;
      await user.save();
    }

    partidas.set(chatId, {
      vsIA: false,
      jugador1: sender,
      jugador2: rival,
      apuesta,
      esperando: true,
      eleccion1: null,
      eleccion2: null,
      groupChat: chatId
    });

    const timer = setTimeout(async () => {
      if (!partidas.has(chatId)) return;
      const p = partidas.get(chatId);
      if (!p.esperando) return;
      partidas.delete(chatId);

      if (p.apuesta > 0) {
        const ret = await ctx.getUser();
        ret.zencoins += p.apuesta;
        await ret.save();
      }

      const devTxt = p.apuesta > 0 ? `\n> Se devolvieron *${p.apuesta}* ${ZenConfig.currencies.zencoins.emoji} a @${p.jugador1.split('@')[0]}` : '';
      await ctx.reply(
        `『 ⏱️ 』 *TIEMPO AGOTADO*\n\n> @${rival.split('@')[0]} no respondió el reto de @${sender.split('@')[0]}.${devTxt} 😴`
      );
    }, 30000);

    partidas.get(chatId).timer = timer;

    let txt = `『 ✊ 』 *RETO DE PPT*\n\n> @${sender.split('@')[0]} retó a @${rival.split('@')[0]} 🙂`;
    if (apuesta > 0) txt += `\n> Apuesta: *${apuesta}* ${ZenConfig.currencies.zencoins.emoji} c/u — el ganador se lleva *${apuesta * 2}*`;
    txt += `\n\n> @${rival.split('@')[0]}, escribí *+aceptarppt* o *+rechazarppt*.\n> ⏱️ *30s* para aceptar.`;

    await ctx.reply(txt);
  });

export const cmdAceptarPPT = new ZenCommand('aceptarppt')
  .addAlias('acceptppt', 'aceitarppt')
  .setCategory('Juegos')
  .setHidden(true)
  .requireRegistration()
  .onExecute(async (ctx) => {
    const chatId = ctx.chat;
    const sender = ctx.sender;

    if (!partidas.has(chatId)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SIN RETO ACTIVO*`);
    }

    const p = partidas.get(chatId);
    if (p.jugador2 !== sender) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *NO ES TU RETO*`);
    }

    if (!p.esperando) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *RETO YA ACEPTADO*`);
    }

    clearTimeout(p.timer);

    if (p.apuesta > 0) {
      const rivalUser = await ctx.getUser();
      if (rivalUser.zencoins < p.apuesta) {
        const dev = await ctx.getUserById(p.jugador1);
        dev.zencoins += p.apuesta;
        await dev.save();
        partidas.delete(chatId);
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *SIN FONDOS*\n\n> @${sender.split('@')[0]} no tiene *${p.apuesta}* ${ZenConfig.currencies.zencoins.emoji}. Partida cancelada 🫣`
        );
      }
      rivalUser.zencoins -= p.apuesta;
      await rivalUser.save();
    }

    p.esperando = false;
    p.eleccion1 = null;
    p.eleccion2 = null;
    partidas.set(chatId, p);

    await ctx.react('✅');
    return ctx.reply(
      `『 ✅ 』 *PARTIDA INICIADA*\n\n> @${p.jugador1.split('@')[0]} vs @${sender.split('@')[0]} 😌\n> Envíen su elección sin prefijo:\n> *piedra* | *papel* | *tijera*\n` +
      (p.apuesta > 0 ? `> Apuesta: *${p.apuesta}* ${ZenConfig.currencies.zencoins.emoji} c/u` : '')
    );
  });

export const cmdRechazarPPT = new ZenCommand('rechazarppt')
  .addAlias('declineppt', 'recusarppt')
  .setCategory('Juegos')
  .setHidden(true)
  .requireRegistration()
  .onExecute(async (ctx) => {
    const chatId = ctx.chat;
    const sender = ctx.sender;

    if (!partidas.has(chatId)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SIN RETO ACTIVO*`);
    }

    const p = partidas.get(chatId);
    if (p.jugador2 !== sender) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *NO ES TU RETO*`);
    }

    clearTimeout(p.timer);

    if (p.apuesta > 0) {
      const dev = await ctx.getUserById(p.jugador1);
      dev.zencoins += p.apuesta;
      await dev.save();
    }

    partidas.delete(chatId);
    await ctx.react('❌');
    return ctx.reply(
      `『 ❌ 』 *RETO RECHAZADO*\n\n> @${sender.split('@')[0]} rechazó la partida.` +
      (p.apuesta > 0 ? `\n> Se devolvieron *${p.apuesta}* ${ZenConfig.currencies.zencoins.emoji} 😢` : '')
    );
  });

export const pptListener = {
  before: async (msg, sock, ctx) => {
    if (ctx.rawMsg.key.fromMe) return;

    const chatId = ctx.chat;
    const sender = ctx.sender;
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    if (!body) return;

    const texto = body.trim().toLowerCase();
    if (!partidas.has(chatId)) return;

    const p = partidas.get(chatId);

    if (p.vsIA) {
      if (sender !== p.jugador1) return;
      const mov = MOVES[texto];
      if (!mov) return;

      const iaMove = IA_MOVES[Math.floor(Math.random() * 3)];
      const res = ganador(mov, iaMove);
      partidas.delete(chatId);

      let icon, txt;
      if (res === 'empate') { icon = '🤝'; txt = '¡Empate! 🤝'; } else if (res === 'a') { icon = '🏆'; txt = '¡Ganaste! 🏆'; } else { icon = '❌'; txt = 'Perdiste 😞'; }

      return ctx.reply(
        `『 ${icon} 』 *PPT — VS IA*\n\n> Vos: *${EMOJIS[mov]}*\n> IA: *${EMOJIS[iaMove]}*\n> ${txt} 😉`
      );
    }

    if (!p.esperando) {
      if (sender !== p.jugador1 && sender !== p.jugador2) return;
      const mov = MOVES[texto];
      if (!mov) return;

      if (sender === p.jugador1 && !p.eleccion1) {
        p.eleccion1 = mov;
        partidas.set(chatId, p);
        await ctx.reply(`『 ✅ 』 *ELECCIÓN REGISTRADA*\n\n> Esperando al rival 😄`);
        if (p.eleccion2) await resolverPvP(ctx, p, chatId);
        return;
      }

      if (sender === p.jugador2 && !p.eleccion2) {
        p.eleccion2 = mov;
        partidas.set(chatId, p);
        await ctx.reply(`『 ✅ 』 *ELECCIÓN REGISTRADA*\n\n> Esperando al rival 😄`);
        if (p.eleccion1) await resolverPvP(ctx, p, chatId);
        return;
      }
    }
  }
};

async function resolverPvP(ctx, p, partidaChatId) {
  partidas.delete(partidaChatId);
  const res = ganador(p.eleccion1, p.eleccion2);
  const j1n = p.jugador1.split('@')[0];
  const j2n = p.jugador2.split('@')[0];

  let icon, txtRes, extra = '';

  if (res === 'empate') {
    icon = '🤝';
    txtRes = '¡Empate! 🤝';
    if (p.apuesta > 0) {
      const u1 = await ctx.getUserById(p.jugador1);
      const u2 = await ctx.getUserById(p.jugador2);
      u1.zencoins += p.apuesta;
      u2.zencoins += p.apuesta;
      await u1.save();
      await u2.save();
      extra = `\n> Se devuelven *${p.apuesta}* ${ZenConfig.currencies.zencoins.emoji} a cada uno`;
    }
  } else {
    const ganadorJid = res === 'a' ? p.jugador1 : p.jugador2;
    const perdedorJid = res === 'a' ? p.jugador2 : p.jugador1;
    icon = '🏆';
    txtRes = `¡@${ganadorJid.split('@')[0]} ganó! 🏆`;

    if (p.apuesta > 0) {
      const win = await ctx.getUserById(ganadorJid);
      win.zencoins += p.apuesta * 2;
      await win.save();
      extra = `\n> 💰 *+${p.apuesta * 2}* ${ZenConfig.currencies.zencoins.emoji} para @${ganadorJid.split('@')[0]}`;
    }
  }

  await ctx.reply(
    `『 ${icon} 』 *RESULTADO PPT*\n\n> @${j1n}: *${EMOJIS[p.eleccion1]}* 😉\n> @${j2n}: *${EMOJIS[p.eleccion2]}*\n> ${txtRes}${extra}`
  );
}