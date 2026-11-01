import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { readMinerals } from '../../lib/database/minerals.js';
import { PICKAXES } from '../../lib/game/pickaxes.js';
import { ZenConfig } from '../../zen.config.js';
import { renderHtmlCard, cardAsset } from '../../lib/cards/htmlCard.js';

const getRarityByMinerLevel = (level, maxAllowedRarity) => {
  const rarities = ['basico', 'comun', 'poco_comun', 'raro', 'mistico', 'legendario'];
  const maxIndex = rarities.indexOf(maxAllowedRarity);
  
  const rand = Math.random() * 100;
  let rarity = 'basico';

  if (level < 5) {
    if (rand < 45) rarity = 'basico';
    else if (rand < 85) rarity = 'comun';
    else if (rand < 97) rarity = 'poco_comun';
    else rarity = 'raro';
  } else if (level < 12) {
    if (rand < 20) rarity = 'basico';
    else if (rand < 55) rarity = 'comun';
    else if (rand < 90) rarity = 'poco_comun';
    else if (rand < 98) rarity = 'raro';
    else rarity = 'mistico';
  } else if (level < 22) {
    if (rand < 10) rarity = 'basico';
    else if (rand < 30) rarity = 'comun';
    else if (rand < 70) rarity = 'poco_comun';
    else if (rand < 90) rarity = 'raro';
    else if (rand < 98) rarity = 'mistico';
    else rarity = 'legendario';
  } else {
    if (rand < 5) rarity = 'basico';
    else if (rand < 15) rarity = 'comun';
    else if (rand < 50) rarity = 'poco_comun';
    else if (rand < 80) rarity = 'raro';
    else if (rand < 95) rarity = 'mistico';
    else rarity = 'legendario';
  }

  const rolledIndex = rarities.indexOf(rarity);
  if (rolledIndex > maxIndex) {
    return maxAllowedRarity;
  }
  return rarity;
};

