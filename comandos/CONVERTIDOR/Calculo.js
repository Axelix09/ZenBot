import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

const MATH_FUNCS = {
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, ceil: Math.ceil,
  floor: Math.floor, round: Math.round, log: Math.log, log2: Math.log2,
  log10: Math.log10, sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan, sinh: Math.sinh,
  cosh: Math.cosh, tanh: Math.tanh, exp: Math.exp, pow: Math.pow,
  max: Math.max, min: Math.min, sign: Math.sign, trunc: Math.trunc,
  hypot: Math.hypot,
  factorial: (n) => { if (n < 0 || n > 170) return NaN; let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }
};

const MATH_CONSTS = { PI: Math.PI, E: Math.E, LN2: Math.LN2, LN10: Math.LN10, SQRT2: Math.SQRT2 };

function calcular(expr) {
  let e = expr.trim()
    .replace(/\^/g, '**')
    .replace(/(\d+)!/g, 'factorial($1)')
    .replace(/(\d+)\s*%\s*(\d+)/g, '($1/100*$2)')
    .replace(/\bpi\b/gi, 'PI')
    .replace(/\be\b/g, 'E');

  if (!/^[\d+\-*/().,\s%^!a-zA-Z_]+$/.test(e)) return null;

  const fn = new Function(
    ...Object.keys(MATH_FUNCS),
    ...Object.keys(MATH_CONSTS),
    `"use strict";return (${e})`
  );
  const res = fn(...Object.values(MATH_FUNCS), ...Object.values(MATH_CONSTS));
  if (!isFinite(res)) return null;
  return +parseFloat(res.toPrecision(12));
}

function buildPasos(expr) {
  const steps = [];
  if (/[a-zA-Z]/.test(expr)) steps.push('✦ Funciones identificadas');
  if (/\*\*|\^/.test(expr)) steps.push('✦ Potencias calculadas');
  if (/\(/.test(expr)) steps.push('✦ Paréntesis resueltos');
  if (/%/.test(expr)) steps.push('✦ Porcentajes expandidos');
  steps.push('✦ Operaciones: × ÷ antes que + −');
  return steps.map(s => `  • ${s}`).join('\n');
}

export default new ZenCommand('calc')
  .addAlias('calcular', 'calculator')
  .setCooldown(3)
  .setCategory('convertidores')
  .requireRegistration()
  .setUsage('<expresión>')
  .onExecute(async (ctx) => {
    const expr = ctx.args.join(' ');
    const prefix = ZenConfig.prefix;

    if (!expr) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *EXPRESIÓN REQUERIDA*\n\n` +
        `> Indicá una expresión matemática para calcular 🤔\n` +
        `> _Ejemplo: ${prefix}calc 2 + 2 * 10_`
      );
    }

    try {
      const res = calcular(expr);
      if (res === null) {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *EXPRESIÓN INVÁLIDA*\n\n` +
          `> Revisá la expresión ingresada 😵‍💫`
        );
      }

      await ctx.react('🧮');
      return ctx.reply(
        `『 🧮 』 *CALCULADORA*\n\n` +
        `✦ *Expresión:* \`${expr}\`\n` +
        `✦ *Resultado:* \`${res}\`\n\n` +
        `✦ *Pasos:*\n${buildPasos(expr)}`
      );
    } catch {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR DE CÁLCULO*\n\n` +
        `> Ocurrió un error al procesar la expresión 😵`
      );
    }
  });