import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { palabras as BANCO } from '../../lib/database/games/palabras.js';

const PREMIO_COMPLETO = 154;
const DIRECCIONES = [[1, 0], [0, 1], [1, 1], [-1, 1], [-1, 0], [0, -1], [-1, -1], [1, -1]];
const DIRECCION_NOMBRE = {
  '1,0': 'horizontal →', '-1,0': 'horizontal ←', '0,1': 'vertical ↓', '0,-1': 'vertical ↑',
  '1,1': 'diagonal ↘', '-1,1': 'diagonal ↙', '1,-1': 'diagonal ↗', '-1,-1': 'diagonal ↖'
};
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const partidas = new Map();
const moneda = ZenConfig.currencies.zencoins.emoji;
const rnd = (n) => Math.floor(Math.random() * n);
const limpiar = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
const POOL = [...new Set(BANCO.map(limpiar))].filter((p) => /^[A-Z]{4,12}$/.test(p));

const NIVELES = {
  facil: { nombre: 'FÁCIL', tam: 8, palabras: 3, tiempo: 300, premio: 77 },
  medio: { nombre: 'MEDIO', tam: 10, palabras: 4, tiempo: 300, premio: 154 },
  dificil: { nombre: 'DIFÍCIL', tam: 12, palabras: 6, tiempo: 420, premio: 270 }
};
const ALIAS_NIVEL = {
  facil: 'facil', fácil: 'facil', easy: 'facil',
  medio: 'medio', medium: 'medio', normal: 'medio',
  dificil: 'dificil', difícil: 'dificil', hard: 'dificil'
};

function mezclar(lista) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function colocar(grilla, palabra, tam) {
  for (let intento = 0; intento < 300; intento++) {
    const [dx, dy] = DIRECCIONES[rnd(DIRECCIONES.length)];
    const x = rnd(tam);
    const y = rnd(tam);
    const fx = x + dx * (palabra.length - 1);
    const fy = y + dy * (palabra.length - 1);
    if (fx < 0 || fx >= tam || fy < 0 || fy >= tam) continue;
    let libre = true;
    for (let i = 0; i < palabra.length; i++) {
      const celda = grilla[y + dy * i][x + dx * i];
      if (celda && celda !== palabra[i]) { libre = false; break; }
    }
    if (!libre) continue;
    for (let i = 0; i < palabra.length; i++) grilla[y + dy * i][x + dx * i] = palabra[i];
    return {
      inicio: [y + 1, x + 1],
      fin: [fy + 1, fx + 1],
      direccion: DIRECCION_NOMBRE[`${dx},${dy}`]
    };
  }
  return null;
}

function generar(nivel) {
  const disponibles = POOL.filter((p) => p.length <= nivel.tam);
  for (let intentoGeneracion = 0; intentoGeneracion < 500; intentoGeneracion++) {
    const ocultas = mezclar(disponibles).slice(0, nivel.palabras);
    if (ocultas.length < nivel.palabras) continue;
    const grilla = Array.from({ length: nivel.tam }, () => Array(nivel.tam).fill(''));
    const coordenadas = {};
    let correcto = true;
    for (const palabra of ocultas.sort((a, b) => b.length - a.length)) {
      const ubicacion = colocar(grilla, palabra, nivel.tam);
      if (!ubicacion) { correcto = false; break; }
      coordenadas[palabra] = ubicacion;
    }
    if (!correcto) continue;
    for (let y = 0; y < nivel.tam; y++) {
      for (let x = 0; x < nivel.tam; x++) {
        if (!grilla[y][x]) grilla[y][x] = ABC[rnd(ABC.length)];
      }
    }
    return { grilla, ocultas, coordenadas };
  }
  throw new Error('No se pudo generar la sopa');
}

function distancia(a, b) {
  const fila = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let anterior = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const actual = fila[j];
      fila[j] = a[i - 1] === b[j - 1]
        ? anterior
        : Math.min(anterior + 1, fila[j] + 1, fila[j - 1] + 1);
      anterior = actual;
    }
  }
  return fila[b.length];
}

