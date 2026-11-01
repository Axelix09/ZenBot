import { ZenCommand } from '../../lib/core/factory.js';
import { WEAPONS } from '../../lib/game/weapons.js';
import { readAnimals } from '../../lib/database/animals.js';
import { ZenConfig } from '../../zen.config.js';
import { getTitleById } from '../../lib/game/titles.js';

export default new ZenCommand('cazador')
  .addAlias('licencia', 'hunter')  
  .setCooldown(5)
  .setCategory('registro')
  .requireRegistration()
  .setUsage('<acción>')
  .onExecute(async (ctx) => {
    const [subcmd] = ctx.args;
    const user = await ctx.getUser();

    if (subcmd?.toLowerCase() === 'coleccion' || subcmd?.toLowerCase() === 'colección') {
      await ctx.react('📜');
      const animals = readAnimals();
      const captured = user.capturedAnimals || {};
      const entries = Object.entries(captured).filter(([_, qty]) => qty > 0);

      if (!entries.length) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *COLECCIÓN VACÍA*\n\n> Sal a cazar tu primer animal con *${ZenConfig.prefix}cazar*! 😉`);
      }

      const rarityOrder = ['legendario', 'mistico', 'raro', 'poco_comun', 'comun', 'basico'];
      const rLabels = { basico: 'Básico', comun: 'Común', poco_comun: 'Poco Común', raro: 'Raro', mistico: 'Místico ✦', legendario: 'Legendario 👑' };

      const list = entries.map(([id, qty]) => {
        const anim = animals.find(a => String(a.id) === id);
        return { anim, qty };
      }).filter(e => e.anim).sort((a, b) => {
        return rarityOrder.indexOf(a.anim.rarity) - rarityOrder.indexOf(b.anim.rarity);
      });

      const grouped = {};
      list.forEach(e => {
        const key = rLabels[e.anim.rarity] || e.anim.rarity;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(`${e.anim.name} (x${e.qty})`);
      });

      const lines = Object.entries(grouped).map(([rarity, items]) => {
        return `✦ *${rarity}:*\n  ${items.join('  ·  ')}`;
      });

      return ctx.reply(
        `『 🏆 』 *COLECCIÓN DE CAZA*\n\n` +
        `> Capturaste *${list.length}* especies distintas 🙂\n\n` +
        lines.join('\n\n') +
        `\n\n> _Usa ${ZenConfig.prefix}cazar para seguir explorando._`
      );
    }

    await ctx.react('🎖️');
    const weapon = WEAPONS[user.currentWeapon] || WEAPONS.lanza_rustica;
    const stats = user.hunterStats || { successfulHunts: 0, failedHunts: 0 };
    const nextXp = (user.hunterLevel || 1) * 100;

    const wAttack = weapon.baseAttack + (user.weaponLevel * 5);
    const wSpeed = weapon.baseSpeed + (user.weaponLevel * 3);

    const levels = [
      { lvl: 25, title: 'Gran Patriarca del Monte 🌲' },
      { lvl: 18, title: 'Ballestero Experto 🎯' },
      { lvl: 10, title: 'Montero de la Selva 🐾' },
      { lvl: 5,  title: 'Rastreador de Caminos 👣' },
      { lvl: 1,  title: 'Novato de la Pradera 🌱' }
    ];

    const currentTitle = levels.find(l => (user.hunterLevel || 1) >= l.lvl)?.title || 'Cazador Iniciado';
    const activeTitle = user.activeTitle ? getTitleById(user.activeTitle) : null;
    const titleLine = activeTitle ? `\n✦ *Título activo:* ${activeTitle.emoji} ${activeTitle.name}` : '';

    const cleanLicense = [
      `『 🏹 』 *LICENCIA DE CAZADOR*`,
      ``,
      `✦ *Identidad:* ${user.name}`,
      `✦ *Rango:* ${currentTitle}`,
      `✦ *Nivel:* ${user.hunterLevel || 1}  _[${user.hunterXp || 0} / ${nextXp} XP]_`,
      titleLine,
      ``,
      `✦ *EQUIPAMIENTO*`,
      `  • Arma: ${weapon.name} [Nvl. ${user.weaponLevel || 1}]`,
      `  • Ataque: ${wAttack} ATK`,
      `  • Velocidad: ${wSpeed} SPD`,
      ``,
      `✦ *ESTADÍSTICAS*`,
      `  • Prestigio: ${user.lux || 0} ${ZenConfig.currencies.lux.emoji}`,
      `  • Capturas: ${stats.successfulHunts}`,
      `  • Escapes: ${stats.failedHunts}`,
      ``,
      `> _Usa *${ZenConfig.prefix}${ctx.commandName} coleccion* para ver tus presas 😌_`
    ];

    return ctx.reply(cleanLicense.join('\n'));
  });