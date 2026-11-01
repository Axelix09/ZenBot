export const TITULOS_CARRERA = [
  { id: 'corredor_novato', nombre: '🏃 Corredor Novato', requisito: (stats) => stats.totalRuns >= 1 },
  { id: 'velocista', nombre: '🏃‍♂️ Velocista', requisito: (stats) => stats.totalRuns >= 10 },
  { id: 'maratonista', nombre: '🏃‍♀️ Maratonista', requisito: (stats) => stats.totalRuns >= 50 },
  { id: 'rayo', nombre: '⚡ Rayo', requisito: (stats) => stats.totalRuns >= 100 },
  { id: 'aguila', nombre: '🦅 Águila', requisito: (stats) => stats.bestStreak >= 10 },
  { id: 'invencible', nombre: '🐉 Invencible', requisito: (stats) => stats.bestStreak >= 25 },
  { id: 'rey_carrera', nombre: '👑 Rey de la Carrera', requisito: (stats) => stats.totalWins >= 100 },
  { id: 'superviviente', nombre: '💀 Superviviente', requisito: (stats) => stats.obstaclesSurvived >= 50 },
  { id: 'perfecto', nombre: '🎯 Perfecto', requisito: (stats) => stats.totalWins >= 3 && stats.totalLosses === 0 },
  { id: 'leyenda', nombre: '🌟 Leyenda', requisito: (stats) => stats.totalWins >= 500 }
];

export function checkTitulosCarrera(stats, currentTitles = []) {
  const nuevos = [];
  for (const titulo of TITULOS_CARRERA) {
    if (!currentTitles.includes(titulo.id) && titulo.requisito(stats)) {
      nuevos.push(titulo.id);
    }
  }
  return nuevos;
}

export function getTituloById(id) {
  return TITULOS_CARRERA.find(t => t.id === id) || null;
}