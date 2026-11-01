import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { 
  readFishes, 
  findSuitableFish, 
  drawTensionBar, 
  getFishingWeather, 
  BAITS, 
  GEAR_LINES 
} from '../../lib/game/fishing.js';
import { getGameSession, saveGameSession } from '../../lib/services/sessionManager.js';

export default new ZenCommand('lanzar')
  .addAlias('cast', 'throw')
  .setCooldown(3)
  .setCategory('Economía')
  .requireRegistration()
  .setUsage('<carnada> <profundidad>')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();

    if (user.loans?.blockedPermanently) {
      await ctx.react('🚫');
      return ctx.reply(V.blocked.permanent(user));
    }

    if (user.loans?.isBlocked && !user.loans?.isPromised) {
      await ctx.react('🔒');
      return ctx.reply(V.blocked.debt(user));
    }

    const [baitInput, depthInput] = ctx.args;

    const activeSession = await getGameSession(ctx.sender, 'fishing');
    if (activeSession) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *PESCA ACTIVA*\n\n> Ya tenés un pez en la línea. Completa tu batalla 🤨`);
    }

    if (!baitInput || !depthInput) {
      await ctx.react('⚠️');
      const helpMsg = 
        `『 🎣 』 *GUÍA DE LANZAMIENTO*\n\n` +
        `✦ *Sintaxis:* ${ZenConfig.prefix}lanzar [cebo] [profundidad]\n\n` +
        `✦ *Cebos:* lombriz, senuelo, carne, esencia\n✦ *Profundidades:* superficie, media, profundo\n\n` +
        `> _Ejemplo: ${ZenConfig.prefix}lanzar lombriz superficie_\n\n` +
        `> _Compra cebos: ${ZenConfig.prefix}pescartienda comprar cebo lombriz 5_`;
      return ctx.reply(helpMsg);
    }

    const cleanBait = baitInput.toLowerCase();
    const cleanDepth = depthInput.toLowerCase();

    if (!BAITS[cleanBait]) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *CEBO INVÁLIDO*\n\n> Opciones válidas: *lombriz*, *senuelo*, *carne* o *esencia*.`);
    }

    if (!['superficie', 'media', 'profundo'].includes(cleanDepth)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *PROFUNDIDAD INVÁLIDA*\n\n> Opciones válidas: *superficie*, *media* o *profundo*.`);
    }

    if (!user.inventory) user.inventory = {};
    const count = user.inventory[`bait_${cleanBait}`] || 0;
    if (count <= 0) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *SIN CEBOS*\n\n` +
        `> No tenés ese cebo 🥲\n> Compralo con:\n> *${ZenConfig.prefix}pescartienda comprar cebo ${cleanBait} 5* 😕`
      );
    }

    user.inventory[`bait_${cleanBait}`] = count - 1;
    await user.save();

    const currentClima = getFishingWeather();
    const fishes = readFishes();
    const hasSonar = !!user.inventory.item_sonar;

    let successRate = 0.90;
    if (hasSonar) successRate *= 1.15;
    if (currentClima === 'Niebla Densa') successRate *= 0.75;
    if (currentClima === 'Lluvioso') successRate *= 1.10;

    if (Math.random() > successRate) {
      await ctx.react('💨');
      return ctx.reply(`『 💨 』 *LANZAMIENTO FALLIDO*\n\n> Clima: *${currentClima}*... la marea arrastró la carnada.`);
    }

    const targetFish = findSuitableFish(fishes, cleanBait, cleanDepth);

    if (!targetFish) {
      await ctx.react('💨');
      return ctx.reply(`『 💨 』 *SIN PICADA*\n\n> Tu *${BAITS[cleanBait].name}* en zona *${cleanDepth}* no atrajo nada 🫤`);
    }

    const activeLine = user.currentLine || 'hilo_nylon';
    const lineObj = GEAR_LINES[activeLine];
    const maxLineTension = typeof lineObj === 'object' ? lineObj.maxT : (typeof lineObj === 'number' ? lineObj : 100);

    let escapeModifier = hasSonar ? 0.85 : 1.0;
    if (currentClima === 'Tormenta Marina') escapeModifier *= 1.25;

    const battle = {
      userId: ctx.sender,
      fish: targetFish,
      stamina: targetFish.stats.hp,
      maxStamina: targetFish.stats.hp,
      tension: 30,
      maxTension: maxLineTension,
      turns: 0,
      clima: currentClima,
      escapeModifier
    };

    await saveGameSession(ctx.sender, 'fishing', battle);
    await ctx.react('🎣');

    const txt = `『 🎣 』 *PIQUE EN LA LÍNEA*\n\n` +
                `> ¡Un pez picó tu anzuelo! Clima: *${currentClima}* 😉\n\n` +
                `✦ *Pez:* ${targetFish.name}\n✦ *Stamina:* ${battle.stamina} / ${battle.maxStamina} HP\n✦ *Tensión:* ${drawTensionBar(battle.tension, battle.maxTension)}`;

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