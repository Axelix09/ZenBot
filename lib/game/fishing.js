import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fishesPath = path.join(__dirname, '..', 'database', 'json', 'peces.json');
let fishesCache = null;
let fishesCacheTime = 0;
const FISHES_CACHE_TTL = 60000;

export const GEAR_RODS = {
  cana_madera: 12,
  cana_fibra: 25,
  cana_carbono: 55
};

export const GEAR_REELS = {
  carrete_oxidado: 0,
  carrete_aluminio: 0.20,
  carrete_titanio: 0.45
};

export const GEAR_LINES = {
  hilo_nylon: 'Línea de Nylon',
  hilo_trenzado: 'Línea de Hilo Trenzado',
  hilo_fluorocarbono: 'Línea de Fluorocarbono Invisible'
};

export const WEATHER_TYPES = ['Soleado', 'Lluvioso', 'Tormenta Marina', 'Niebla Densa'];

export function getFishingWeather() {
  const index = Math.floor(Date.now() / 7200000) % WEATHER_TYPES.length;
  return WEATHER_TYPES[index];
}

export function readFishes() {
  const now = Date.now();
  if (fishesCache && (now - fishesCacheTime) < FISHES_CACHE_TTL) {
    return fishesCache;
  }

  try {
    const data = fs.readFileSync(fishesPath, 'utf-8');
    const parsed = JSON.parse(data);
    fishesCache = parsed.fishes || [];
    fishesCacheTime = now;
    return fishesCache;
  } catch (err) {
    if (process.env.DEBUG) console.warn('[fishing] Error al leer peces:', err.message);
    fishesCache = [];
    fishesCacheTime = now;
    return fishesCache;
  }
}

export function drawTensionBar(tension, maxTension) {
  const pct = tension / maxTension;
  const bars = 10;
  const filled = Math.min(bars, Math.max(0, Math.round(pct * bars)));
  const empty = bars - filled;
  let barStr = '';
  for (let i = 0; i < filled; i++) {
    if (i < 4) barStr += '🟩';
    else if (i < 8) barStr += '🟨';
    else barStr += '🟥';
  }
  barStr += '⬜'.repeat(empty);
  return `[${barStr}] ${Math.round(pct * 100)}%`;
}

export function matchDepth(habitat = '', depth) {
  const h = habitat.toLowerCase();
  if (depth === 'profundo') {
    return h.includes('fosa') || h.includes('abisal') || h.includes('profunda') || 
           h.includes('mesopelágica') || h.includes('batipelágica') || h.includes('suelos marinos') || 
           h.includes('taludes') || h.includes('abismo');
  }
  if (depth === 'media') {
    return h.includes('arrecife') || h.includes('coral') || h.includes('corrientes') || 
           h.includes('medias') || h.includes('pelágicas') || h.includes('abiertas') || 
           h.includes('mares') || h.includes('océanos');
  }
  return h.includes('río') || h.includes('estanque') || h.includes('lago') || 
         h.includes('estuario') || h.includes('orilla') || h.includes('costera') || 
         h.includes('desembocadura') || h.includes('manglar') || h.includes('canal') || 
         h.includes('arrozal') || h.includes('laguna') || h.includes('charca');
}

export function matchBait(diet = '', rarity = '', bait) {
  const d = diet.toLowerCase();
  const r = rarity.toLowerCase();
  if (r === 'mistico' || r === 'legendario') {
    return bait === 'esencia';
  }
  if (bait === 'lombriz') {
    return d.includes('planctívoro') || d.includes('omnívoro') || d.includes('herbívoro') || 
           d.includes('detritívoro') || d.includes('malacófago') || d.includes('bentónico') || 
           d.includes('algívoro') || d.includes('sifonóforos') || d.includes('zooplanctón') || 
           d.includes('medusozoarios') || d.includes('microfago');
  }
  if (bait === 'senuelo') {
    return d.includes('carnívoro') || d.includes('piscívoro') || d.includes('insectívoro');
  }
  if (bait === 'carne') {
    return d.includes('depredador') || d.includes('voraz') || d.includes('cetáceo') || 
           d.includes('oportunista') || d.includes('carne');
  }
  return false;
}

export function findSuitableFish(fishes, bait, depth) {
  const pool = fishes.filter(f => matchDepth(f.habitat, depth) && matchBait(f.diet, f.rarity, bait));
  return pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
}

export const BAITS = {
  lombriz: { name: 'Lombriz de Tierra', cost: 75, lux: 0, desc: 'Ideal para peces de río pequeños y comunes.' },
  senuelo: { name: 'Señuelo Artificial', cost: 250, lux: 0, desc: 'Atrae depredadores medianos rápidos y ágiles.' },
  carne: { name: 'Trozo de Carne', cost: 600, lux: 0, desc: 'Atrae depredadores grandes y agresivos del fondo.' },
  esencia: { name: 'Esencia Sagrada', cost: 3000, lux: 8, desc: 'Esencial para atraer peces míticos o prehistóricos.' }
};

export const UTILITIES = {
  arpon: { name: 'Arpón Táctico de Caza', cost: 1500, lux: 0, desc: 'Arma de un solo uso en batalla. Causa 80 DMG instantáneos al pez.' },
  sonar: { name: 'Sonar Ultrasónico de Arrecife', cost: 4500, lux: 100, desc: 'Equipamiento pasivo. Incrementa un +15% de acierto al lanzar.' },
  red_arrastre: { name: 'Red de Arrastre de Fondo', cost: 3000, lux: 0, desc: 'Objeto consumible. Permite capturar un pez básico/común extra al ganar.' }
};

export const FISHING_GEAR = {
  rods: {
    cana_fibra: { name: 'Caña de Fibra de Vidrio', dmg: 25, cost: 8000, lux: 150 },
    cana_carbono: { name: 'Caña de Fibra de Carbono', dmg: 55, cost: 30000, lux: 800 }
  },
  reels: {
    carrete_aluminio: { name: 'Carrete de Aluminio', damp: 0.20, cost: 6000, lux: 120 },
    carrete_titanio: { name: 'Carrete de Titanio Mecanizado', damp: 0.45, cost: 25000, lux: 600 }
  },
  lines: {
    hilo_trenzado: { name: 'Línea de Hilo Trenzado', maxT: 135, cost: 9000, lux: 200 },
    hilo_fluorocarbono: { name: 'Línea de Fluorocarbono Invisible', maxT: 175, cost: 28000, lux: 750 }
  }
};