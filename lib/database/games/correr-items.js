export const ITEMS_CARRERA = {
  escudo: {
    id: 'escudo',
    nombre: '🛡️ Escudo Protector',
    descripcion: 'Te salva de 1 obstáculo (se consume)',
    costo: 3000,
    efecto: 'salvar',
    maxUso: 1
  },
  botas: {
    id: 'botas',
    nombre: '👟 Botas de Velocidad',
    descripcion: '+20% de éxito en 1ra ronda',
    costo: 2000,
    efecto: 'bonus',
    bonus: 20,
    maxUso: 1
  },
  amuleto: {
    id: 'amuleto',
    nombre: '🔮 Amuleto de Suerte',
    descripcion: '+15% de éxito en toda la carrera',
    costo: 5000,
    efecto: 'bonus_permanente',
    bonus: 15,
    maxUso: 1
  }
};

export function getItemById(id) {
  return ITEMS_CARRERA[id] || null;
}

export function getItemsList() {
  return Object.values(ITEMS_CARRERA);
}