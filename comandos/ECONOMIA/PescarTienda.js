import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { FISHING_GEAR as GEAR, BAITS, UTILITIES } from '../../lib/game/fishing.js';

export default new ZenCommand('pescartienda')
  .addAlias('shoppesca', 'tiendapesca')
  .setCooldown(3)
  .setCategory('Economía')
  .requireRegistration()
  .setUsage('<comprar|vender> <categoría> <item> <cantidad>')
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

    const [sub, cat, targetId, qtyRaw] = ctx.args;
    const qty = Math.max(1, parseInt(qtyRaw, 10) || 1);

    if (!user.inventory) user.inventory = {};

    if (!sub) {
      await ctx.react('🛒');
      let txt = `『 🛒 』 *TIENDA DE PESCA*\n\n` +
                `✦ *Fondos:* ${user.zencoins} ${ZenConfig.currencies.zencoins.emoji}  |  ${user.lux || 0} ${ZenConfig.currencies.lux.emoji}\n\n` +
                `✦ *CEBOS* (comprar cebo [id] [cantidad])\n`;

      Object.entries(BAITS).forEach(([id, b]) => {
        txt += `  • *${b.name}* [${id}]\n    Costo: ${b.cost} ${ZenConfig.currencies.zencoins.emoji} ${b.lux > 0 ? `+ ${b.lux} ${ZenConfig.currencies.lux.emoji}` : ''}\n    _${b.desc}_\n\n`;
      });

      txt += `✦ *UTENSILIOS* (comprar objeto [id] [cantidad])\n`;
      Object.entries(UTILITIES).forEach(([id, u]) => {
        txt += `  • *${u.name}* [${id}]\n    Costo: ${u.cost} ${ZenConfig.currencies.zencoins.emoji} ${u.lux > 0 ? `+ ${u.lux} ${ZenConfig.currencies.lux.emoji}` : ''}\n    _${u.desc}_\n\n`;
      });

      txt += `✦ *CAÑAS* (comprar cana [id])\n`;
      Object.entries(GEAR.rods).forEach(([id, r]) => {
        txt += `  • *${r.name}* [${id}]\n    Costo: ${r.cost} ${ZenConfig.currencies.zencoins.emoji} + ${r.lux} ${ZenConfig.currencies.lux.emoji}\n    Poder: +${r.dmg} fuerza\n\n`;
      });

      txt += `✦ *CARRETES* (comprar carrete [id])\n`;
      Object.entries(GEAR.reels).forEach(([id, r]) => {
        txt += `  • *${r.name}* [${id}]\n    Costo: ${r.cost} ${ZenConfig.currencies.zencoins.emoji} + ${r.lux} ${ZenConfig.currencies.lux.emoji}\n    Amortigua: ${r.damp * 100}% tirones\n\n`;
      });

      txt += `✦ *SEDALES* (comprar sedal [id])\n`;
      Object.entries(GEAR.lines).forEach(([id, r]) => {
        txt += `  • *${r.name}* [${id}]\n    Costo: ${r.cost} ${ZenConfig.currencies.zencoins.emoji} + ${r.lux} ${ZenConfig.currencies.lux.emoji}\n    Tensión: ${r.maxT}\n\n`;
      });

      return ctx.reply(txt);
    }

    if (sub.toLowerCase() === 'comprar') {
      const cleanCat = cat?.toLowerCase();
      const cleanTarget = targetId?.toLowerCase();

      if (cleanCat === 'cebo') {
        const bait = BAITS[cleanTarget];
        if (!bait) {
          await ctx.react('⚠️');
          return ctx.reply(`『 ⚠️ 』 *CEBO NO ENCONTRADO*\n\n> Busqué y nada 🥲\n> ID: *${cleanTarget}* no existe.`);
        }

        const totalZen = bait.cost * qty;
        const totalLux = (bait.lux || 0) * qty;

        if (user.zencoins < totalZen || (user.lux || 0) < totalLux) {
          await ctx.react('⚠️');
          return ctx.reply(`『 ⚠️ 』 *FONDOS INSUFICIENTES*\n\n> Uf, así no se puede 😬\n> Costo: ${totalZen} ${ZenConfig.currencies.zencoins.emoji} + ${totalLux} ${ZenConfig.currencies.lux.emoji}`);
        }

        user.zencoins -= totalZen;
        user.lux = (user.lux || 0) - totalLux;
        user.inventory[`bait_${cleanTarget}`] = (user.inventory[`bait_${cleanTarget}`] || 0) + qty;

        await user.save();
        await ctx.react('✨');
        return ctx.reply(`『 ✨ 』 *COMPRA EXITOSA*\n\n> Compraste *${qty}* de *${bait.name}* 😉`);
      }

      if (cleanCat === 'objeto') {
        const util = UTILITIES[cleanTarget];
        if (!util) {
          await ctx.react('⚠️');
          return ctx.reply(`『 ⚠️ 』 *OBJETO NO ENCONTRADO*\n\n> Hmm, eso no aparece 🤔\n> ID: *${cleanTarget}* no existe.`);
        }

        if (cleanTarget === 'sonar' && user.inventory.item_sonar) {
          await ctx.react('⚠️');
          return ctx.reply(`『 ⚠️ 』 *YA POSEEÍDO*\n\n> Ya tenés el Sonar Ultrasónico instalado 🤨`);
        }

        const totalZen = util.cost * qty;
        const totalLux = (util.lux || 0) * qty;

        if (user.zencoins < totalZen || (user.lux || 0) < totalLux) {
          await ctx.react('⚠️');
          return ctx.reply(`『 ⚠️ 』 *FONDOS INSUFICIENTES*\n\n> Uf, así no se puede 😬\n> Costo: ${totalZen} ${ZenConfig.currencies.zencoins.emoji} + ${totalLux} ${ZenConfig.currencies.lux.emoji}`);
        }

        user.zencoins -= totalZen;
        user.lux = (user.lux || 0) - totalLux;
        user.inventory[`item_${cleanTarget}`] = (user.inventory[`item_${cleanTarget}`] || 0) + qty;

        await user.save();
        await ctx.react('✨');
        return ctx.reply(`『 ✨ 』 *COMPRA EXITOSA*\n\n> Adquiriste *${qty}* de *${util.name}* 😉`);
      }

      if (cleanCat === 'cana') {
        const rod = GEAR.rods[cleanTarget];
        if (!rod) {
          await ctx.react('⚠️');
          return ctx.reply(`『 ⚠️ 』 *CAÑA NO ENCONTRADA*\n\n> Busqué y nada 🥲\n> ID: *${cleanTarget}* no existe.`);
        }

        if (user.currentRod === cleanTarget) {
          await ctx.react('⚠️');
          return ctx.reply(`『 ⚠️ 』 *YA EQUIPADA*\n\n> Ya tenés esta caña 😏`);
        }

        if (user.zencoins < rod.cost || (user.lux || 0) < rod.lux) {
          await ctx.react('⚠️');
          return ctx.reply(`『 ⚠️ 』 *FONDOS INSUFICIENTES*\n\n> Uf, así no se puede 😬\n> Costo: ${rod.cost} ${ZenConfig.currencies.zencoins.emoji} + ${rod.lux} ${ZenConfig.currencies.lux.emoji}`);
        }

        user.zencoins -= rod.cost;
        user.lux = (user.lux || 0) - rod.lux;
        user.currentRod = cleanTarget;

        await user.save();
        await ctx.react('✨');
        return ctx.reply(`『 ✨ 』 *CAÑA EQUIPADA*\n\n> Adquiriste una *${rod.name}* 😌`);
      }

      if (cleanCat === 'carrete') {
        const reel = GEAR.reels[cleanTarget];
        if (!reel) {
          await ctx.react('⚠️');
          return ctx.reply(`『 ⚠️ 』 *CARRETE NO ENCONTRADO*\n\n> Hmm, eso no aparece 🤔\n> ID: *${cleanTarget}* no existe.`);
        }

        if (user.currentReel === cleanTarget) {
          await ctx.react('⚠️');
          return ctx.reply(`『 ⚠️ 』 *YA EQUIPADO*\n\n> Ya tenés este carrete 😏`);
        }

        if (user.zencoins < reel.cost || (user.lux || 0) < reel.lux) {
          await ctx.react('⚠️');
          return ctx.reply(`『 ⚠️ 』 *FONDOS INSUFICIENTES*\n\n> Uf, así no se puede 😬\n> Costo: ${reel.cost} ${ZenConfig.currencies.zencoins.emoji} + ${reel.lux} ${ZenConfig.currencies.lux.emoji}`);
        }

        user.zencoins -= reel.cost;
        user.lux = (user.lux || 0) - reel.lux;
        user.currentReel = cleanTarget;

        await user.save();
        await ctx.react('✨');
        return ctx.reply(`『 ✨ 』 *CARRETE EQUIPADO*\n\n> Adquiriste un *${reel.name}* 😉`);
      }

      if (cleanCat === 'sedal') {
        const line = GEAR.lines[cleanTarget];
        if (!line) {
          await ctx.react('⚠️');
          return ctx.reply(`『 ⚠️ 』 *SEDAL NO ENCONTRADO*\n\n> Hmm, eso no aparece 🤔\n> ID: *${cleanTarget}* no existe.`);
        }

        if (user.currentLine === cleanTarget) {
          await ctx.react('⚠️');
          return ctx.reply(`『 ⚠️ 』 *YA EQUIPADO*\n\n> Ya tenés este sedal 😏`);
        }

        if (user.zencoins < line.cost || (user.lux || 0) < line.lux) {
          await ctx.react('⚠️');
          return ctx.reply(`『 ⚠️ 』 *FONDOS INSUFICIENTES*\n\n> Uf, así no se puede 😬\n> Costo: ${line.cost} ${ZenConfig.currencies.zencoins.emoji} + ${line.lux} ${ZenConfig.currencies.lux.emoji}`);
        }

        user.zencoins -= line.cost;
        user.lux = (user.lux || 0) - line.lux;
        user.currentLine = cleanTarget;

        await user.save();
        await ctx.react('✨');
        return ctx.reply(`『 ✨ 』 *SEDAL EQUIPADO*\n\n> Adquiriste un *${line.name}* 😄`);
      }
    }

    await ctx.react('⚠️');
    return ctx.reply(`『 ⚠️ 』 *ACCIÓN INVÁLIDA*\n\n> Usá *${ZenConfig.prefix}${ctx.commandName}* para ver el catálogo 🤔`);
  });
