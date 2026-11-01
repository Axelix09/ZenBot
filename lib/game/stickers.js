import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { addExif } from '../media/sticker.js';

const DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'assets',
  'juegos'
);

const MAX_CACHE = 8;
const MARGEN = 300;
const ESPERA_MIN = 800;
const ESPERA_MAX = 4000;
const cache = new Map();

function duracionWebp(buffer) {
  let total = 0;
  let pos = 12;
  while (pos + 8 <= buffer.length) {
    const tipo = buffer.toString('ascii', pos, pos + 4);
    const tam = buffer.readUInt32LE(pos + 4);
    if (tipo === 'ANMF' && pos + 8 + 15 <= buffer.length) {
      total += buffer.readUIntLE(pos + 8 + 12, 3);
    }
    pos += 8 + tam + (tam % 2);
  }
  return total;
}

export async function cargarSticker(juego, nombre) {
  const clave = `${juego}/${nombre}`;
  const guardado = cache.get(clave);
  if (guardado) {
    cache.delete(clave);
    cache.set(clave, guardado);
    return guardado;
  }

  const crudo = await readFile(path.join(DIR, juego, `${nombre}.webp`));
  const sticker = {
    buffer: await addExif(crudo, 'ZenBot Juegos', 'ZenBot'),
    duracion: duracionWebp(crudo)
  };

  cache.set(clave, sticker);
  if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
  return sticker;
}

export async function enviarSticker(ctx, juego, nombre, { esperar = true } = {}) {
  try {
    const { buffer, duracion } = await cargarSticker(juego, nombre);
    await ctx.sock.sendMessage(ctx.chat, { sticker: buffer }, { quoted: ctx.rawMsg });
    if (esperar) {
      const ms = Math.min(Math.max(duracion + MARGEN, ESPERA_MIN), ESPERA_MAX);
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
    return true;
  } catch {
    return false;
  }
}
