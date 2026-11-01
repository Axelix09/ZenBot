import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { readAnimals } from '../../lib/database/animals.js';
import { WEAPONS } from '../../lib/game/weapons.js';
import { ZenConfig } from '../../zen.config.js';

const getRarityByLevel = (level) => {
  const rand = Math.random() * 100;
  if (level < 5) {
    if (rand < 45) return 'basico';
    if (rand < 85) return 'comun';
    if (rand < 97) return 'poco_comun';
    return 'raro';
  } else if (level < 12) {
    if (rand < 20) return 'basico';
    if (rand < 55) return 'comun';
    if (rand < 90) return 'poco_comun';
    if (rand < 98) return 'raro';
    return 'mistico';
  } else if (level < 22) {
    if (rand < 10) return 'basico';
    if (rand < 30) return 'comun';
    if (rand < 70) return 'poco_comun';
    if (rand < 90) return 'raro';
    if (rand < 98) return 'mistico';
    return 'legendario';
  } else {
    if (rand < 5) return 'basico';
    if (rand < 15) return 'comun';
    if (rand < 50) return 'poco_comun';
    if (rand < 80) return 'raro';
    if (rand < 95) return 'mistico';
    return 'legendario';
  }
};

export default new ZenCommand('cazar')
  .addAlias('hunt', 'hunting')
  .setCooldown(0)
  .setCategory('Economía')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();

    if (user.loans?.blockedPermanently) {
      await ctx.react('🚫');
      return ctx.reply(
        V.blocked.permanent(user)
      );
    }

    if (user.loans?.isBlocked && !user.loans?.isPromised) {
      await ctx.react('🔒');
      return ctx.reply(
        V.blocked.debt(user)
      );
    }

    const now = Date.now();
    if (!user.cooldowns) {
      user.cooldowns = {};
    }

    const lastUsed = user.cooldowns.cazar;
    const cooldownAmount = user.cooldowns.cazar_amount || 0;

    if (lastUsed && cooldownAmount > 0) {
      const expirationTime = lastUsed + cooldownAmount;
      if (now < expirationTime) {
        const timeLeftSec = (expirationTime - now) / 1000;
        const m = Math.floor(timeLeftSec / 60);
        const s = Math.floor(timeLeftSec % 60);
        const timeStr = m > 0 ? `${m}m ${s}s` : `${s}s`;
        await ctx.react('⏳');
        return ctx.reply(`『 ⏳ 』 *ENFRIAMIENTO*\n\n> Esperá *${timeStr}* para cazar de nuevo 😴`);
      }
    }

    const weapon = WEAPONS[user.currentWeapon] || WEAPONS.lanza_rustica;
    const maxD = weapon.maxDurability || 100;
    const currentDurability = user.weaponDurability ?? maxD;

    if (currentDurability <= 0) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *ARMA ROTA*\n\n> Tu *${weapon.name}* está roto (0%). Usá *${ZenConfig.prefix}armas reparar* 😭`);
    }

    const animals = readAnimals();

    if (!animals.length) {
      await ctx.react('⚠️');
      if (user.cooldowns) {
        user.cooldowns.cazar = 0;
        user.cooldowns.cazar_amount = 0;
        if (typeof user.markModified === 'function') {
          user.markModified('cooldowns');
        }
        await user.save();
      }
      return ctx.reply(`『 ⚠️ 』 *ERROR DE DATOS*\n\n> No se cargó la base de datos de animales 😭`);
    }

    await ctx.react('🏹');

    const rarity = getRarityByLevel(user.hunterLevel || 1);
    const pool = animals.filter(a => a.rarity === rarity);

    if (!pool.length) {
      await ctx.react('⚠️');
      if (user.cooldowns) {
        user.cooldowns.cazar = 0;
        user.cooldowns.cazar_amount = 0;
        if (typeof user.markModified === 'function') {
          user.markModified('cooldowns');
        }
        await user.save();
      }
      return ctx.reply(`『 ⚠️ 』 *SIN PRESAS*\n\n> No encontré animales de rareza: ${rarity} 😕`);
    }

    const animal = pool[Math.floor(Math.random() * pool.length)];

    const wAttack = weapon.baseAttack + (user.weaponLevel * 5);
    const wSpeed = weapon.baseSpeed + (user.weaponLevel * 3);

    const aDefense = animal.stats.defense;
    const aSpeed = animal.stats.speed;

    const baseRates = {
      basico: 90,
      comun: 75,
      poco_comun: 55,
      raro: 35,
      mistico: 15,
      legendario: 5
    };

    const baseChance = baseRates[rarity] || 50;
    let chance = baseChance + ((wAttack - aDefense) / 5) - ((aSpeed - wSpeed) / 5);
    chance = Math.max(5, Math.min(95, chance));

    const success = Math.random() * 100 < chance;

    if (!user.hunterStats) {
      user.hunterStats = { successfulHunts: 0, failedHunts: 0 };
    }
    if (!user.capturedAnimals) {
      user.capturedAnimals = {};
    }

    if (success) {
      const xpTable = { basico: [8, 14], comun: [15, 25], poco_comun: [30, 50], raro: [60, 100], mistico: [150, 250], legendario: [400, 600] };
      const luxTable = { basico: [0, 2], comun: [2, 5], poco_comun: [8, 15], raro: [20, 40], mistico: [70, 120], legendario: [250, 400] };
      const coinTable = { basico: [30, 80], comun: [100, 300], poco_comun: [400, 800], raro: [1000, 2000], mistico: [4000, 8000], legendario: [15000, 30000] };

      const boundsXp = xpTable[rarity];
      const boundsLux = luxTable[rarity];
      const boundsCoin = coinTable[rarity];

      const xpGained = Math.floor(boundsXp[0] + Math.random() * (boundsXp[1] - boundsXp[0] + 1));
      let luxGained = Math.floor(boundsLux[0] + Math.random() * (boundsLux[1] - boundsLux[0] + 1));
      let coinsGained = Math.floor(boundsCoin[0] + Math.random() * (boundsCoin[1] - boundsCoin[0] + 1));
      let bonusText = '';

      if (weapon.id === 'rifle_cerrojo' && Math.random() < 0.15) {
        coinsGained *= 2;
        if (luxGained > 0) {
          luxGained *= 2;
        }
        bonusText = `\n🎯 *¡TIRO PERFECTO!* Duplicaste ganancias de ${ZenConfig.currencies.zencoins.name} y ${ZenConfig.currencies.lux.name}.`;
      }

      user.hunterXp = (user.hunterXp || 0) + xpGained;
      user.lux = (user.lux || 0) + luxGained;
      user.zencoins = (user.zencoins || 0) + coinsGained;
      user.hunterStats.successfulHunts += 1;

      const animalIdStr = String(animal.id);
      user.capturedAnimals[animalIdStr] = (user.capturedAnimals[animalIdStr] || 0) + 1;

      if (typeof user.markModified === 'function') {
        user.markModified('capturedAnimals');
      }

      let leveledUp = false;
      let nextXp = user.hunterLevel * 100;
      while (user.hunterXp >= nextXp) {
        user.hunterXp -= nextXp;
        user.hunterLevel = (user.hunterLevel || 1) + 1;
        leveledUp = true;
        nextXp = user.hunterLevel * 100;
      }

      user.cooldowns.cazar = Date.now();
      user.cooldowns.cazar_amount = 1200000;
      if (typeof user.markModified === 'function') {
        user.markModified('cooldowns');
      }

      user.weaponDurability = Math.max(0, currentDurability - 12);

      await user.save();

      let wikiImg = null;
      let wikiDesc = '';
      try {
        const res = await fetch(animal.photoUrl);
        if (res.ok) {
          const json = await res.json();
          wikiImg = json.thumbnail?.source || null;
          wikiDesc = json.extract || '';
        }
      } catch (_) {}

      const rLabels = { basico: 'Básico', comun: 'Común', poco_comun: 'Poco Común', raro: 'Raro', mistico: 'Místico ✦', legendario: 'Legendario 👑' };
      const outText = 
        `『 🎯 』 *PRESA CAPTURADA*\n\n> ¡Eso estuvo bueno! 😄\n\n` +
        `✦ *Presa:* ${animal.name} (${animal.scientificName})\n✦ *Rareza:* ${rLabels[animal.rarity]}\n✦ *Hábitat:* ${animal.habitat}\n✦ *Dieta:* ${animal.diet}\n\n` +
        `✦ *Recompensas:*\n  +${xpGained} XP de Caza\n  +${luxGained} ${ZenConfig.currencies.lux.emoji}\n  +${coinsGained} ${ZenConfig.currencies.zencoins.emoji}` +
        bonusText +
        (wikiDesc ? `\n\n📖 _${wikiDesc}_` : '') +
        (leveledUp ? `\n\n👑 ¡Subiste al nivel *${user.hunterLevel}* de Cazador!` : '') +
        `\n\n✦ *Arma:* ${weapon.name} [Nvl. ${user.weaponLevel}] (${user.weaponDurability}/${maxD} ⚙️)`;

      if (wikiImg) {
        return ctx.sock.sendMessage(ctx.chat, {
          image: { url: wikiImg },
          caption: outText,
          mentions: [ctx.sender]
        }, { quoted: ctx.rawMsg });
      }

      return ctx.reply(outText);
    } else {
      user.hunterStats.failedHunts += 1;

      user.cooldowns.cazar = Date.now();
      user.cooldowns.cazar_amount = 600000;
      if (typeof user.markModified === 'function') {
        user.markModified('cooldowns');
      }

      user.weaponDurability = Math.max(0, currentDurability - 8);

      await user.save();
      await ctx.react('💨');
      return ctx.reply(
        `『 🍃 』 *PRESA ESCAPÓ*\n\n` +
        `> Intentaste acechar a un *${animal.name}* 😭\n> Detectó tu aproximación y se escabulló.\n\n` +
        `✦ *Consejo:* Mejora tu *${weapon.name}* para aumentar tus posibilidades.`
      );
    }
  });