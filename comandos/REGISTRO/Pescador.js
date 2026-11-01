import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { getTitleById } from '../../lib/game/titles.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fishesPath = path.join(__dirname, '..', '..', 'lib', 'database', 'json', 'peces.json');

const GEAR = {
  rods: {
    cana_madera: { name: 'Caña de Madera' },
    cana_fibra: { name: 'Caña de Fibra de Vidrio' },
    cana_carbono: { name: 'Caña de Fibra de Carbono' }
  },
  reels: {
    carrete_oxidado: { name: 'Carrete Oxidado' },
    carrete_aluminio: { name: 'Carrete de Aluminio' },
    carrete_titanio: { name: 'Carrete de Titanio Mecanizado' }
  },
  lines: {
    hilo_nylon: { name: 'Línea de Nylon' },
    hilo_trenzado: { name: 'Línea de Hilo Trenzado' },
    hilo_fluorocarbono: { name: 'Línea de Fluorocarbono Invisible' }
  }
};

const readFishes = () => {
  try {
    const data = fs.readFileSync(fishesPath, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.fishes || [];
  } catch (err) {
    return [];
  }
};

export default new ZenCommand('pescador')
  .addAlias('licenciadepescador', 'fisherman')
  .setCooldown(5)
  .setCategory('registro')
  .requireRegistration()
  .setUsage('<acción>')
  .onExecute(async (ctx) => {
    const [subcmd] = ctx.args;
    const user = await ctx.getUser();

    if (subcmd?.toLowerCase() === 'coleccion' || subcmd?.toLowerCase() === 'colección') {
      await ctx.react('📜');
      const fishes = readFishes();
      const captured = user.capturedFishes || {};
      const entries = Object.entries(captured).filter(([_, qty]) => qty > 0);

      if (!entries.length) {
        return ctx.reply(`『 ⚠️ 』 *RED VACÍA*\n\n> Lanza tu primer anzuelo con *${ZenConfig.prefix}lanzar*! 😄`);
      }

      const rarityOrder = ['legendario', 'mistico', 'raro', 'poco_comun', 'comun', 'basico'];
      const rLabels = { basico: 'Básico', comun: 'Común', poco_comun: 'Poco Común', raro: 'Raro', mistico: 'Místico ✦', legendario: 'Legendario 👑' };

      const list = entries.map(([id, qty]) => {
        const fish = fishes.find(f => String(f.id) === id);
        return { fish, qty };
      }).filter(e => e.fish).sort((a, b) => rarityOrder.indexOf(a.fish.rarity) - rarityOrder.indexOf(b.fish.rarity));

      const grouped = {};
      list.forEach(e => {
        const key = rLabels[e.fish.rarity] || e.fish.rarity;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(`${e.fish.name} (x${e.qty})`);
      });

      const lines = Object.entries(grouped).map(([rarity, items]) => `✦ *${rarity}:*\n  ${items.join('  ·  ')}`);

      return ctx.reply(
        `『 🏆 』 *RED DE CAPTURAS*\n\n` +
        `> Pescaste *${list.length}* especies distintas 😄\n\n` +
        lines.join('\n\n') +
        `\n\n> _Usa ${ZenConfig.prefix}lanzar para seguir capturando._`
      );
    }

    await ctx.react('🎖️');
    const activeRod = user.currentRod || 'cana_madera';
    const activeReel = user.currentReel || 'carrete_oxidado';
    const activeLine = user.currentLine || 'hilo_nylon';

    const rodStats = GEAR.rods[activeRod] || GEAR.rods.cana_madera;
    const reelStats = GEAR.reels[activeReel] || GEAR.reels.carrete_oxidado;
    const lineStats = GEAR.lines[activeLine] || GEAR.lines.hilo_nylon;

    const stats = user.fishingStats || { successfulCatches: 0, failedCatches: 0 };
    const nextXp = (user.fishermanLevel || 1) * 100;

    const levels = [
      { lvl: 25, title: 'Señor del Océano Primordial 🔱' },
      { lvl: 18, title: 'Capitán de Altamar 🚢' },
      { lvl: 10, title: 'Pescador de Arrecife 🐠' },
      { lvl: 5,  title: 'Explorador Costero 🛶' },
      { lvl: 1,  title: 'Novato de Muelle 🌱' }
    ];

    const currentTitle = levels.find(l => (user.fishermanLevel || 1) >= l.lvl)?.title || 'Pescador Amateur';
    const activeTitle = user.activeTitle ? getTitleById(user.activeTitle) : null;
    const titleLine = activeTitle ? `\n✦ *Título activo:* ${activeTitle.emoji} ${activeTitle.name}` : '';

    const cleanLicense = [
      `『 🎣 』 *LICENCIA DE PESCADOR*`,
      ``,
      `✦ *Identidad:* ${user.name}`,
      `✦ *Rango:* ${currentTitle}`,
      `✦ *Nivel:* ${user.fishermanLevel || 1}  _[${user.fishermanXp || 0} / ${nextXp} XP]_`,
      titleLine,
      ``,
      `✦ *EQUIPAMIENTO*`,
      `  • Caña: ${rodStats.name}`,
      `  • Carrete: ${reelStats.name}`,
      `  • Sedal: ${lineStats.name}`,
      `  • Sonar: ${user.inventory?.item_sonar ? 'Instalado 📡' : 'No instalado'}`,
      ``,
      `✦ *ESTADÍSTICAS*`,
      `  • Prestigio: ${user.lux || 0} ${ZenConfig.currencies.lux.emoji}`,
      `  • Capturas: ${stats.successfulCatches}`,
      `  • Líneas reventadas: ${stats.failedCatches}`,
      `  • Récord: ${user.stats?.maxFishName ? `${user.stats.maxFishName} (${user.stats.maxFishWeight} Kg) 👑` : 'Ninguno'}`,
      ``,
      `> _Usa *${ZenConfig.prefix}${ctx.commandName} coleccion* para ver tus peces._`
    ];

    return ctx.reply(cleanLicense.join('\n'));
  });