function resolverPalabra(entrada, p) {
  const palabra = limpiar(entrada);
  if (!palabra) return null;
  const pendientes = p.restantes;
  if (pendientes.includes(palabra)) return { palabra, corregida: false };
  const cercanas = pendientes.filter((w) => {
    const maxError = w.length >= 8 ? 2 : 1;
    return Math.abs(w.length - palabra.length) <= maxError && distancia(palabra, w) <= maxError;
  });
  return cercanas.length === 1 ? { palabra: cercanas[0], corregida: true } : null;
}

function dibujar(grilla) {
  return '```\n' + grilla.map((fila) => fila.join(' ')).join('\n') + '\n```';
}

function barra(encontradas, total) {
  const llenas = Math.round((encontradas / total) * 10);
  return '▰'.repeat(llenas) + '▱'.repeat(10 - llenas);
}

function estado(p) {
  const lista = p.ocultas.map((w) => {
    if (p.encontradas.includes(w)) {
      const c = p.coordenadas[w];
      return `✅ ${w} (${c.inicio[0]},${c.inicio[1]} → ${c.fin[0]},${c.fin[1]})`;
    }
    return `▫️ ${w} (${w.length} letras)`;
  }).join('\n');
  return `✦ *Palabras escondidas:*\n${lista}\n\n✦ *Progreso:* ${barra(p.encontradas.length, p.ocultas.length)} ${p.encontradas.length}/${p.ocultas.length}\n✦ *Faltan:* ${p.restantes.length}  •  *Intentos:* ${p.intentos}`;
}

function ayuda(prefix) {
  return `『 🍜 』 *SOPA DE LETRAS*\n\n✦ *Niveles:* facil | medio | dificil\n✦ *Premios por palabra:* 77 / 154 / 270 ${moneda}\n✦ *Bono por completar:* +${PREMIO_COMPLETO} ${moneda}\n✦ *Pista:* ${prefix}sopapista\n✦ Podés enviar varias palabras juntas separadas por espacios o comas.\n\n> _Ejemplo: ${prefix}sopa dificil_`;
}

export default new ZenCommand('sopa')
  .addAlias('letras', 'sopadeletras')
  .setCooldown(5)
  .setCategory('Juegos')
  .requireRegistration()
  .setUsage('[facil | medio | dificil]')
  .onExecute(async (ctx) => {
    const chatId = ctx.chat;
    const prefix = ZenConfig.prefix;
    const argumentoNivel = String(ctx.args?.[0] || '').toLowerCase();
    if (['ayuda', 'help', 'niveles'].includes(argumentoNivel)) {
      await ctx.react('🍜');
      return ctx.reply(ayuda(prefix));
    }
    const nivelKey = argumentoNivel ? ALIAS_NIVEL[argumentoNivel] : 'medio';
    if (!nivelKey) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *NIVEL INVÁLIDO*\n\n> Eso no me cierra 😵‍💫\n> Usá: *facil | medio | dificil*`);
    }
    if (partidas.has(chatId)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *YA HAY UNA SOPA ACTIVA*\n\n> Terminá esta partida o usá *${prefix}sopafin* 😅`);
    }
    const nivel = NIVELES[nivelKey];
    const { grilla, ocultas, coordenadas } = generar(nivel);
    const timer = setTimeout(async () => {
      const p = partidas.get(chatId);
      if (!p) return;
      partidas.delete(chatId);
      await ctx.reply(`『 ⏰ 』 *TIEMPO AGOTADO*\n\n> Se pasó el tiempo 😴\n> Las palabras eran: *${p.ocultas.join(', ')}*`).catch(() => {});
    }, nivel.tiempo * 1000);
    timer.unref?.();
    const partida = { jugador: ctx.sender, nivel: nivelKey, ocultas, coordenadas, restantes: [...ocultas], encontradas: [], intentos: 0, timer, pistasUsadas: 0 };
    partidas.set(chatId, partida);
    await ctx.react('🍜');
    return ctx.reply(`『 🍜 』 *SOPA DE LETRAS — ${nivel.nombre}*\n\n${dibujar(grilla)}\n${estado(partida)}\n\n> Encontrá *${nivel.palabras}* palabras en cualquier dirección 😄\n> Podés responder varias en un solo mensaje.\n> 💰 +${nivel.premio} ${moneda} por palabra y +${PREMIO_COMPLETO} ${moneda} al completar.\n> ⏱️ Tenés *${Math.floor(nivel.tiempo / 60)} min*.`);
  });

