import { SLOT_MS, seededRng } from './bolsa.js';

export const MAX_ITEMS = 30;
export const MAX_LEVEL = 5;
export const SWITCH_COST = 500;
export const FAKE_CHANCE = 0.12;
export const FAKE_FACTOR = 0.25;
export const APPRAISAL_RATE = 0.05;
export const APPRAISAL_MIN = 20;

export const REPUTATION_LEVELS = [
  { min: -50, name: 'Estafador', discount: -0.3, color: '💀' },
  { min: -20, name: 'Sospechoso', discount: -0.15, color: '👀' },
  { min: 0, name: 'Desconocido', discount: 0, color: '😐' },
  { min: 20, name: 'Confiable', discount: 0.1, color: '🤝' },
  { min: 50, name: 'Mercader', discount: 0.2, color: '🛒' },
  { min: 80, name: 'Magnate', discount: 0.3, color: '👑' }
];

export const SPECIALIZATIONS = {
  antiguedades: { name: '🕰️ Antigüedades', perLevel: 0.06, text: (b) => `+${b}% de precio al vender` },
  tecnologia: { name: '💻 Tecnología', perLevel: 0.12, text: (b) => `${b}% de esquivar réplicas al comprar` },
  joyas: { name: '💎 Joyas', perLevel: 0.06, text: (b) => `tasaciones ${b}% más precisas` },
  arte: { name: '🎨 Arte', perLevel: 0.1, text: (b) => `+${b}% de detectar réplicas al tasar` },
  animales: { name: '🐾 Animales', perLevel: 0.03, text: (b) => `+${b}% de que el vendedor acepte` }
};

export const ITEMS = [
  { id: 'reloj_oro', name: '⌚ Reloj de Oro', value: [80, 500], type: 'antiguedades' },
  { id: 'cuadro', name: '🖼️ Cuadro de Artista', value: [150, 800], type: 'arte' },
  { id: 'guitarra', name: '🎸 Guitarra Autografiada', value: [100, 600], type: 'arte' },
  { id: 'iphone', name: '📱 iPhone Última Gen', value: [200, 1000], type: 'tecnologia' },
  { id: 'perfume', name: '🧴 Perfume de Lujo', value: [50, 400], type: 'joyas' },
  { id: 'perro', name: '🐕 Perro de Raza', value: [150, 700], type: 'animales' },
  { id: 'collar', name: '💎 Collar de Diamantes', value: [300, 1500], type: 'joyas' },
  { id: 'zapatillas', name: '👟 Zapatillas Limitadas', value: [200, 800], type: 'tecnologia' },
  { id: 'reloj_antiguo', name: '⌛ Reloj Antiguo', value: [250, 1200], type: 'antiguedades' },
  { id: 'escultura', name: '🗿 Escultura de Mármol', value: [300, 2000], type: 'arte' }
];

export const getReputationLevel = (rep) => {
  let level = REPUTATION_LEVELS[0];
  for (const l of REPUTATION_LEVELS) {
    if (rep >= l.min) level = l;
  }
  return level;
};

export const getSpec = (user) => {
  const id = user.market?.specialization;
  const spec = SPECIALIZATIONS[id];
  if (!spec) return { id: null, spec: null, level: 0, bonus: 0 };
  const level = Math.min(MAX_LEVEL, Math.max(1, user.market?.specializationLevel || 1));
  return { id, spec, level, bonus: Math.round(spec.perLevel * level * 100) / 100 };
};

export const bonusPercent = (bonus) => Math.round(bonus * 100);

export const levelUpCost = (level) => 1000 * level;

export const ensureMarket = (user) => {
  if (!user.market) user.market = {};
  if (!user.market.collection) user.market.collection = {};
  return user.market;
};

export const sortedCollection = (collection) =>
  Object.entries(collection || {}).sort((a, b) => (a[1].boughtAt || 0) - (b[1].boughtAt || 0));

export const resolveItem = (collection, raw) => {
  if (!raw) return null;
  const entries = sortedCollection(collection);
  if (/^\d+$/.test(raw)) {
    const index = parseInt(raw, 10);
    return index >= 1 && index <= entries.length ? entries[index - 1] : null;
  }
  return collection?.[raw] ? [raw, collection[raw]] : null;
};

export const positionOf = (collection, id) => sortedCollection(collection).findIndex(([key]) => key === id) + 1;

export const totalPaid = (collection) =>
  Object.values(collection || {}).reduce((sum, item) => sum + (item.paid || 0), 0);

export const appraisalFee = (item) => Math.max(APPRAISAL_MIN, Math.floor((item.paid || 0) * APPRAISAL_RATE));

const DEMAND_LEVELS = [0.8, 0.9, 1.0, 1.0, 1.15, 1.3];

export const getDemand = (now = Date.now()) => {
  const slot = Math.floor(now / SLOT_MS);
  const demand = {};
  Object.keys(SPECIALIZATIONS).forEach((type, index) => {
    const rng = seededRng(slot * 31 + index + 7);
    demand[type] = DEMAND_LEVELS[Math.floor(rng() * DEMAND_LEVELS.length)];
  });
  return { demand, endsAt: (slot + 1) * SLOT_MS };
};

export const demandEmoji = (multiplier) => (multiplier > 1.05 ? '📈' : multiplier < 0.95 ? '📉' : '➖');

export const demandSummary = (demand) =>
  Object.entries(SPECIALIZATIONS)
    .map(([type, spec]) => `${spec.name.split(' ')[0]} ${demandEmoji(demand[type])} x${demand[type].toFixed(2)}`)
    .join('  |  ');
