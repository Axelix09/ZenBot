export const STREAK_ACTIVATION_DAYS = 3;

export function addXP(amount) {
  this.xp += amount;
  let leveledUp = false;

  let nextLevelXP = this.level * 150;
  while (this.xp >= nextLevelXP && this.level < 100) {
    this.xp -= nextLevelXP;
    this.level += 1;
    this.updateRole();
    leveledUp = true;
    nextLevelXP = this.level * 150;
  }

  if (this.level >= 100) this.xp = 0;
  return leveledUp;
}

const tiers = [
  { name: 'Iniciado',     emoji: '🌱' },
  { name: 'Aprendiz',     emoji: '📘' },
  { name: 'Practicante',  emoji: '🧭' },
  { name: 'Competente',   emoji: '🔷' },
  { name: 'Hábil',        emoji: '🎯' },
  { name: 'Avanzado',     emoji: '🛡️' },
  { name: 'Experto',      emoji: '🎓' },
  { name: 'Virtuoso',     emoji: '🎻' },
  { name: 'Veterano',     emoji: '🏅' },
  { name: 'Élite',        emoji: '💠' },
  { name: 'Maestro',      emoji: '📖' },
  { name: 'Estratega',    emoji: '♟️' },
  { name: 'Campeón',      emoji: '🏆' },
  { name: 'Notable',      emoji: '🌟' },
  { name: 'Distinguido',  emoji: '🎖️' },
  { name: 'Eminente',     emoji: '✴️' },
  { name: 'Supremo',      emoji: '🔱' },
  { name: 'Legendario',   emoji: '🥇' },
  { name: 'Magistral',    emoji: '🏵️' },
  { name: 'Soberano',     emoji: '⚜️' }
];

const divisions = ['V', 'IV', 'III', 'II', 'I'];

export const ranks = [];
let lvl = 1;
for (const tier of tiers) {
  for (const div of divisions) {
    ranks.push({ level: lvl, role: `${tier.emoji} ${tier.name} ${div}` });
    lvl++;
  }
}

export function updateRole() {
  const found = [...ranks].reverse().find((r) => this.level >= r.level);
  this.role = found ? found.role : ranks[0].role;
}