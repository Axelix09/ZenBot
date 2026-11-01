import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { palabras } from '../../lib/database/games/palabras.js';

const partidas = new Map();
const VIDAS_MAX = 6;
const PREMIO_BASE = 500;

const HORCA = [
  `  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========`,
  `  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========`,
  `  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========`,
  `  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========`,
  `  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========`,
  `  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========`,
  `  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n=========`
];

function nombreCorto(jid) { return jid.split('@')[0]; }

function elegirPalabra() {
  const entrada = palabras[Math.floor(Math.random() * palabras.length)];
  if (typeof entrada === 'string') return { palabra: entrada.toLowerCase(), categoria: null };
  return { palabra: entrada.palabra.toLowerCase(), categoria: entrada.categoria || null };
}

function esPalabraCompleta(p) {
  return p.palabra.split('').every(l => l === ' ' || p.descubiertas.has(l));
}

function calcularPremio(vidasRestantes, bonus = false) {
  const porVida = 150;
  const bonusAdi = 400;
  return PREMIO_BASE + (vidasRestantes * porVida) + (bonus ? bonusAdi : 0);
}

function dibujarEstado(p) {
  const progreso = p.palabra.split('').map(l => l === ' ' ? '  ' : (p.descubiertas.has(l) ? l : '_')).join(' ');
  const letrasUsadas = [...p.usadas].sort().join(' ') || '—';
  const vidasEmoji = '❤️'.repeat(p.vidas) + '🖤'.repeat(VIDAS_MAX - p.vidas);
  return `\`\`\`\n${HORCA[VIDAS_MAX - p.vidas]}\`\`\`\n> ${vidasEmoji}\n> \`${progreso}\`\n> Letras usadas: \`${letrasUsadas}\``;
}

function letrasRestantes(p) {
  return p.palabra.split('').filter(l => l !== ' ' && !p.descubiertas.has(l));
}

export default new ZenCommand('ahorcado')
  .addAlias('ah', 'hangman', 'forca')
  .setCooldown(3)
  .setCategory('Juegos')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const chatId = ctx.chat;
    const sender = ctx.sender;
    const prefix = ZenConfig.prefix;

    if (partidas.has(chatId)) {
      const p = partidas.get(chatId);
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *PARTIDA ACTIVA*\n\n> Ya hay una partida en marcha 😅\n> Jugador: @${nombreCorto(p.jugador)}\n> Enviá una letra sin prefijo 🤨\n> *${prefix}adivinar <palabra>*\n> *${prefix}pista* | *${prefix}rendirme*\n\n${dibujarEstado(p)}`
      );
    }

    const { palabra, categoria } = elegirPalabra();
    const p = {
      jugador: sender,
      palabra,
      categoria,
      descubiertas: new Set(),
      usadas: new Set(),
      vidas: VIDAS_MAX,
      pistas: 0,
      inicio: Date.now()
    };
    partidas.set(chatId, p);

    const premioMax = calcularPremio(VIDAS_MAX);
    await ctx.react('🪢');

    let msg = `『 🪢 』 *AHORCADO*\n\n`;
    if (categoria) msg += `✦ *Categoría:* ${categoria}\n`;
    msg += `✦ *Palabra de ${palabra.length} letras*\n`;
    msg += `✦ *Premio máximo:* ${premioMax} ${ZenConfig.currencies.zencoins.emoji}\n`;
    msg += `✦ *${prefix}pista* para revelar una letra (−1 vida)\n\n`;
    msg += `${dibujarEstado(p)}\n\n`;
    msg += `> Enviá una letra sin prefijo 😄\n> *${prefix}adivinar <palabra>* | *${prefix}rendirme*`;

    return ctx.reply(msg);
  });

export const cmdPista = new ZenCommand('pista')
  .setCategory('Juegos')
  .setHidden(true)
  .requireRegistration()
  .onExecute(async (ctx) => {
    const chatId = ctx.chat;
    const sender = ctx.sender;

    if (!partidas.has(chatId)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SIN PARTIDA*\n\n> Iniciá con *${ZenConfig.prefix}ahorcado* 😕`);
    }

    const p = partidas.get(chatId);
    if (p.jugador !== sender) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *NO ES TU PARTIDA*`);
    }

    if (p.vidas <= 1) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SIN VIDAS SUFICIENTES*\n\n> Necesitás al menos *2 vidas* para pedir pista 🥲`);
    }

    const restantes = letrasRestantes(p);
    if (!restantes.length) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *YA NO QUEDAN LETRAS*`);
    }

    const letraRevelada = restantes[Math.floor(Math.random() * restantes.length)];
    p.descubiertas.add(letraRevelada);
    p.usadas.add(letraRevelada);
    p.vidas--;
    p.pistas++;

    if (esPalabraCompleta(p)) {
      partidas.delete(chatId);
      const premio = calcularPremio(p.vidas);
      const user = await ctx.getUser();
      user.zencoins += premio;
      await user.save();

      await ctx.react('🏆');
      return ctx.reply(
        `『 🏆 』 *¡COMPLETASTE LA PALABRA!*\n\n> Palabra: *${p.palabra.toUpperCase()}*\n> Premio: +${premio} ${ZenConfig.currencies.zencoins.emoji}\n\n${dibujarEstado(p)}`
      );
    }

    partidas.set(chatId, p);
    await ctx.react('💡');
    return ctx.reply(
      `『 💡 』 *PISTA: ${letraRevelada.toUpperCase()}* (−1 vida)\n\n${dibujarEstado(p)}\n\n> Enviá una letra | *${ZenConfig.prefix}adivinar <palabra>* | *${ZenConfig.prefix}rendirme* 🙂`
    );
  });

export const cmdAdivinar = new ZenCommand('adivinar')
  .addAlias('adi', 'guess')
  .setCategory('Juegos')
  .setHidden(true)
  .requireRegistration()
  .setUsage('<palabra>')
  .onExecute(async (ctx) => {
    const chatId = ctx.chat;
    const sender = ctx.sender;
    const palabra = ctx.args.join(' ');

    if (!partidas.has(chatId)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SIN PARTIDA*\n\n> Iniciá con *${ZenConfig.prefix}ahorcado* 😕`);
    }

    const p = partidas.get(chatId);
    if (p.jugador !== sender) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *NO ES TU PARTIDA*`);
    }

    if (!palabra) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *USO*\n\n> *${ZenConfig.prefix}adivinar <palabra>* 😌`);
    }

    const intento = palabra.toLowerCase().trim();

    if (intento === p.palabra) {
      partidas.delete(chatId);
      const premio = calcularPremio(p.vidas, true);
      const user = await ctx.getUser();
      user.zencoins += premio;
      await user.save();

      await ctx.react('🏆');
      return ctx.reply(
        `『 🏆 』 *¡ADIVINASTE DE UNA!*\n\n> Palabra: *${p.palabra.toUpperCase()}*\n> Premio: +${premio} ${ZenConfig.currencies.zencoins.emoji}\n\n${dibujarEstado(p)}`
      );
    }

    p.vidas -= 2;
    if (p.vidas < 0) p.vidas = 0;

    if (p.vidas === 0) {
      partidas.delete(chatId);
      await ctx.react('💀');
      return ctx.reply(
        `『 💀 』 *INCORRECTO Y SIN VIDAS*\n\n> Creo que te faltó algo 🤔\n> La palabra era: *${p.palabra.toUpperCase()}*\n\n${dibujarEstado(p)}`
      );
    }

    partidas.set(chatId, p);
    await ctx.react('❌');
    return ctx.reply(
      `『 ❌ 』 *INCORRECTO. −2 vidas*\n\n${dibujarEstado(p)}\n\n> Enviá una letra | *${ZenConfig.prefix}adivinar <palabra>* | *${ZenConfig.prefix}rendirme* 😵‍💫`
    );
  });

