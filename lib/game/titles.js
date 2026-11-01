import { ZenConfig } from '../../zen.config.js';

export const TITLES = {
  PESCADOR_NOVATO: {
    id: 'pescador_novato',
    name: 'Pescador Novato',
    description: 'Capturá 10 peces',
    category: 'pesca',
    emoji: '🎣',
    check: (user) => Object.values(user.capturedFishes || {}).reduce((a, b) => a + b, 0) >= 10
  },
  PESCADOR_EXPERTO: {
    id: 'pescador_experto',
    name: 'Pescador Experto',
    description: 'Capturá 100 peces',
    category: 'pesca',
    emoji: '🐟',
    check: (user) => Object.values(user.capturedFishes || {}).reduce((a, b) => a + b, 0) >= 100
  },
  PESCADOR_LEYENDA: {
    id: 'pescador_leyenda',
    name: 'Pescador Leyenda',
    description: 'Capturá 500 peces',
    category: 'pesca',
    emoji: '🏆',
    check: (user) => Object.values(user.capturedFishes || {}).reduce((a, b) => a + b, 0) >= 500
  },
  PESCADOR_MITICO: {
    id: 'pescador_mitico',
    name: 'Pescador Mítico',
    description: 'Capturá 1000 peces',
    category: 'pesca',
    emoji: '👑',
    check: (user) => Object.values(user.capturedFishes || {}).reduce((a, b) => a + b, 0) >= 1000
  },
  PESCADOR_ABISMAL: {
    id: 'pescador_abismal',
    name: 'Pescador Abismal',
    description: 'Capturá 2500 peces',
    category: 'pesca',
    emoji: '🌊',
    check: (user) => Object.values(user.capturedFishes || {}).reduce((a, b) => a + b, 0) >= 2500
  },
  PESCADOR_DIOS: {
    id: 'pescador_dios',
    name: 'Dios de la Pesca',
    description: 'Capturá 5000 peces',
    category: 'pesca',
    emoji: '⚡',
    check: (user) => Object.values(user.capturedFishes || {}).reduce((a, b) => a + b, 0) >= 5000
  },

  CAZADOR_NOVATO: {
    id: 'cazador_novato',
    name: 'Cazador Novato',
    description: 'Cazá 10 animales',
    category: 'caza',
    emoji: '🏹',
    check: (user) => Object.values(user.capturedAnimals || {}).reduce((a, b) => a + b, 0) >= 10
  },
  CAZADOR_EXPERTO: {
    id: 'cazador_experto',
    name: 'Cazador Experto',
    description: 'Cazá 50 animales',
    category: 'caza',
    emoji: '🎯',
    check: (user) => Object.values(user.capturedAnimals || {}).reduce((a, b) => a + b, 0) >= 50
  },
  CAZADOR_LEYENDA: {
    id: 'cazador_leyenda',
    name: 'Cazador Leyenda',
    description: 'Cazá 200 animales',
    category: 'caza',
    emoji: '🐺',
    check: (user) => Object.values(user.capturedAnimals || {}).reduce((a, b) => a + b, 0) >= 200
  },
  CAZADOR_MITICO: {
    id: 'cazador_mitico',
    name: 'Cazador Mítico',
    description: 'Cazá 500 animales',
    category: 'caza',
    emoji: '🦄',
    check: (user) => Object.values(user.capturedAnimals || {}).reduce((a, b) => a + b, 0) >= 500
  },
  CAZADOR_DRAGON: {
    id: 'cazador_dragon',
    name: 'Cazador de Dragones',
    description: 'Cazá 1000 animales',
    category: 'caza',
    emoji: '🐉',
    check: (user) => Object.values(user.capturedAnimals || {}).reduce((a, b) => a + b, 0) >= 1000
  },
  CAZADOR_DIOS: {
    id: 'cazador_dios',
    name: 'Dios de la Caza',
    description: 'Cazá 2500 animales',
    category: 'caza',
    emoji: '⚔️',
    check: (user) => Object.values(user.capturedAnimals || {}).reduce((a, b) => a + b, 0) >= 2500
  },

  MINERO_NOVATO: {
    id: 'minero_novato',
    name: 'Minero Novato',
    description: 'Extraé 10 minerales',
    category: 'mineria',
    emoji: '⛏️',
    check: (user) => Object.values(user.minedMinerals || {}).reduce((a, b) => a + b, 0) >= 10
  },
  MINERO_EXPERTO: {
    id: 'minero_experto',
    name: 'Minero Experto',
    description: 'Extraé 50 minerales',
    category: 'mineria',
    emoji: '💎',
    check: (user) => Object.values(user.minedMinerals || {}).reduce((a, b) => a + b, 0) >= 50
  },
  MINERO_LEYENDA: {
    id: 'minero_leyenda',
    name: 'Minero Leyenda',
    description: 'Extraé 200 minerales',
    category: 'mineria',
    emoji: '⛰️',
    check: (user) => Object.values(user.minedMinerals || {}).reduce((a, b) => a + b, 0) >= 200
  },
  MINERO_MITICO: {
    id: 'minero_mitico',
    name: 'Minero Mítico',
    description: 'Extraé 500 minerales',
    category: 'mineria',
    emoji: '🔮',
    check: (user) => Object.values(user.minedMinerals || {}).reduce((a, b) => a + b, 0) >= 500
  },
  MINERO_ABISAL: {
    id: 'minero_abisaal',
    name: 'Minero Abisal',
    description: 'Extraé 1000 minerales',
    category: 'mineria',
    emoji: '🕳️',
    check: (user) => Object.values(user.minedMinerals || {}).reduce((a, b) => a + b, 0) >= 1000
  },
  MINERO_DIOS: {
    id: 'minero_dios',
    name: 'Dios de la Minería',
    description: 'Extraé 2500 minerales',
    category: 'mineria',
    emoji: '🌟',
    check: (user) => Object.values(user.minedMinerals || {}).reduce((a, b) => a + b, 0) >= 2500
  },

  MILLONARIO: {
    id: 'millonario',
    name: 'Millonario',
    description: `Alcanzá 100,000 ${ZenConfig.currencies.zencoins.name}`,
    category: 'economia',
    emoji: '💰',
    check: (user) => (user.zencoins || 0) >= 100000
  },
  MULTIMILLONARIO: {
    id: 'multimillonario',
    name: 'Multimillonario',
    description: `Alcanzá 500,000 ${ZenConfig.currencies.zencoins.name}`,
    category: 'economia',
    emoji: '💎',
    check: (user) => (user.zencoins || 0) >= 500000
  },
  BILLONARIO: {
    id: 'billonario',
    name: 'Billónario',
    description: `Alcanzá 1,000,000 ${ZenConfig.currencies.zencoins.name}`,
    category: 'economia',
    emoji: '👑',
    check: (user) => (user.zencoins || 0) >= 1000000
  },
  MAGNATE: {
    id: 'magnate',
    name: 'Magnate',
    description: `Alcanzá 5,000,000 ${ZenConfig.currencies.zencoins.name}`,
    category: 'economia',
    emoji: '💼',
    check: (user) => (user.zencoins || 0) >= 5000000
  },
  TITAN_ECONOMICO: {
    id: 'titan_economico',
    name: 'Titán Económico',
    description: `Alcanzá 10,000,000 ${ZenConfig.currencies.zencoins.name}`,
    category: 'economia',
    emoji: '🏦',
    check: (user) => (user.zencoins || 0) >= 10000000
  },

  DUELISTA_NOVATO: {
    id: 'duelista_novato',
    name: 'Duelista Novato',
    description: 'Ganá 5 duelos',
    category: 'duelos',
    emoji: '⚔️',
    check: (user) => (user.stats?.robsWon || 0) >= 5
  },
  DUELISTA_EXPERTO: {
    id: 'duelista_experto',
    name: 'Duelista Experto',
    description: 'Ganá 20 duelos',
    category: 'duelos',
    emoji: '🗡️',
    check: (user) => (user.stats?.robsWon || 0) >= 20
  },
  DUELISTA_LEYENDA: {
    id: 'duelista_leyenda',
    name: 'Duelista Leyenda',
    description: 'Ganá 50 duelos',
    category: 'duelos',
    emoji: '🏅',
    check: (user) => (user.stats?.robsWon || 0) >= 50
  },
  DUELISTA_INVICTO: {
    id: 'duelista_invicto',
    name: 'Duelista Invicto',
    description: 'Ganá 100 duelos',
    category: 'duelos',
    emoji: '👊',
    check: (user) => (user.stats?.robsWon || 0) >= 100
  },
  MAESTRO_ESPADA: {
    id: 'maestro_espada',
    name: 'Maestro de la Espada',
    description: 'Ganá 250 duelos',
    category: 'duelos',
    emoji: '⚡',
    check: (user) => (user.stats?.robsWon || 0) >= 250
  },

  LADRON_NOVATO: {
    id: 'ladron_novato',
    name: 'Ladrón Novato',
    description: 'Robá 10 veces con éxito',
    category: 'robo',
    emoji: '🥷',
    check: (user) => (user.stats?.robsWon || 0) >= 10
  },
  LADRON_EXPERTO: {
    id: 'ladron_experto',
    name: 'Ladrón Experto',
    description: 'Robá 50 veces con éxito',
    category: 'robo',
    emoji: '🦝',
    check: (user) => (user.stats?.robsWon || 0) >= 50
  },
  LADRON_LEYENDA: {
    id: 'ladron_leyenda',
    name: 'Ladrón Leyenda',
    description: 'Robá 100 veces con éxito',
    category: 'robo',
    emoji: '🕵️',
    check: (user) => (user.stats?.robsWon || 0) >= 100
  },
  LADRON_MAESTRO: {
    id: 'ladron_maestro',
    name: 'Ladrón Maestro',
    description: 'Robá 250 veces con éxito',
    category: 'robo',
    emoji: '🎭',
    check: (user) => (user.stats?.robsWon || 0) >= 250
  },
  LADRON_LEGENDA: {
    id: 'ladron_legenda',
    name: 'Leyenda del Robo',
    description: 'Robá 500 veces con éxito',
    category: 'robo',
    emoji: '👺',
    check: (user) => (user.stats?.robsWon || 0) >= 500
  },

  RACHA_7: {
    id: 'racha_7',
    name: 'Racha de 7 días',
    description: 'Mantené una racha de 7 días',
    category: 'racha',
    emoji: '🔥',
    check: (user) => (user.streak || 0) >= 7
  },
  RACHA_30: {
    id: 'racha_30',
    name: 'Racha de 30 días',
    description: 'Mantené una racha de 30 días',
    category: 'racha',
    emoji: '⚡',
    check: (user) => (user.streak || 0) >= 30
  },
  RACHA_100: {
    id: 'racha_100',
    name: 'Racha de 100 días',
    description: 'Mantené una racha de 100 días',
    category: 'racha',
    emoji: '🌟',
    check: (user) => (user.streak || 0) >= 100
  },
  RACHA_365: {
    id: 'racha_365',
    name: 'Racha de 365 días',
    description: 'Mantené una racha de 365 días',
    category: 'racha',
    emoji: '👑',
    check: (user) => (user.streak || 0) >= 365
  },
  RACHA_1000: {
    id: 'racha_1000',
    name: 'Racha Milenaria',
    description: 'Mantené una racha de 1000 días',
    category: 'racha',
    emoji: '✨',
    check: (user) => (user.streak || 0) >= 1000
  },

  VETERANO: {
    id: 'veterano',
    name: 'Veterano',
    description: 'Alcanzá el nivel 50',
    category: 'general',
    emoji: '🎖️',
    check: (user) => (user.level || 1) >= 50
  },
  MAESTRO: {
    id: 'maestro',
    name: 'Maestro',
    description: 'Alcanzá el nivel 100',
    category: 'general',
    emoji: '🏵️',
    check: (user) => (user.level || 1) >= 100
  },
  LEYENDA_VIVA: {
    id: 'leyenda_viva',
    name: 'Leyenda Viva',
    description: 'Alcanzá el nivel 200',
    category: 'general',
    emoji: '🏆',
    check: (user) => (user.level || 1) >= 200
  },
  INMORTAL: {
    id: 'inmortal',
    name: 'Inmortal',
    description: 'Alcanzá el nivel 500',
    category: 'general',
    emoji: '👁️',
    check: (user) => (user.level || 1) >= 500
  },

  COLECCIONISTA: {
    id: 'coleccionista',
    name: 'Coleccionista',
    description: 'Capturá 10 especies diferentes de peces',
    category: 'coleccion',
    emoji: '📚',
    check: (user) => Object.keys(user.capturedFishes || {}).length >= 10
  },
  COLECCIONISTA_AVANZADO: {
    id: 'coleccionista_avanzado',
    name: 'Coleccionista Avanzado',
    description: 'Capturá 25 especies diferentes de peces',
    category: 'coleccion',
    emoji: '📖',
    check: (user) => Object.keys(user.capturedFishes || {}).length >= 25
  },
  COLECCIONISTA_LEYENDA: {
    id: 'coleccionista_leyenda',
    name: 'Coleccionista Leyenda',
    description: 'Capturá 50 especies diferentes de peces',
    category: 'coleccion',
    emoji: '📜',
    check: (user) => Object.keys(user.capturedFishes || {}).length >= 50
  },
  POKEMASTER: {
    id: 'pokemaster',
    name: 'PokéMaster',
    description: 'Capturá 100 especies diferentes de peces',
    category: 'coleccion',
    emoji: '🎯',
    check: (user) => Object.keys(user.capturedFishes || {}).length >= 100
  },

  BESTIA: {
    id: 'bestia',
    name: 'La Bestia',
    description: 'Capturá un pez de más de 100kg',
    category: 'records',
    emoji: '🐋',
    check: (user) => (user.stats?.maxFishWeight || 0) >= 100
  },
  LEVIATAN: {
    id: 'leviatan',
    name: 'Leviatán',
    description: 'Capturá un pez de más de 500kg',
    category: 'records',
    emoji: '🐉',
    check: (user) => (user.stats?.maxFishWeight || 0) >= 500
  },
  TITAN: {
    id: 'titan',
    name: 'Titán Marino',
    description: 'Capturá un pez de más de 1000kg',
    category: 'records',
    emoji: '🌊',
    check: (user) => (user.stats?.maxFishWeight || 0) >= 1000
  }
};

