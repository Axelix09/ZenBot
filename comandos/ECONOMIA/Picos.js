import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { PICKAXES } from '../../lib/game/pickaxes.js';
import { ZenConfig } from '../../zen.config.js';
import { PICKAXE_IMAGES, PICKAXE_CATALOG_IMAGE, getPickaxeImage } from '../../lib/game/assetUrls.js';

const BENEFITS = {
  pico_diamante: `✦ *Fortuna:* 15% de duplicar ${ZenConfig.currencies.zencoins.name} y ${ZenConfig.currencies.lux.name} al minar.`
};

const BLACKSMITH_CATALOG_IMAGE = PICKAXE_CATALOG_IMAGE;

export default new ZenCommand('picos')
  .addAlias('herrería', 'herrera', 'pico', 'pickaxe', 'upgrade-pico')
  .setCooldown(5)
  .setCategory('Economía')
  .requireRegistration()
  .setUsage('<comprar|equipar> <pico>')
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

    if (!action) {
      await ctx.react('⚒️');
      const pickList = Object.values(PICKAXES).map(p => {
        const isEquipped = user.currentPickaxe === p.id ? '◄ [EQUIPADO]' : '';
        const labels = { basico: 'Básico', comun: 'Común', poco_comun: 'Poco Común', raro: 'Raro', mistico: 'Místico ✦', legendario: 'Legendario 👑' };
        return `✦ *${p.name}* [${p.id}]\n  Req: Nvl ${p.reqLevel} Minero\n  Costo: ${p.costZen} ${ZenConfig.currencies.zencoins.emoji} + ${p.costLux} ${ZenConfig.currencies.lux.emoji}\n  Capacidad: ${labels[p.maxRarity]}\n  ${p.baseEfficiency} EFC  |  ${p.baseLuck} LCK  |  ${p.maxDurability} ⚙️\n  ${isEquipped}`;
      }).join('\n\n');

      const active = PICKAXES[user.currentPickaxe] || PICKAXES.pico_madera;
      const maxD = active.maxDurability || 100;
      const currentD = user.pickaxeDurability ?? maxD;

      const catalogText = 
        `『 ⚒️ 』 *HERRERÍA DE PICOS*\n\n` +
        `✦ *Pico actual:* ${active.name} (Nvl ${user.pickaxeLevel || 1}/10)\n✦ *Durabilidad:* ${currentD}/${maxD} ⚙️\n✦ *Fondos:* ${user.zencoins || 0} ${ZenConfig.currencies.zencoins.emoji}  |  ${user.lux || 0} ${ZenConfig.currencies.lux.emoji}\n\n${pickList}\n\n` +
        `✦ *${ZenConfig.prefix}${ctx.commandName} comprar [id]* ➜ Adquirir pico\n✦ *${ZenConfig.prefix}${ctx.commandName} mejorar* ➜ Subir nivel (+${ZenConfig.currencies.lux.name})\n✦ *${ZenConfig.prefix}${ctx.commandName} reparar* ➜ Restaurar durabilidad`;

      return ctx.sock.sendMessage(ctx.chat, {
        image: { url: getPickaxeImage(active.id, user.pickaxeLevel || 1, currentD, maxD) || BLACKSMITH_CATALOG_IMAGE },
        caption: catalogText,
        mentions: [ctx.sender]
      }, { quoted: ctx.rawMsg });
    }

    const sub = action.toLowerCase();

    if (sub === 'reparar') {
      const active = PICKAXES[user.currentPickaxe] || PICKAXES.pico_madera;
      const maxD = active.maxDurability || 100;
      const currentD = user.pickaxeDurability ?? maxD;
      const missing = maxD - currentD;

      if (missing <= 0) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *ESTADO ÓPTIMO*\n\n> Tu *${active.name}* ya está al 100% 😄`);
      }

      if (active.id === 'pico_madera') {
        user.pickaxeDurability = maxD;
        await user.save();
        await ctx.react('✨');
        return ctx.reply(`『 ✨ 』 *REEMPLAZO GRATUITO*\n\n> Tu Pico de Madera fue renovado 🙂`);
      }

      const costZen = missing * (user.pickaxeLevel || 1) * 3;
      const costLux = Math.ceil(missing * 0.1);

      if (user.zencoins < costZen || user.lux < costLux) {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *FONDOS INSUFICIENTES*\n\n> Uf, así no se puede 😬\n\n` +
          `✦ *Costo:* ${costZen} ${ZenConfig.currencies.zencoins.emoji} + ${costLux} ${ZenConfig.currencies.lux.emoji}\n✦ *Disponible:* ${user.zencoins} ${ZenConfig.currencies.zencoins.emoji}  |  ${user.lux} ${ZenConfig.currencies.lux.emoji}`
        );
      }

      user.zencoins -= costZen;
      user.lux -= costLux;
      user.pickaxeDurability = maxD;

      await user.save();
      await ctx.react('✨');

      return ctx.reply(`『 ✨ 』 *REPARACIÓN EXITOSA*\n\n> ¡Eso estuvo bueno! 😄\n\n> *${active.name}* restaurado al 100% (${maxD}/${maxD} ⚙️).`);
    }

    if (sub === 'comprar') {
      if (!target) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *ID REQUERIDA*\n\n> Revisá cómo lo escribiste 🧐\n\n> Revisá cómo lo escribiste 🧐\n> Ejemplo: *${ZenConfig.prefix}${ctx.commandName} comprar pico_hierro*`);
      }

      const id = target.toLowerCase();
      const pick = PICKAXES[id];

      if (!pick) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *ID INVÁLIDA*\n\n> Revisá cómo lo escribiste 🧐\n\n> Revisá cómo lo escribiste 🧐\n> No existe: *${target}*`);
      }

      if (user.currentPickaxe === id) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *YA EQUIPADO*\n\n> Ya tenés ese pico 😅`);
      }

      if ((user.minerLevel || 1) < pick.reqLevel) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *NIVEL BAJO*\n\n> Requiere Nvl ${pick.reqLevel} de Minero 😄`);
      }

      if ((user.zencoins || 0) < pick.costZen || (user.lux || 0) < pick.costLux) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *FONDOS INSUFICIENTES*\n\n> Uf, así no se puede 😬\n> Costo: ${pick.costZen} ${ZenConfig.currencies.zencoins.emoji} + ${pick.costLux} ${ZenConfig.currencies.lux.emoji}`);
      }

      user.zencoins -= pick.costZen;
      user.lux -= pick.costLux;
      user.currentPickaxe = id;
      user.pickaxeLevel = 1;
      user.pickaxeDurability = pick.maxDurability;

      await user.save();
      await ctx.react('✨');

      const img = PICKAXE_IMAGES[id];
      const benefitText = BENEFITS[id] ? `\n${BENEFITS[id]}` : '';
      const labels = { basico: 'Básico', comun: 'Común', poco_comun: 'Poco Común', raro: 'Raro', mistico: 'Místico ✦', legendario: 'Legendario 👑' };
      const maxRarLabel = labels[pick.maxRarity] || 'Básico';

      const successText = 
        `『 ⚒️ 』 *PICO ADQUIRIDO*\n\n> ¡Bien ahí! 😎\n\n` +
        `✦ *Nombre:* ${pick.name} [Nvl 1]\n✦ *Eficiencia:* ${pick.baseEfficiency} EFC\n✦ *Suerte:* ${pick.baseLuck} LCK\n✦ *Durabilidad:* ${pick.maxDurability} ⚙️\n✦ *Capacidad:* ${maxRarLabel}${benefitText}`;

      if (img) {
        return ctx.sock.sendMessage(ctx.chat, {
          image: { url: img },
          caption: successText,
          mentions: [ctx.sender]
        }, { quoted: ctx.rawMsg });
      }

      return ctx.reply(successText);
    }

    if (sub === 'mejorar' || sub === 'upgrade') {
      const active = PICKAXES[user.currentPickaxe] || PICKAXES.pico_madera;

      if ((user.pickaxeLevel || 1) >= 10) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *NIVEL MÁXIMO*\n\n> Tu *${active.name}* ya está al máximo (10) 🙂`);
      }

      const currentLvl = user.pickaxeLevel || 1;
      const upgradeCost = currentLvl * 65;

      if ((user.lux || 0) < upgradeCost) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *${ZenConfig.currencies.lux.name.toUpperCase()} INSUFICIENTE*\n\n> Uf, así no se puede 😬\n> Costo: ${upgradeCost} ${ZenConfig.currencies.lux.emoji} (Tenés: ${user.lux || 0})`);
      }

      user.lux -= upgradeCost;
      user.pickaxeLevel = currentLvl + 1;

      await user.save();
      await ctx.react('✨');
      return ctx.reply(`『 ✨ 』 *MEJORA EXITOSA*\n\n> *${active.name}* subió a Nivel *${user.pickaxeLevel}* 😎\n✦ *Nuevos atributos:* ${active.baseEfficiency + (user.pickaxeLevel * 6)} EFC  |  ${active.baseLuck + (user.pickaxeLevel * 4)} LCK`);
    }

    await ctx.react('⚠️');
    return ctx.reply(`『 ⚠️ 』 *ACCIÓN INVÁLIDA*\n\n> Revisá cómo lo escribiste 🧐\n\n> Revisá cómo lo escribiste 🧐\n> Usá: *${ZenConfig.prefix}${ctx.commandName} comprar [id]*, *${ZenConfig.prefix}${ctx.commandName} mejorar* o *${ZenConfig.prefix}${ctx.commandName} reparar*.`);
  });
