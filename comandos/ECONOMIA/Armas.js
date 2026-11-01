import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { WEAPONS } from '../../lib/game/weapons.js';
import { ZenConfig } from '../../zen.config.js';
import { WEAPON_IMAGES, WEAPON_CATALOG_IMAGE } from '../../lib/game/assetUrls.js';
const BENEFITS = { rifle_cerrojo: `✦ *Tiro Perfecto:* 15% de probabilidad de duplicar ganancias de caza.` };
const ARMORY_CATALOG_IMAGE = WEAPON_CATALOG_IMAGE;

export default new ZenCommand('armas')
  .addAlias('armeria', 'weapon')
  .setCooldown(5)
  .setCategory('Economía')
  .requireRegistration()
  .setUsage('<comprar|reparar|mejorar> <id>')
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

    const [action, target] = ctx.args;
    const zc = ZenConfig.currencies.zencoins;
    const lux = ZenConfig.currencies.lux;

    if (!action) {
      await ctx.react('⚔️');
      const weaponList = Object.values(WEAPONS).map(w => {
        const isEquipped = user.currentWeapon === w.id ? ' ◄ [EQUIPADO]' : '';
        return `✦ *${w.name}* [ID: ${w.id}]\n  ${w.costZen}${zc.emoji}  |  ATK: ${w.baseAttack}${isEquipped}`;
      }).join('\n\n');
      const active = WEAPONS[user.currentWeapon] || WEAPONS.lanza_rustica;
      return ctx.sock.sendMessage(ctx.chat, {
        image: { url: ARMORY_CATALOG_IMAGE },
        caption: `『 ⚔️ 』 *ARMERÍA DE CAZA*\n\n✦ *Equipo actual:* ${active.name}\n✦ *Nivel:* ${user.weaponLevel || 1}/10\n✦ *Estado:* ${user.weaponDurability ?? active.maxDurability}/${active.maxDurability} ⚙️\n\n${weaponList}\n\n✦ *${ZenConfig.prefix}${ctx.commandName} comprar [id]*\n✦ *${ZenConfig.prefix}${ctx.commandName} mejorar*\n✦ *${ZenConfig.prefix}${ctx.commandName} reparar*`,
        mentions: [ctx.sender]
      }, { quoted: ctx.rawMsg });
    }

    const sub = action.toLowerCase();

    if (sub === 'reparar') {
      const active = WEAPONS[user.currentWeapon] || WEAPONS.lanza_rustica;
      const maxD = active.maxDurability || 100;
      const currentD = user.weaponDurability ?? maxD;
      const missing = maxD - currentD;
      if (missing <= 0) return ctx.reply(`『 ⚠️ 』 *ESTADO ÓPTIMO*\n\n> Tu *${active.name}* ya está al 100% 😌`);
      if (active.id === 'lanza_rustica') {
        user.weaponDurability = maxD;
        await user.save();
        return ctx.reply(`『 ✨ 』 *REEMPLAZO GRATUITO*\n\n> Tu Lanza Rústica fue renovada sin costo 😌`);
      }
      const costZen = missing * (user.weaponLevel || 1) * 3;
      const costLux = Math.ceil(missing * 0.1);
      if (user.zencoins < costZen || user.lux < costLux) return ctx.reply(`『 ⚠️ 』 *FONDOS INSUFICIENTES*\n\n> Uf, así no se puede 😬\n> Costo: ${costZen}${zc.emoji} + ${costLux}${lux.emoji}`);
      user.zencoins -= costZen;
      user.lux -= costLux;
      user.weaponDurability = maxD;
      await user.save();
      return ctx.reply(`『 ✨ 』 *REPARACIÓN EXITOSA*\n\n> ¡Listo! 🤩\n\n> *${active.name}* restaurada al 100% (${maxD}/${maxD} ⚙️).`);
    }

    if (sub === 'comprar') {
      if (!target) return ctx.reply(`『 ⚠️ 』 *ID REQUERIDA*\n\n> Indicá la ID del arma 🤔`);
      const id = target.toLowerCase();
      const weapon = WEAPONS[id];
      if (!weapon) return ctx.reply(`『 ⚠️ 』 *ID INVÁLIDA*\n\n> No existe un arma con ID: *${target}* 😵‍💫`);
      if (user.currentWeapon === id) return ctx.reply(`『 ⚠️ 』 *YA EQUIPADA*\n\n> Ya tenés esa arma activa 😏`);
      if ((user.hunterLevel || 1) < weapon.reqLevel) return ctx.reply(`『 ⚠️ 』 *NIVEL BAJO*\n\n> Requiere Nvl. ${weapon.reqLevel} de Cazador 😄`);
      if (user.zencoins < weapon.costZen || user.lux < weapon.costLux) return ctx.reply(`『 ⚠️ 』 *FONDOS INSUFICIENTES*`);
      user.zencoins -= weapon.costZen;
      user.lux -= weapon.costLux;
      user.currentWeapon = id;
      user.weaponLevel = 1;
      user.weaponDurability = weapon.maxDurability;
      await user.save();
      const successText = `『 ⚔️ 』 *ARMA ADQUIRIDA*\n\n> Equipaste un *${weapon.name}* [Nvl. 1] 😉\n\n✦ *Ataque:* ${weapon.baseAttack}\n✦ *Velocidad:* ${weapon.baseSpeed}\n✦ *Durabilidad:* ${weapon.maxDurability} ⚙️\n${BENEFITS[id] ? `\n${BENEFITS[id]}` : ''}`;
      if (WEAPON_IMAGES[id]) return ctx.sock.sendMessage(ctx.chat, { image: { url: WEAPON_IMAGES[id] }, caption: successText, mentions: [ctx.sender] }, { quoted: ctx.rawMsg });
      return ctx.reply(successText);
    }

    if (sub === 'mejorar' || sub === 'upgrade') {
      const active = WEAPONS[user.currentWeapon] || WEAPONS.lanza_rustica;
      if ((user.weaponLevel || 1) >= 10) return ctx.reply(`『 ⚠️ 』 *NIVEL MÁXIMO*\n\n> El arma ya alcanzó su tope 🙂`);
      const upgradeCost = (user.weaponLevel || 1) * 50;
      if (user.lux < upgradeCost) return ctx.reply(`『 ⚠️ 』 *${ZenConfig.currencies.lux.name.toUpperCase()} INSUFICIENTE*\n\n> Necesitás ${upgradeCost}${lux.emoji} 🥺`);
      user.lux -= upgradeCost;
      user.weaponLevel = (user.weaponLevel || 1) + 1;
      await user.save();
      return ctx.reply(`『 ✨ 』 *MEJORA EXITOSA*\n\n> *${active.name}* subió a Nivel *${user.weaponLevel}* 🤩\n✦ *Nuevo Daño:* ${active.baseAttack + (user.weaponLevel * 5)} ATK`);
    }
  });