export const cmdRendirme = new ZenCommand('rendirme')
  .addAlias('giveup')
  .setCategory('Juegos')
  .setHidden(true)
  .requireRegistration()
  .onExecute(async (ctx) => {
    const chatId = ctx.chat;
    const sender = ctx.sender;

    if (!partidas.has(chatId)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SIN PARTIDA*`);
    }

    const p = partidas.get(chatId);
    if (p.jugador !== sender) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *NO ES TU PARTIDA*`);
    }

    partidas.delete(chatId);
    await ctx.react('🏳️');
    return ctx.reply(
      `『 🏳️ 』 *TE RENDISTE*\n\n> La palabra era: *${p.palabra.toUpperCase()}*`
    );
  });

export const ahorcadoListener = {
  before: async (msg, sock, ctx) => {
    if (ctx.rawMsg.key.fromMe) return;
    if (!ctx.isGroup) return;

    const chatId = ctx.chat;
    const sender = ctx.sender;

    if (!partidas.has(chatId)) return;
    const p = partidas.get(chatId);
    if (p.jugador !== sender) return;

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    if (!body) return;
    if (body.startsWith(ZenConfig.prefix)) return;

    const letra = body.trim().toLowerCase();
    if (!/^\p{L}$/u.test(letra)) return;

    if (p.usadas.has(letra)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *LETRA YA USADA*\n\n> Ya enviaste la letra *${letra.toUpperCase()}* 😅`);
    }

    p.usadas.add(letra);

    if (p.palabra.includes(letra)) {
      p.descubiertas.add(letra);

      if (esPalabraCompleta(p)) {
        partidas.delete(chatId);
        const premio = calcularPremio(p.vidas);
        const user = await ctx.getUser();
        user.zencoins += premio;
        await user.save();

        await ctx.react('🏆');
        return ctx.reply(
          `『 🏆 』 *¡GANASTE!*\n\n> Palabra: *${p.palabra.toUpperCase()}*\n> Premio: +${premio} ${ZenConfig.currencies.zencoins.emoji}\n\n${dibujarEstado(p)}`
        );
      }

      partidas.set(chatId, p);
      await ctx.react('✅');
      return ctx.reply(
        `『 ✅ 』 *${letra.toUpperCase()}* está en la palabra\n\n${dibujarEstado(p)}\n\n> Enviá otra letra | *${ZenConfig.prefix}adivinar <palabra>* | *${ZenConfig.prefix}rendirme* 🙂`
      );
    } else {
      p.vidas--;

      if (p.vidas === 0) {
        partidas.delete(chatId);
        await ctx.react('💀');
        return ctx.reply(
          `『 💀 』 *PERDISTE*\n\n> Qué mala suerte 😢\n> La palabra era: *${p.palabra.toUpperCase()}*\n\n${dibujarEstado(p)}`
        );
      }

      partidas.set(chatId, p);
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *${letra.toUpperCase()}* no está en la palabra\n\n${dibujarEstado(p)}\n\n> Enviá otra letra | *${ZenConfig.prefix}adivinar <palabra>* | *${ZenConfig.prefix}rendirme* 🙂`
      );
    }
  }
};