export const cmdSopaPista = new ZenCommand('sopapista')
  .addAlias('pistasopa')
  .setCooldown(3)
  .setCategory('Juegos')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const p = partidas.get(ctx.chat);
    if (!p) return ctx.reply(`『 ⚠️ 』 *SIN SOPA ACTIVA*\n\n> Empezá una con *${ZenConfig.prefix}sopa medio* 😕`);
    if (p.jugador !== ctx.sender) return ctx.reply('『 ⚠️ 』 *NO ES TU PARTIDA*');
    const palabra = p.restantes[0];
    const c = p.coordenadas[palabra];
    p.pistasUsadas++;
    await ctx.react('💡');
    return ctx.reply(`『 💡 』 *PISTA*\n\n> Una palabra pendiente tiene ${palabra.length} letras 😄\n> Empieza en *fila ${c.inicio[0]}, columna ${c.inicio[1]}* y termina en *fila ${c.fin[0]}, columna ${c.fin[1]}*.\n> Dirección: *${c.direccion}*\n> Pistas usadas: *${p.pistasUsadas}*`);
  });

export const cmdSopaFin = new ZenCommand('sopafin')
  .addAlias('nuevasopa', 'rendirsopa')
  .setCooldown(3)
  .setCategory('Juegos')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const p = partidas.get(ctx.chat);
    if (!p) return ctx.reply(`『 ⚠️ 』 *SIN SOPA ACTIVA*\n\n> Empezá una con *${ZenConfig.prefix}sopa medio* 😕`);
    if (p.jugador !== ctx.sender) return ctx.reply('『 ⚠️ 』 *NO ES TU PARTIDA*\n\n> Solo quien la empezó puede cerrarla 🤔');
    clearTimeout(p.timer);
    partidas.delete(ctx.chat);
    await ctx.react('🏳️');
    return ctx.reply(`『 🏳️ 』 *SOPA CERRADA*\n\n> Las palabras eran: *${p.ocultas.join(', ')}*`);
  });

export const sopaListener = {
  before: async (msg, sock, ctx) => {
    if (ctx.rawMsg.key.fromMe) return;
    const p = partidas.get(ctx.chat);
    if (!p || p.jugador !== ctx.sender) return;
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    if (!body || body.startsWith(ZenConfig.prefix)) return;
    const entradas = body.split(/[\s,;|]+/).map((x) => x.trim()).filter(Boolean);
    const halladas = [];
    const correcciones = [];
    for (const entrada of entradas) {
      const resultado = resolverPalabra(entrada, p);
      if (!resultado || halladas.includes(resultado.palabra)) continue;
      p.intentos++;
      p.encontradas.push(resultado.palabra);
      p.restantes = p.restantes.filter((w) => w !== resultado.palabra);
      halladas.push(resultado.palabra);
      if (resultado.corregida) correcciones.push(`${limpiar(entrada)} → ${resultado.palabra}`);
    }
    if (!halladas.length) return;
    const completa = p.restantes.length === 0;
    const premio = halladas.length * NIVELES[p.nivel].premio + (completa ? PREMIO_COMPLETO : 0);
    const user = await ctx.getUser();
    user.zencoins += premio;
    await user.save();
    if (completa) {
      clearTimeout(p.timer);
      partidas.delete(ctx.chat);
    }
    await ctx.react(completa ? '🏆' : '✅');
    const encontrados = halladas.map((w) => `✅ ${w}`).join(', ');
    const extra = correcciones.length ? `\n> Corrección automática: ${correcciones.join(', ')}` : '';
    return ctx.reply(
      completa
        ? `『 🏆 』 *¡SOPA COMPLETA!*\n\n> Encontraste: ${encontrados}\n> 💰 +${premio} ${moneda}\n> Intentos: *${p.intentos}*${extra}`
        : `『 ✅ 』 *¡ENCONTRADAS!* ${encontrados}\n\n> 💰 +${premio} ${moneda}${extra}\n\n${estado(p)}`
    );
  }
};
