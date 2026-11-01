import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { enviarSticker } from '../../lib/game/stickers.js';

const COOLDOWN = 30;

const JUEGOS = [
  {
    nombre: 'tiro',
    alias: ['dardo', 'diana', 'blanco'],
    emoji: '🎯',
    titulo: 'TIRO AL BLANCO',
    carpeta: 'tiro',
    resultados: [
      { p: 40, premio: 0, sticker: 'fallo', texto: 'Fallaste, el dardo ni rozó el blanco.' },
      { p: 25, premio: 10, sticker: '10', texto: 'Rozaste el borde del blanco.' },
      { p: 20, premio: 30, sticker: '30', texto: 'Anillo exterior, nada mal.' },
      { p: 10, premio: 50, sticker: '50', texto: 'Anillo medio, bien ahí.' },
      { p: 4, premio: 70, sticker: '70', texto: 'Casi en el centro, qué puntería.' },
      { p: 1, premio: 100, sticker: 'centro', texto: '¡Premio mayor! Justo en el centro.' }
    ]
  },
  {
    nombre: 'bolos',
    alias: ['bolo', 'boliche'],
    emoji: '🎳',
    titulo: 'BOLOS',
    carpeta: 'bolos',
    resultados: [
      { p: 40, premio: 0, sticker: 'fallo', texto: 'La bola pasó de largo, no tumbaste ninguno.' },
      { p: 25, premio: 10, sticker: '10', texto: 'Tumbaste un solo bolo.' },
      { p: 20, premio: 20, sticker: '20', texto: 'Cayeron algunos, pero quedaron varios.' },
      { p: 10, premio: 60, sticker: '60', texto: 'Dejaste pocos de pie.' },
      { p: 4, premio: 80, sticker: '80', texto: 'Solo te quedó uno parado, qué lástima.' },
      { p: 1, premio: 100, sticker: 'pleno', texto: '¡Pleno! Chuza perfecta.' }
    ]
  },
  {
    nombre: 'basket',
    alias: ['basquet', 'baloncesto', 'canasta'],
    emoji: '🏀',
    titulo: 'BÁSQUET',
    carpeta: 'basket',
    resultados: [
      { p: 30, premio: 0, sticker: 'fallo1', texto: 'Tiro corto, ni rozó el aro.' },
      { p: 20, premio: 0, sticker: 'fallo2', texto: 'Pegó en el aro y se fue afuera.' },
      { p: 15, premio: 0, sticker: 'fallo3', texto: 'Rebotó en el borde y no entró.' },
      { p: 25, premio: 50, sticker: '50', texto: '¡Adentro! Canasta de dos.' },
      { p: 10, premio: 100, sticker: '100', texto: '¡Triple limpio, solo red!' }
    ]
  },
  {
    nombre: 'futbol',
    alias: ['penal', 'gol', 'soccer'],
    emoji: '⚽',
    titulo: 'PENAL',
    carpeta: 'futbol',
    resultados: [
      { p: 50, premio: 0, sticker: 'fallo', texto: 'La mandaste a las nubes, afuera.' },
      { p: 15, premio: 0, sticker: 'poste', texto: 'Pegó en el poste, qué mala suerte.' },
      { p: 25, premio: 50, sticker: '50', texto: '¡Gol! Al medio, el arquero se quedó pagando.' },
      { p: 8, premio: 75, sticker: '75', texto: '¡Golazo cruzado al palo derecho!' },
      { p: 2, premio: 100, sticker: '100', texto: '¡Gol de otro planeta, al rincón!' }
    ]
  }
];

const ultimoTiro = new Map();
const porEmoji = new Map(JUEGOS.map((j) => [j.emoji, j]));
const moneda = ZenConfig.currencies.zencoins.emoji;

function sortear(resultados) {
  const total = resultados.reduce((acc, r) => acc + r.p, 0);
  let punto = Math.random() * total;
  for (const r of resultados) {
    punto -= r.p;
    if (punto < 0) return r;
  }
  return resultados[resultados.length - 1];
}

async function jugar(ctx, cfg, silencioso) {
  const ahora = Date.now();
  const previo = ultimoTiro.get(ctx.sender) || 0;
  const faltan = Math.ceil((previo + COOLDOWN * 1000 - ahora) / 1000);

  if (faltan > 0) {
    if (silencioso) return ctx.react('😡');
    await ctx.react('⏳');
    return ctx.reply(`『 ⏳ 』 *CALMA*\n\n> Podés volver a tirar en *${faltan}s* 😌`);
  }

  ultimoTiro.set(ctx.sender, ahora);

  const resultado = sortear(cfg.resultados);

  if (resultado.premio > 0) {
    const user = await ctx.getUser();
    user.zencoins += resultado.premio;
    await user.save();
  }

  await enviarSticker(ctx, cfg.carpeta, resultado.sticker);
  await ctx.react(resultado.premio > 0 ? '🎉' : cfg.emoji);
  return ctx.reply(
    `『 ${cfg.emoji} 』 *${cfg.titulo}*\n\n> ${resultado.texto} 😄\n> 💰 ${resultado.premio > 0 ? `+${resultado.premio} ${moneda}` : 'Sin premio'}`
  );
}

function crear(cfg) {
  return new ZenCommand(cfg.nombre)
    .addAlias(...cfg.alias)
    .setCooldown(3)
    .setCategory('Juegos')
    .requireRegistration()
    .onExecute((ctx) => jugar(ctx, cfg, false));
}

export default crear(JUEGOS[0]);
export const cmdBolos = crear(JUEGOS[1]);
export const cmdBasket = crear(JUEGOS[2]);
export const cmdFutbol = crear(JUEGOS[3]);

export const deportesListener = {
  before: async (msg, sock, ctx) => {
    if (ctx.rawMsg.key.fromMe) return;

    const body = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim();
    const cfg = porEmoji.get(body);
    if (!cfg) return;

    const user = await ctx.getUser();
    if (!user?.registered) return;

    return jugar(ctx, cfg, true);
  }
};
