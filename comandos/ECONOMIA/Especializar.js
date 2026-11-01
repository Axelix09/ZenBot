import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { SPECIALIZATIONS, MAX_LEVEL, SWITCH_COST, getSpec, levelUpCost, bonusPercent, ensureMarket } from '../../lib/economy/pulgas.js';

const coin = ZenConfig.currencies.zencoins.emoji;
const perLevelText = (spec) => `${spec.text(bonusPercent(spec.perLevel))} por nivel`;

export default new ZenCommand('especializar')
  .addAlias('specialize', 'especialidad')
  .setCooldown(10)
  .setCategory('Economía')
  .requireRegistration()
  .setUsage('<tipo>')
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

    const [type] = ctx.args;
    const current = getSpec(user);

    if (!type) {
      await ctx.react('🎯');
      const list = Object.entries(SPECIALIZATIONS)
        .map(([id, spec]) => `  • ${spec.name} [${id}] - ${perLevelText(spec)}`)
        .join('\n');

      const costs = [`  • Elegir o cambiar: *${SWITCH_COST}* ${coin} (el nivel vuelve a 1)`];
      if (current.id && current.level < MAX_LEVEL) {
        costs.push(`  • Subir a nivel ${current.level + 1}: *${levelUpCost(current.level)}* ${coin}`);
      }

      return ctx.reply(
        `『 🎯 』 *ESPECIALIZACIONES*\n\n` +
        `> Elegí en qué sos bueno y tus negocios en el mercado de pulgas mejoran 😎\n\n` +
        `✦ *Actual:* ${current.id ? `${current.spec.name} · Nivel ${current.level}/${MAX_LEVEL}` : 'Ninguna'}\n` +
        (current.id ? `✦ *Efecto:* ${current.spec.text(bonusPercent(current.bonus))}\n` : '') +
        `\n✦ *Disponibles:*\n${list}\n\n` +
        `✦ *Costos:*\n${costs.join('\n')}\n\n` +
        `✦ *Uso:* ${ZenConfig.prefix}${ctx.commandName} [tipo]\n> _Ejemplo: ${ZenConfig.prefix}${ctx.commandName} arte_`
      );
    }

    const id = type.toLowerCase();
    const spec = SPECIALIZATIONS[id];
    if (!spec) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *ESPECIALIZACIÓN NO ENCONTRADA*\n\n> Busqué y nada 🥲\n> Opciones: ${Object.keys(SPECIALIZATIONS).join(', ')}`);
    }

    let cost;
    let newLevel;
    const isLevelUp = current.id === id;

    if (isLevelUp) {
      if (current.level >= MAX_LEVEL) {
        await ctx.react('🏆');
        return ctx.reply(`『 🏆 』 *NIVEL MÁXIMO*\n\n> Ya sos experto en ${spec.name} (nivel ${MAX_LEVEL}/${MAX_LEVEL}) 😎`);
      }
      cost = levelUpCost(current.level);
      newLevel = current.level + 1;
    } else {
      cost = SWITCH_COST;
      newLevel = 1;
    }

    if (user.zencoins < cost) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SALDO INSUFICIENTE*\n\n> Necesitás *${cost}* ${coin} y solo tenés ${user.zencoins} ${coin} 🥺`);
    }

    const market = ensureMarket(user);
    user.zencoins -= cost;
    market.specialization = id;
    market.specializationLevel = newLevel;

    if (typeof user.markModified === 'function') {
      user.markModified('market');
    }

    await user.save();
    await ctx.react('🎯');

    const lostLevel = !isLevelUp && current.id
      ? `\n> Perdiste tu nivel ${current.level} de ${current.spec.name} 😬`
      : '';

    return ctx.reply(
      `『 🎯 』 *${isLevelUp ? 'NIVEL SUBIDO' : 'ESPECIALIZACIÓN ELEGIDA'}*\n\n> ${isLevelUp ? '¡Qué crack! 🥳' : '¡Listo! 🤩'}${lostLevel}\n\n` +
      `✦ *Especialización:* ${spec.name}\n✦ *Nivel:* ${newLevel}/${MAX_LEVEL}\n✦ *Efecto:* ${spec.text(bonusPercent(spec.perLevel * newLevel))}\n✦ *Costo:* ${cost} ${coin}`
    );
  });
