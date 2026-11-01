import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { drawTensionBar } from '../../lib/game/fishing.js';
import { getGameSession, saveGameSession, deleteGameSession } from '../../lib/services/sessionManager.js';

export default new ZenCommand('arpon')
  .addAlias('arpón')
  .setCooldown(1)
  .setCategory('Economía')
  .requireRegistration()
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

    const battle = await getGameSession(ctx.sender, 'fishing');
    if (!battle) return ctx.reply(`『 ⚠️ 』 *SIN PESCA ACTIVA*\n\n> No tenés un pez en la línea. Usá *${ZenConfig.prefix}lanzar* para comenzar 🫤`);
    
    const arponQty = user.inventory?.item_arpon || 0;
    if (arponQty <= 0) return ctx.reply(`『 ⚠️ 』 *SIN ARPONES*\n\n> No posees Arpones Tácticos en tu inventario 🫤`);
    
    user.inventory.item_arpon = arponQty - 1;
    await user.save();
    battle.turns += 1;
    const userDmg = 80;
    const userTensionMod = 35;
    battle.tension = Math.max(0, battle.tension + userTensionMod);
    battle.stamina = Math.max(0, battle.stamina - userDmg);
    
    if (battle.tension >= battle.maxTension) {
      await deleteGameSession(ctx.sender, 'fishing');
      return ctx.reply(`『 💥 』 *SEDAL ROTO*\n\n> El impacto del arpón rompió tu línea 😵\n> El *${battle.fish.name}* escapó.`);
    }
    
    if (battle.stamina <= 0) {
      await deleteGameSession(ctx.sender, 'fishing');
      return ctx.reply(`『 🏆 』 *CAPTURA EXITOSA*\n\n> ¡El arpón fulminó al pez! 😉\n> Capturaste un *${battle.fish.name}*.\n> Usá *${ZenConfig.prefix}pescar* para ver recompensas.`);
    }

    await saveGameSession(ctx.sender, 'fishing', battle);
    
    const txt = `『 🎣 』 *BATALLA DE TENSIÓN*\n\n> *¡DISPARO DE ARPÓN!* Impacto crítico de -${userDmg} HP 😉\n\n✦ *Pez:* ${battle.fish.name}\n✦ *Stamina:* ${battle.stamina}/${battle.maxStamina} HP\n✦ *Tensión:* ${drawTensionBar(battle.tension, battle.maxTension)}`;
    return ctx.sock.sendButtons(ctx.chat, { 
      text: txt, 
      footer: ZenConfig.botName, 
      buttons: [
        { type: 'quick_reply', text: 'TIRAR 🎣', id: `${ZenConfig.prefix}pescar tirar` }, 
        { type: 'quick_reply', text: 'AFLOJAR 🧵', id: `${ZenConfig.prefix}pescar aflojar` }
      ] 
    });
  });