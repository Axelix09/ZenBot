import { ZenCommand } from '../../lib/core/factory.js';
import { PICKAXES } from '../../lib/game/pickaxes.js';
import { readMinerals } from '../../lib/database/minerals.js';
import { ZenConfig } from '../../zen.config.js';
import { getTitleById } from '../../lib/game/titles.js';

export default new ZenCommand('minero')
  .addAlias('licenciademinero', 'miner', 'minerales', 'coleccion-minerales')
  .setCooldown(5)
  .setCategory('registro')
  .requireRegistration()
  .setUsage('<acción>')
  .onExecute(async (ctx) => {
    const [subcmd] = ctx.args;
    const user = await ctx.getUser();

    if (subcmd?.toLowerCase() === 'coleccion' || subcmd?.toLowerCase() === 'colección' || ctx.commandName === 'minerales') {
      await ctx.react('📜');
      const minerals = readMinerals();
      const mined = user.minedMinerals || {};
      const entries = Object.entries(mined).filter(([_, qty]) => qty > 0);

      if (!entries.length) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *COLECCIÓN VACÍA*\n\n> Sal a picar tu primer bloque con *${ZenConfig.prefix}minar*! 😄`);
      }

      const rarityOrder = ['legendario', 'mistico', 'raro', 'poco_comun', 'comun', 'basico'];
      const rLabels = { basico: 'Básico', comun: 'Común', poco_comun: 'Poco Común', raro: 'Raro', mistico: 'Místico ✦', legendario: 'Legendario 👑' };

      const list = entries.map(([id, qty]) => {
        const min = minerals.find(m => String(m.id) === id);
        return { min, qty };
      }).filter(e => e.min).sort((a, b) => {
        return rarityOrder.indexOf(a.min.rarity) - rarityOrder.indexOf(b.min.rarity);
      });

      const grouped = {};
      list.forEach(e => {
        const key = rLabels[e.min.rarity] || e.min.rarity;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(`${e.min.name} (x${e.qty})`);
      });

      const lines = Object.entries(grouped).map(([rarity, items]) => {
        return `✦ *${rarity}:*\n  ${items.join('  ·  ')}`;
      });

      return ctx.reply(
        `『 🏆 』 *COLECCIÓN DE MINERALES*\n\n` +
        `> Has extraído *${list.length}* especies distintas 😉\n\n` +
        lines.join('\n\n') +
        `\n\n> _Usa ${ZenConfig.prefix}minar para seguir excavando._`
      );
    }

    await ctx.react('🎖️');
    const pickaxe = PICKAXES[user.currentPickaxe] || PICKAXES.pico_madera;
    const stats = user.miningStats || { successfulMinings: 0, failedMinings: 0 };
    const nextXp = (user.minerLevel || 1) * 100;

    const pEfficiency = pickaxe.baseEfficiency + (user.pickaxeLevel * 6);
    const pLuck = pickaxe.baseLuck + (user.pickaxeLevel * 4);

    const levels = [
      { lvl: 25, title: 'Gran Patriarca del Abismo 🌋' },
      { lvl: 18, title: 'Perforador del Núcleo 🌀' },
      { lvl: 10, title: 'Picapedrero Experto ⚒️' },
      { lvl: 5,  title: 'Rastreador de Vetas 🔍' },
      { lvl: 1,  title: 'Iniciado del Carbón 🌱' }
    ];

    const currentTitle = levels.find(l => (user.minerLevel || 1) >= l.lvl)?.title || 'Minero Novato';
    const activeTitle = user.activeTitle ? getTitleById(user.activeTitle) : null;
    const titleLine = activeTitle ? `\n✦ *Título activo:* ${activeTitle.emoji} ${activeTitle.name}` : '';

    const cleanLicense = [
      `『 ⚒️ 』 *LICENCIA DE MINERO*`,
      ``,
      `✦ *Identidad:* ${user.name}`,
      `✦ *Rango:* ${currentTitle}`,
      `✦ *Nivel:* ${user.minerLevel || 1}  _[${user.minerXp || 0} / ${nextXp} XP]_`,
      titleLine,
      ``,
      `✦ *HERRAMIENTA*`,
      `  • Pico: ${pickaxe.name} [Nvl. ${user.pickaxeLevel || 1}]`,
      `  • Eficiencia: ${pEfficiency} EFC`,
      `  • Suerte: ${pLuck} LCK`,
      ``,
      `✦ *ESTADÍSTICAS*`,
      `  • Prestigio: ${user.lux || 0} ${ZenConfig.currencies.lux.emoji}`,
      `  • Excavaciones: ${stats.successfulMinings}`,
      `  • Rebotados: ${stats.failedMinings}`,
      ``,
      `> _Usa *${ZenConfig.prefix}${ctx.commandName} coleccion* para ver tus minerales 😄_`
    ];

    return ctx.reply(cleanLicense.join('\n'));
  });