import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { 
  readFishes, 
  drawTensionBar, 
  GEAR_RODS, 
  GEAR_REELS, 
  GEAR_LINES 
} from '../../lib/game/fishing.js';
import { ZenConfig } from '../../zen.config.js';
import { getGameSession, saveGameSession, deleteGameSession } from '../../lib/services/sessionManager.js';
import { renderHtmlCard, cardAsset } from '../../lib/cards/htmlCard.js';

export default new ZenCommand('pescar')
  .addAlias('recolectar')
  .setCooldown(1)
  .setCategory('Economía')
  .requireRegistration()
  .setUsage('<acción>')
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

    const [actionInput] = ctx.args;
    const battle = await getGameSession(ctx.sender, 'fishing');

    if (!battle) {
      await ctx.react('⚠️');
      const instructions = 
        `『 ⚠️ 』 *SIN PESCA ACTIVA*\n\n` +
        `> Hmm, eso no aparece 🤔\n> Para jugar una partida de pesca:\n\n` +
        `✦ *1.* Compra carnada: *${ZenConfig.prefix}pescartienda comprar cebo lombriz 5*\n✦ *2.* Lanza el anzuelo: *${ZenConfig.prefix}lanzar lombriz superficie*\n✦ *3.* Cansa al pez con acciones:\n  • *${ZenConfig.prefix}pescar tirar* (Reduce HP)\n  • *${ZenConfig.prefix}pescar aflojar* (Reduce tensión)\n  • *${ZenConfig.prefix}pescar mantener* (Cansa establemente)`;
      try {
        const card = await renderHtmlCard({
          eyebrow: `${ZenConfig.botName.toUpperCase()} · PESCA`,
          title: 'Prepara tu pesca',
          subtitle: 'Compra carnada, lanza el anzuelo y controla la tensión del sedal',
          accent: '#06b6d4',
          accent2: '#3b82f6',
          art: cardAsset('fishing-kit.png'),
          stats: [
            { label: 'Paso 1', value: 'Carnada', note: 'compra en la tienda' },
            { label: 'Paso 2', value: 'Lanzar', note: 'elige superficie' },
            { label: 'Paso 3', value: 'Pescar', note: 'controla la tensión' }
          ],
          rows: [
            { label: 'Comprar', value: `${ZenConfig.prefix}pescartienda` },
            { label: 'Lanzar', value: `${ZenConfig.prefix}lanzar lombriz superficie` },
            { label: 'Acciones', value: 'tirar · aflojar · mantener' }
          ],
          caption: 'Cuando haya batalla activa usa .pescar [acción]'
        });
        return ctx.sock.sendMessage(ctx.chat, { image: card, caption: instructions }, { quoted: ctx.rawMsg });
      } catch (error) {
        if (process.env.DEBUG) console.debug('[fishing card] fallback:', error.message);
        return ctx.reply(instructions);
      }
    }

    if (!actionInput) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *ACCIÓN REQUERIDA*\n\n> Eso no me cierra 😵‍💫\n> Acciones: *tirar*, *aflojar*, *mantener* o *huir*.\n> _Ejemplo: ${ZenConfig.prefix}pescar tirar_`);
    }

    const action = actionInput.toLowerCase();

    if (!['tirar', 'aflojar', 'mantener', 'huir'].includes(action)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *ACCIÓN INVÁLIDA*\n\n> Eso no me cierra 😵‍💫\n> Seleccioná: *tirar*, *aflojar*, *mantener* o *huir*.`);
    }

    if (action === 'huir') {
      await deleteGameSession(ctx.sender, 'fishing');
      user.fishingStats.failedCatches += 1;
      await user.save();
      await ctx.react('💨');
      return ctx.reply(`『 💨 』 *HUIDA*\n\n> Soltaste el sedal y dejaste escapar al pez. Perdiste tu cebo 🙂`);
    }

    const activeRod = user.currentRod || 'cana_madera';
    const activeReel = user.currentReel || 'carrete_oxidado';
    const activeLine = user.currentLine || 'hilo_nylon';

    const rodDmg = GEAR_RODS[activeRod] || 12;
    const reelDamp = GEAR_REELS[activeReel] || 0;
    const lineName = GEAR_LINES[activeLine] || 'Línea básica';

    battle.turns += 1;

    if (battle.turns > 8 && Math.random() < 0.18) {
      await deleteGameSession(ctx.sender, 'fishing');
      user.fishingStats.failedCatches += 1;
      await user.save();
      await ctx.react('💨');
      return ctx.reply(`『 ⚠️ 』 *CEBO DESHECHO*\n\n> El pez forcejeó demasiado y el cebo se disolvió 🥳`);
    }

    const fSpeed = battle.fish.stats.speed;
    const fAttack = battle.fish.stats.attack;

    let fishMove = '';
    let fishTensionMod = 0;
    const randMove = Math.random();

    if (randMove < 0.40) {
      fishMove = 'El pez está dando tirones fuertes hacia el fondo.';
      fishTensionMod = Math.round((15 + (fAttack * 1.5)) * battle.escapeModifier);
    } else if (randMove < 0.75) {
      fishMove = 'El pez se ha calmado intentando soltar el anzuelo.';
      fishTensionMod = -Math.round(10 + (fSpeed * 0.2));
    } else {
      fishMove = 'El pez ha saltado fuera del agua agitando el sedal.';
      fishTensionMod = Math.round((5 + (fAttack * 0.8)) * battle.escapeModifier);
    }

    if (battle.clima === 'Tormenta Marina') {
      fishTensionMod = Math.round(fishTensionMod * 1.35);
    }

    if (fishTensionMod > 0) {
      fishTensionMod = Math.round(fishTensionMod * (1 - reelDamp));
    }

    let userDmg = 0;
    let userTensionMod = 0;
    let battleNarrative = '';

    if (action === 'tirar') {
      userDmg = rodDmg + Math.floor(Math.random() * 8) + 5;
      userTensionMod = 20;
      battleNarrative = `Tiraste del carrete causando ${userDmg} HP de daño.`;
    } else if (action === 'aflojar') {
      userDmg = 0;
      userTensionMod = -25;
      battle.stamina = Math.min(battle.maxStamina, battle.stamina + 5);
      battleNarrative = `Soltaste hilo liberando tensión. El pez recuperó +5 HP.`;
    } else if (action === 'mantener') {
      userDmg = Math.round(rodDmg * 0.45);
      userTensionMod = -5;
      battleNarrative = `Mantuviste la caña firme esperando el momento idóneo.`;
    }

    battle.tension = Math.max(0, battle.tension + fishTensionMod + userTensionMod);
    battle.stamina = Math.max(0, battle.stamina - userDmg);

    let statusMsg = `✦ *Turno ${battle.turns}*\n✦ *Pez:* ${fishMove}\n✦ *Acción:* ${battleNarrative}\n✦ *Tensión:* ${fishTensionMod > 0 ? `+${fishTensionMod}` : fishTensionMod}`;

    if (battle.tension <= 0) {
      await deleteGameSession(ctx.sender, 'fishing');
      user.fishingStats.failedCatches += 1;
      await user.save();
      await ctx.react('💨');
      return ctx.reply(`『 💨 』 *LÍNEA AFLOJADA*\n\n> El anzuelo se resbaló de la boca del *${battle.fish.name}*. El pez escapó 😌`);
    }

    if (battle.tension >= battle.maxTension) {
      await deleteGameSession(ctx.sender, 'fishing');
      user.fishingStats.failedCatches += 1;
      await user.save();
      await ctx.react('💥');
      return ctx.reply(`『 💥 』 *SEDAL ROTO*\n\n> La tensión superó el límite de tu *${lineName}*. El *${battle.fish.name}* escapó 😭`);
    }

    if (battle.stamina <= 0) {
      await deleteGameSession(ctx.sender, 'fishing');
      user.fishingStats.successfulCatches += 1;

      const rarityMultiplier = { basico: 1.0, comun: 1.5, poco_comun: 2.2, raro: 3.5, mistico: 6.0, legendario: 15.0 };
      const mult = rarityMultiplier[battle.fish.rarity] || 1.0;

      const minW = battle.fish.weightKg[0];
      const maxW = battle.fish.weightKg[1];
      const rolledWeight = Number((minW + Math.random() * (maxW - minW)).toFixed(2));

      if (!user.stats) user.stats = {};
      let isNewRecord = false;
      if (rolledWeight > (user.stats.maxFishWeight || 0)) {
        user.stats.maxFishWeight = rolledWeight;
        user.stats.maxFishName = battle.fish.name;
        isNewRecord = true;
      }

      const baseCoins = Math.round(50 * mult);
      const xpGained = Math.round(15 * mult);
      let coinsGained = Math.round(baseCoins * (1 + (user.fishermanLevel || 1) * 0.05));
      let luxGained = 0;

      if (battle.fish.rarity === 'poco_comun' && Math.random() < 0.20) luxGained = 1;
      else if (battle.fish.rarity === 'raro') luxGained = Math.floor(Math.random() * 4) + 2;
      else if (battle.fish.rarity === 'mistico') luxGained = Math.floor(Math.random() * 12) + 6;
      else if (battle.fish.rarity === 'legendario') luxGained = Math.floor(Math.random() * 30) + 15;

      let doubleCatchText = '';
      const hasTrawl = (user.inventory.item_red_arrastre || 0) > 0;
      if (hasTrawl) {
        user.inventory.item_red_arrastre -= 1;
        const fishes = readFishes();
        const lowFishes = fishes.filter(f => f.rarity === 'basico' || f.rarity === 'comun');
        if (lowFishes.length > 0) {
          const extraFish = lowFishes[Math.floor(Math.random() * lowFishes.length)];
          const extraIdStr = String(extraFish.id);
          user.capturedFishes[extraIdStr] = (user.capturedFishes[extraIdStr] || 0) + 1;
          coinsGained += 40;
          doubleCatchText = `\n⚓ *Red de Arrastre:* Capturaste un *${extraFish.name}* extra (+40 ${ZenConfig.currencies.zencoins.emoji}).`;
        }
      }

      user.zencoins = (user.zencoins || 0) + coinsGained;
      user.lux = (user.lux || 0) + luxGained;
      user.fishermanXp = (user.fishermanXp || 0) + xpGained;

      const fishIdStr = String(battle.fish.id);
      user.capturedFishes[fishIdStr] = (user.capturedFishes[fishIdStr] || 0) + 1;
      if (typeof user.markModified === 'function') {
        user.markModified('capturedFishes');
        user.markModified('stats');
      }

      let leveledUp = false;
      let nextXp = (user.fishermanLevel || 1) * 100;
      while (user.fishermanXp >= nextXp) {
        user.fishermanXp -= nextXp;
        user.fishermanLevel = (user.fishermanLevel || 1) + 1;
        leveledUp = true;
        nextXp = (user.fishermanLevel || 1) * 100;
      }

      await user.save();

      let wikiImg = null;
      let wikiDesc = '';
      try {
        const res = await fetch(battle.fish.photoUrl);
        if (res.ok) {
          const json = await res.json();
          wikiImg = json.thumbnail?.source || null;
          wikiDesc = json.extract || '';
        }
      } catch (_) {}

      const rLabels = { basico: 'Básico', comun: 'Común', poco_comun: 'Poco Común', raro: 'Raro', mistico: 'Místico ✦', legendario: 'Legendario 👑' };
      const recordText = isNewRecord ? `\n👑 *¡NUEVO RÉCORD PERSONAL!* Es tu captura más pesada.` : '';
      const victoryText = 
        `『 🏆 』 *CAPTURA EXITOSA*\n\n> ¡Qué crack! 🥳\n\n` +
        `✦ *Pescador:* ${user.name}\n✦ *Pez:* ${battle.fish.name} (${battle.fish.scientificName})\n✦ *Peso:* ${rolledWeight} Kg\n✦ *Rareza:* ${rLabels[battle.fish.rarity]}\n✦ *Hábitat:* ${battle.fish.habitat}\n\n` +
        `✦ *Recompensas:*\n  +${coinsGained} ${ZenConfig.currencies.zencoins.emoji}\n  +${xpGained} XP de Pesca` +
        (luxGained > 0 ? `\n  +${luxGained} ${ZenConfig.currencies.lux.emoji}` : '') +
        doubleCatchText + recordText +
        (wikiDesc ? `\n\n📖 _${wikiDesc}_` : '') +
        (leveledUp ? `\n\n👑 ¡Subiste al nivel *${user.fishermanLevel}* de Pescador!` : '');

      await ctx.react('🏆');
      if (wikiImg) {
        return ctx.sock.sendMessage(ctx.chat, {
          image: { url: wikiImg },
          caption: victoryText,
          mentions: [ctx.sender]
        }, { quoted: ctx.rawMsg });
      }
      return ctx.reply(victoryText);
    }

    await saveGameSession(ctx.sender, 'fishing', battle);

    const txt = `『 🎣 』 *BATALLA DE TENSIÓN*\n\n${statusMsg}\n\n✦ *Pez:* ${battle.fish.name}\n✦ *Stamina:* ${battle.stamina} / ${battle.maxStamina} HP\n✦ *Tensión:* ${drawTensionBar(battle.tension, battle.maxTension)}`;

    const btns = [
      { type: 'quick_reply', text: 'TIRAR 🎣', id: `${ZenConfig.prefix}pescar tirar` },
      { type: 'quick_reply', text: 'AFLOJAR 🧵', id: `${ZenConfig.prefix}pescar aflojar` },
      { type: 'quick_reply', text: 'MANTENER 🛑', id: `${ZenConfig.prefix}pescar mantener` }
    ];

    if ((user.inventory.item_arpon || 0) > 0) {
      btns.push({ type: 'quick_reply', text: 'DISPARAR ARPÓN 🚀', id: `${ZenConfig.prefix}arpon` });
    }

    return ctx.sock.sendButtons(ctx.chat, {
      text: txt,
      footer: ZenConfig.botName,
      buttons: btns
    });
  });
