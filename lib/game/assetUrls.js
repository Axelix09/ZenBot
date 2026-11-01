import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MASCOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'assets',
  'mascota'
);
const mascotPath = (stage) => path.join(MASCOT_DIR, `${stage}.jpg`);

const ECONOMY_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'assets',
  'economia'
);
const economyPath = (name) => path.join(ECONOMY_DIR, `${name}.jpg`);

export const SHOP_ITEM_IMAGES = {
  sword: economyPath('tienda_sword'),
  potion: economyPath('tienda_potion'),
  suit: economyPath('tienda_suit'),
  mask: economyPath('tienda_mask'),
  astucia: economyPath('tienda_astucia'),
  codicia: economyPath('tienda_codicia'),
  refugio: economyPath('tienda_refugio')
};

export const EQUIPMENT_BAG_IMAGE = economyPath('equipment-bag');

export const ROD_IMAGES = {
  cana_madera: economyPath('cana_madera'),
  cana_fibra: economyPath('cana_fibra'),
  cana_carbono: economyPath('cana_carbono')
};

export const WEAPON_IMAGES = {
  lanza_rustica: economyPath('lanza_rustica'),
  arco_recursivo: economyPath('arco_recursivo'),
  ballesta_pesada: economyPath('ballesta_pesada'),
  rifle_cerrojo: economyPath('rifle_cerrojo')
};

export const WEAPON_CATALOG_IMAGE = economyPath('armas_catalogo');

export const STREAK_PET_IMAGES = {
  egg: mascotPath('egg'),
  baby: mascotPath('baby'),
  child: mascotPath('child'),
  teen: mascotPath('teen'),
  adult: mascotPath('adult'),
  guardian: mascotPath('guardian'),
  elder: mascotPath('elder'),
  celestial: mascotPath('celestial')
};

export const PICKAXE_IMAGES = {
  pico_madera: economyPath('pico_madera'),
  pico_piedra: economyPath('pico_piedra'),
  pico_hierro: economyPath('pico_hierro'),
  pico_oro: economyPath('pico_oro'),
  pico_diamante: economyPath('pico_diamante')
};

export const PICKAXE_CATALOG_IMAGE = economyPath('picos_catalogo');

export const EQUIPMENT_STATE_IMAGES = {
  pickaxe: {
    worn: economyPath('pico_madera'),
    upgraded: economyPath('pico_oro')
  },
  rod: {
    worn: economyPath('cana_madera'),
    upgraded: economyPath('cana_carbono')
  },
  weapon: {
    upgraded: economyPath('rifle_cerrojo')
  }
};

export function getPickaxeImage(id, level = 1, durability = 100, maxDurability = 100) {
  if (durability <= maxDurability * 0.25) return EQUIPMENT_STATE_IMAGES.pickaxe.worn;
  if (level > 1) return EQUIPMENT_STATE_IMAGES.pickaxe.upgraded;
  return PICKAXE_IMAGES[id] || null;
}

export function getRodImage(level = 1, durability = 100, maxDurability = 100) {
  if (durability <= maxDurability * 0.25) return EQUIPMENT_STATE_IMAGES.rod.worn;
  if (level > 1) return EQUIPMENT_STATE_IMAGES.rod.upgraded;
  return ROD_IMAGES.cana_madera;
}

export const CARD_IMAGES = {
  'casino-cards.png': economyPath('casino-cards'),
  'economy-orb.png': economyPath('economy-orb'),
  'fishing-kit.png': economyPath('fishing-kit'),
  'mining-crystal.png': economyPath('mining-crystal'),
  'rpg-hunter.png': economyPath('rpg-hunter')
};

export const getCardImage = (name) => CARD_IMAGES[name] || null;

export function getStreakPetImage(streak = 0) {
  if (streak >= 365) return STREAK_PET_IMAGES.celestial;
  if (streak >= 180) return STREAK_PET_IMAGES.elder;
  if (streak >= 90) return STREAK_PET_IMAGES.guardian;
  if (streak >= 60) return STREAK_PET_IMAGES.adult;
  if (streak >= 30) return STREAK_PET_IMAGES.teen;
  if (streak >= 14) return STREAK_PET_IMAGES.child;
  if (streak >= 7) return STREAK_PET_IMAGES.baby;
  return STREAK_PET_IMAGES.egg;
}

export function getStreakPetStage(streak = 0) {
  if (streak >= 365) return 'Lobo anciano celestial · 365 días';
  if (streak >= 180) return 'Lobo anciano · 180 días';
  if (streak >= 90) return 'Lobo guardián · 90 días';
  if (streak >= 60) return 'Lobo adulto · 60 días';
  if (streak >= 30) return 'Lobo joven · 30 días';
  if (streak >= 14) return 'Lobo adolescente · 14 días';
  if (streak >= 7) return 'Lobo niño · 7 días';
  return 'Huevo · próximo despertar';
}