export default new ZenCommand('minar')
  .addAlias('mine', 'picar', 'cavar')
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

    const lastUsed = user.cooldowns.minar;
    const cooldownAmount = user.cooldowns.minar_amount || 0;

    if (lastUsed && cooldownAmount > 0) {
      const expirationTime = lastUsed + cooldownAmount;
      if (now < expirationTime) {
        const timeLeftSec = (expirationTime - now) / 1000;
        const m = Math.floor(timeLeftSec / 60);
        const s = Math.floor(timeLeftSec % 60);
        const timeStr = m > 0 ? `${m}m ${s}s` : `${s}s`;
        await ctx.react('⏳');
        return ctx.reply(`『 ⏳ 』 *ENFRIAMIENTO*\n\n> Esperá *${timeStr}* para minar de nuevo 😴`);
      }
    }

    const minerals = readMinerals();

    if (!minerals.length) {
      await ctx.react('⚠️');
      if (user.cooldowns) {
        user.cooldowns.minar = 0;
        user.cooldowns.minar_amount = 0;
        if (typeof user.markModified === 'function') {
          user.markModified('cooldowns');
        }
        await user.save();
      }
      return ctx.reply(`『 ⚠️ 』 *ERROR DE DATOS*\n\n> No se cargó la base de datos de minerales 😢`);
    }

    await ctx.react('⛏️');

    const pickaxe = PICKAXES[user.currentPickaxe] || PICKAXES.pico_madera;
    const maxD = pickaxe.maxDurability || 100;
    const currentDurability = user.pickaxeDurability ?? maxD;

    if (currentDurability <= 0) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *PICO ROTO*\n\n> Tu *${pickaxe.name}* está roto (0%). Usá *${ZenConfig.prefix}picos reparar* 😭`);
    }

    const rarity = getRarityByMinerLevel(user.minerLevel || 1, pickaxe.maxRarity);
    const pool = minerals.filter(m => m.rarity === rarity);

    if (!pool.length) {
      await ctx.react('⚠️');
      if (user.cooldowns) {
        user.cooldowns.minar = 0;
        user.cooldowns.minar_amount = 0;
        if (typeof user.markModified === 'function') {
          user.markModified('cooldowns');
        }
        await user.save();
      }
      return ctx.reply(`『 ⚠️ 』 *SIN VETAS*\n\n> No encontré vetas de rareza: ${rarity} 🤔`);
    }

    const mineral = pool[Math.floor(Math.random() * pool.length)];

    const pEfficiency = pickaxe.baseEfficiency + (user.pickaxeLevel * 6);
    const pLuck = pickaxe.baseLuck + (user.pickaxeLevel * 4);

    const mHardness = (mineral.hardnessMohs[0] + mineral.hardnessMohs[1]) / 2;
    const mDurability = mineral.stats.durability;

    const baseRates = {
      basico: 90,
      comun: 75,
      poco_comun: 55,
      raro: 35,
      mistico: 15,
      legendario: 5
    };

    const baseChance = baseRates[rarity] || 50;
    let chance = baseChance + ((pEfficiency - mDurability) / 4) + ((pLuck - (mHardness * 10)) / 2);
    chance = Math.max(5, Math.min(95, chance));

    const success = Math.random() * 100 < chance;

    if (!user.miningStats) {
      user.miningStats = { successfulMinings: 0, failedMinings: 0 };
    }
    if (!user.minedMinerals) {
      user.minedMinerals = {};
    }

    if (success) {
      const xpGained = Math.ceil(mineral.stats.xp * (1 + (pLuck / 100)));
      const baseCoins = mineral.stats.value * 22;
      let coinsGained = Math.ceil(baseCoins * (1 + (pEfficiency / 100)));

      let luxGained = 0;
      if (rarity === 'poco_comun' && Math.random() < 0.25) luxGained = Math.floor(Math.random() * 3) + 1;
      else if (rarity === 'raro') luxGained = Math.floor(Math.random() * 6) + 3;
      else if (rarity === 'mistico') luxGained = Math.floor(Math.random() * 16) + 8;
      else if (rarity === 'legendario') luxGained = Math.floor(Math.random() * 41) + 20;

      let bonusText = '';
      if (pickaxe.id === 'pico_diamante' && Math.random() < 0.15) {
        coinsGained *= 2;
        if (luxGained > 0) {
          luxGained *= 2;
        }
        bonusText = `\n💎 *Fortuna:* Duplicaste ganancias de ${ZenConfig.currencies.zencoins.name} y ${ZenConfig.currencies.lux.name}.`;
      }

      user.minerXp = (user.minerXp || 0) + xpGained;
      user.zencoins = (user.zencoins || 0) + coinsGained;
      user.lux = (user.lux || 0) + luxGained;
      user.miningStats.successfulMinings += 1;

      const mineralIdStr = String(mineral.id);
      user.minedMinerals[mineralIdStr] = (user.minedMinerals[mineralIdStr] || 0) + 1;

      if (typeof user.markModified === 'function') {
        user.markModified('minedMinerals');
      }

      let leveledUp = false;
      let nextXp = user.minerLevel * 100;
      while (user.minerXp >= nextXp) {
        user.minerXp -= nextXp;
        user.minerLevel = (user.minerLevel || 1) + 1;
        leveledUp = true;
        nextXp = user.minerLevel * 100;
      }

      user.cooldowns.minar = Date.now();
      user.cooldowns.minar_amount = 1200000;
      if (typeof user.markModified === 'function') {
        user.markModified('cooldowns');
      }

      user.pickaxeDurability = Math.max(0, currentDurability - 12);

      await user.save();

      let wikiImg = null;
      let wikiDesc = '';
      try {
        const res = await fetch(mineral.photoUrl);
        if (res.ok) {
          const json = await res.json();
          wikiImg = json.thumbnail?.source || null;
          wikiDesc = json.extract || '';
        }
      } catch (_) {}

      const rLabels = { basico: 'Básico', comun: 'Común', poco_comun: 'Poco Común', raro: 'Raro', mistico: 'Místico ✦', legendario: 'Legendario 👑' };
      const outText =
        `『 ⛏️ 』 *YACIMIENTO EXPLOTADO*\n\n` +
        `✦ *Minero:* ${user.name}\n✦ *Mineral:* ${mineral.name} (${mineral.formula})\n✦ *Rareza:* ${rLabels[mineral.rarity]}\n✦ *Dureza Mohs:* ${mineral.hardnessMohs[0]} - ${mineral.hardnessMohs[1]}\n✦ *Profundidad:* ${mineral.depthMeters[0]}m - ${mineral.depthMeters[1]}m\n\n` +
        `✦ *Recompensas:*\n  +${xpGained} XP de Minería\n  +${coinsGained} ${ZenConfig.currencies.zencoins.emoji}` +
        (luxGained > 0 ? `\n  +${luxGained} ${ZenConfig.currencies.lux.emoji}` : '') +
        bonusText +
        (wikiDesc ? `\n\n📖 _${wikiDesc}_` : '') +
        (leveledUp ? `\n\n👑 ¡Subiste al nivel *${user.minerLevel}* de Minería!` : '') +
        `\n\n✦ *Herramienta:* ${pickaxe.name} [Nvl. ${user.pickaxeLevel}] (${user.pickaxeDurability}/${maxD} ⚙️)`;

      if (wikiImg) {
        return ctx.sock.sendMessage(ctx.chat, {
          image: { url: wikiImg },
          caption: outText,
          mentions: [ctx.sender]
        }, { quoted: ctx.rawMsg });
      }

      try {
        const card = await renderHtmlCard({
          eyebrow: `${ZenConfig.botName.toUpperCase()} · MINERÍA`,
          title: mineral.name,
          subtitle: `${rLabels[mineral.rarity]} · fórmula ${mineral.formula} · profundidad ${mineral.depthMeters[0]}-${mineral.depthMeters[1]}m`,
          accent: '#a855f7',
          accent2: '#22d3ee',
          art: cardAsset('mining-crystal.png'),
          stats: [
            { label: 'XP', value: `+${xpGained}`, note: 'minería' },
            { label: 'ZC', value: `+${coinsGained}`, note: 'recompensa' },
            { label: 'Pico', value: `${user.pickaxeDurability}%`, note: pickaxe.name }
          ],
          rows: [
            { label: 'Dureza Mohs', value: `${mineral.hardnessMohs[0]} - ${mineral.hardnessMohs[1]}` },
            { label: 'Minero', value: user.name },
            { label: 'Nivel', value: String(user.minerLevel) }
          ],
          caption: 'La veta ha sido añadida a tu progreso'
        });
        return ctx.sock.sendMessage(ctx.chat, { image: card, caption: outText }, { quoted: ctx.rawMsg });
      } catch (error) {
        if (process.env.DEBUG) console.debug('[mining card] fallback:', error.message);
        return ctx.reply(outText);
      }
    } else {
      user.miningStats.failedMinings += 1;

      user.cooldowns.minar = Date.now();
      user.cooldowns.minar_amount = 600000;
      if (typeof user.markModified === 'function') {
        user.markModified('cooldowns');
      }

      user.pickaxeDurability = Math.max(0, currentDurability - 8);

      await user.save();
      await ctx.react('💨');
      return ctx.reply(
        `『 💥 』 *PICO REBOTADO*\n\n` +
        `> Intentaste picar una veta de *${mineral.name}* 🙂\n> La dureza superó la resistencia de tu *${pickaxe.name}*.\n\n` +
        `✦ *Consejo:* Compra o mejora tu pico con *${ZenConfig.prefix}picos*.`
      );
    }
  });
