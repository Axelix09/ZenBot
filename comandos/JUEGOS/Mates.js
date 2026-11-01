import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

const DIFICULTADES = {
  facil: { nombre: 'FÁCIL', tiempo: 30, premio: 50, ops: ['+', '-'], rango: [1, 20], decimales: false },
  medio: { nombre: 'MEDIO', tiempo: 25, premio: 100, ops: ['+', '-', '*'], rango: [1, 50], decimales: false },
  dificil: { nombre: 'DIFÍCIL', tiempo: 25, premio: 175, ops: ['+', '-', '*', '/'], rango: [50, 500], decimales: true },
  imposible: { nombre: 'IMPOSIBLE', tiempo: 25, premio: 1500, ops: ['+', '-', '*', '/', '^', '%'], rango: [100, 999], decimales: true }
};

const ALIAS_DIF = {
  facil: 'facil', fácil: 'facil', easy: 'facil',
  medio: 'medio', medium: 'medio',
  dificil: 'dificil', difícil: 'dificil', hard: 'dificil',
  imposible: 'imposible', impossible: 'imposible', impossivel: 'imposible'
};

const partidas = new Map();
const respondiendo = new Set();

function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generarOperacion(dif) {
  const cfg = DIFICULTADES[dif];
  const op = cfg.ops[Math.floor(Math.random() * cfg.ops.length)];
  const [min, max] = cfg.rango;
  let a = rnd(min, max);
  let b = rnd(min, max);
  let expr, result;

  switch (op) {
    case '+': expr = `${a} + ${b}`; result = a + b; break;
    case '-': if (a < b) [a, b] = [b, a]; expr = `${a} - ${b}`; result = a - b; break;
    case '*': expr = `${a} × ${b}`; result = a * b; break;
    case '/': b = rnd(7, 25); a = b * rnd(5, 30); expr = `${a} ÷ ${b}`; result = a / b; break;
    case '^': a = rnd(5, 20); b = rnd(2, 4); expr = `${a} ^ ${b}`; result = Math.pow(a, b); break;
    case '%': b = rnd(7, 30); do { a = rnd(min, max); } while (a % b === 0); expr = `${a} % ${b}`; result = a % b; break;
  }

  result = cfg.decimales ? Math.round(result * 100) / 100 : Math.round(result);
  return { expr, result };
}

export default new ZenCommand('math')
  .addAlias('matematica', 'matematicas', 'mates')
  .setCooldown(3)
  .setCategory('Juegos')
  .requireRegistration()
  .setUsage('<dificultad>')
  .onExecute(async (ctx) => {
    const [dificultad] = ctx.args;
    const chatId = ctx.chat;
    const sender = ctx.sender;
    const prefix = ZenConfig.prefix;

    if (!dificultad) {
      await ctx.react('🧮');
      return ctx.reply(
        `『 🧮 』 *MATH*\n\n✦ *Dificultades:* facil | medio | dificil | imposible\n✦ *Premios:*\n  • Fácil: 50 ${ZenConfig.currencies.zencoins.emoji}\n  • Medio: 100 ${ZenConfig.currencies.zencoins.emoji}\n  • Difícil: 175 ${ZenConfig.currencies.zencoins.emoji}\n  • Imposible: 1500 ${ZenConfig.currencies.zencoins.emoji}\n\n> _Ejemplo: ${prefix}math dificil_`
      );
    }

    const difKey = ALIAS_DIF[dificultad.toLowerCase()];
    if (!difKey) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *DIFICULTAD INVÁLIDA*\n\n> Creo que te faltó algo 🤔\n> Usá: *facil | medio | dificil | imposible*`
      );
    }

    if (partidas.has(chatId)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *YA HAY UNA PREGUNTA ACTIVA*\n\n> Respondé o esperá que expire 😅`);
    }

    const cfg = DIFICULTADES[difKey];
    const { expr, result } = generarOperacion(difKey);

    const timer = setTimeout(async () => {
      if (!partidas.has(chatId)) return;
      const p = partidas.get(chatId);
      partidas.delete(chatId);
      await ctx.reply(
        `『 ⏰ 』 *TIEMPO AGOTADO*\n\n> La respuesta era *${p.respuesta}* 🫠`
      );
    }, cfg.tiempo * 1000);

    partidas.set(chatId, { respuesta: result, premio: cfg.premio, timer, iniciador: sender, dif: difKey });

    await ctx.react('🧮');
    return ctx.reply(
      `『 🧮 』 *MATH — ${cfg.nombre}*\n\n> ¿Cuánto es *${expr}*? 😌\n\n> ⏱️ Tenés *${cfg.tiempo}s* para responder sin prefijo.\n> 💰 Premio: *${cfg.premio}* ${ZenConfig.currencies.zencoins.emoji}`
    );
  });

export const mathListener = {
  before: async (msg, sock, ctx) => {
    if (ctx.rawMsg.key.fromMe) return;

    const chatId = ctx.chat;
    const sender = ctx.sender;

    if (!partidas.has(chatId)) return;

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    if (!body) return;

    const texto = body.trim();
    if (!texto || isNaN(Number(texto))) return;

    const p = partidas.get(chatId);
    const respUsuario = Math.round(Number(texto) * 100) / 100;
    const respCorrecta = p.respuesta;

    if (respondiendo.has(sender)) return;
    respondiendo.add(sender);
    setTimeout(() => respondiendo.delete(sender), 1500);

    if (respUsuario === respCorrecta) {
      clearTimeout(p.timer);
      partidas.delete(chatId);

      const user = await ctx.getUser();
      user.zencoins += p.premio;
      await user.save();

      await ctx.react('✅');
      return ctx.reply(
        `『 ✅ 』 *¡CORRECTO!*\n\n> @${ctx.sender.split('@')[0]} respondió *${respCorrecta}* ✔️\n> 💰 +${p.premio} ${ZenConfig.currencies.zencoins.emoji}`
      );
    } else {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *INCORRECTO*\n\n> Seguí intentando 🤔`
      );
    }
  }
};