export function checkTitles(user) {
  const unlocked = [];
  const titles = user.titles || [];

  for (const [key, title] of Object.entries(TITLES)) {
    if (!titles.includes(title.id) && title.check(user)) {
      unlocked.push(title.id);
    }
  }

  return unlocked;
}

export function getTitleById(id) {
  return Object.values(TITLES).find(t => t.id === id) || null;
}

export function getTitlesByCategory(user, category) {
  const titles = user.titles || [];
  return Object.values(TITLES)
    .filter(t => t.category === category)
    .map(t => ({
      ...t,
      unlocked: titles.includes(t.id)
    }));
}

export function formatTitleList(user) {
  const titles = user.titles || [];
  const allTitles = Object.values(TITLES);
  
  if (titles.length === 0) {
    return '📜 *TÍTULOS DESBLOQUEADOS*\n\nTodavía no desbloqueaste ningún título 🥲 ¡Seguí jugando para conseguirlos!';
  }

  const lines = ['📜 *TÍTULOS DESBLOQUEADOS*\n'];
  
  const grouped = {};
  for (const titleId of titles) {
    const title = getTitleById(titleId);
    if (title) {
      if (!grouped[title.category]) grouped[title.category] = [];
      grouped[title.category].push(title);
    }
  }

  const categoryNames = {
    pesca: '🎣 Pesca',
    caza: '🏹 Caza',
    mineria: '⛏️ Minería',
    economia: '💰 Economía',
    duelos: '⚔️ Duelos',
    robo: '🥷 Robos',
    racha: '🔥 Rachas',
    general: '✨ Generales',
    coleccion: '📚 Colección',
    records: '🏆 Récords'
  };

  for (const [cat, titlesList] of Object.entries(grouped)) {
    lines.push(`\n*${categoryNames[cat] || cat}*`);
    for (const title of titlesList) {
      lines.push(`  ${title.emoji} ${title.name}`);
    }
  }

  const activeTitle = user.activeTitle ? getTitleById(user.activeTitle) : null;
  if (activeTitle) {
    lines.push(`\n\n✨ *TÍTULO ACTIVO*:\n  ${activeTitle.emoji} ${activeTitle.name}`);
  } else {
    lines.push(`\n\n💡 Usá *${ZenConfig.prefix}titulo [id]* para equipar un título 😉`);
  }

  return lines.join('\n');
}