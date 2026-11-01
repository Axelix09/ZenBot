import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { STREAK_ACTIVATION_DAYS } from '../../lib/database/userCore.js';
import { getStreakPetImage, getStreakPetStage } from '../../lib/game/assetUrls.js';
import { renderHtmlCard } from '../../lib/cards/htmlCard.js';

const HATCH_DAYS = 7;
const PET_NAME = 'Lobo de Racha';

const ensurePet = (user) => {
  if (!user.streakPet) user.streakPet = {};
  user.streakPet.species ||= 'lobo';
  user.streakPet.stage ||= 'egg';
  user.streakPet.activated ??= false;
  user.streakPet.hatched ??= false;
  return user.streakPet;
};

const sendPet = async (ctx, caption, streak, card = {}) => {
  const payload = { caption, mentions: [ctx.sender] };
  try {
    const image = await renderHtmlCard({
      eyebrow: `${ZenConfig.botName.toUpperCase()} · MASCOTA`,
      title: card.title || PET_NAME,
      subtitle: card.subtitle || '',
      accent: '#22d3ee',
      accent2: '#f97316',
      art: getStreakPetImage(streak),
      stats: [{ label: 'Racha', value: `${streak} días`, note: 'actual' }, ...(card.stats || [])],
      rows: card.rows || [],
      caption: card.caption || ''
    });
    return await ctx.sock.sendMessage(ctx.chat, { image, ...payload }, { quoted: ctx.rawMsg });
  } catch {
    try {
      return await ctx.sock.sendMessage(ctx.chat, { image: getStreakPetImage(streak), ...payload }, { quoted: ctx.rawMsg });
    } catch {
      return ctx.reply(caption);
    }
  }
};

export default new ZenCommand('mascota')
  .addAlias('pet', 'lobito', 'lobo', 'vermascota')
  .setCooldown(3)
  .setCategory('Perfil')
  .requireRegistration()
  .setUsage('<activar|eclosionar|ver>')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const pet = ensurePet(user);
    const action = (ctx.args[0] || 'ver').toLowerCase();
    const streak = user.streak || 0;

    if (action === 'activar' || action === 'activar-rachas') {
      if (pet.activated) return ctx.reply(`『 🐺 』 *MASCOTA YA ACTIVADA*\n\n> Tu *${PET_NAME}* ya está vinculada a tu racha 😄`);
      if (streak < STREAK_ACTIVATION_DAYS) {
        return ctx.reply(`『 🔒 』 *RACHA INSUFICIENTE*\n\n> Mantené ${STREAK_ACTIVATION_DAYS} días seguidos para activar a tu mascota 😬\n> Progreso: ${streak}/${STREAK_ACTIVATION_DAYS}`);
      }
      pet.activated = true;
      pet.stage = 'egg';
      await user.save();
      await ctx.react('🥚');
      return sendPet(ctx, `『 🐺 』 *MASCOTA ACTIVADA*\n\n> Vinculaste un huevo de *${PET_NAME}* a tu racha 🥳\n> Sigue hasta el día ${HATCH_DAYS} y usa *${ctx.commandName} eclosionar* para despertarlo.\n> Racha actual: ${streak} días`, streak, {
        title: 'Mascota activada',
        subtitle: `Huevo de ${PET_NAME} vinculado a tu racha`,
        stats: [{ label: 'Estado', value: 'Huevo', note: 'activado' }, { label: 'Eclosión', value: `Día ${HATCH_DAYS}`, note: 'de racha' }],
        caption: `Usa ${ctx.commandName} eclosionar desde el día ${HATCH_DAYS}`
      });
    }

    if (action === 'eclosionar' || action === 'eclosiona' || action === 'hatch') {
      if (!pet.activated) return ctx.reply(`『 🔒 』 *MASCOTA NO ACTIVADA*\n\n> Usá *${ctx.commandName} activar* cuando tu racha llegue a ${STREAK_ACTIVATION_DAYS} días 😉`);
      if (pet.hatched) return ctx.reply(`『 🐺 』 *MASCOTA YA ECLOSIONADA*\n\n> Tu mascota ya salió del huevo 😄\n> Etapa actual: *${getStreakPetStage(streak)}*.`);
      if (streak < HATCH_DAYS) return ctx.reply(`『 🥚 』 *AÚN NO PUEDE ECLOSIONAR*\n\n> Necesitás ${HATCH_DAYS} días de racha. Progreso: ${streak}/${HATCH_DAYS} 😌`);
      pet.hatched = true;
      pet.stage = 'baby';
      pet.hatchedAt = Date.now();
      await user.save();
      await ctx.react('🐺');
      return sendPet(ctx, `『 🐺 』 *¡ECLOSIÓN COMPLETADA!*\n\n> Nació tu *${PET_NAME}* 🤩\n> Etapa: *Lobo niño*\n> Las siguientes evoluciones se desbloquean al mantener tu racha.`, streak, {
        title: '¡Eclosión completada!',
        subtitle: `Nació tu ${PET_NAME}`,
        stats: [{ label: 'Etapa', value: 'Lobo niño', note: 'recién nacido' }, { label: 'Próxima', value: '14 días', note: 'de racha' }],
        caption: 'Mantén tu racha para evolucionar'
      });
    }

    if (!pet.activated) {
      return sendPet(ctx, `『 🥚 』 *MASCOTA DE RACHA*\n\n> Estado: *Inactiva*\n> Mantené ${STREAK_ACTIVATION_DAYS} días y usa *${ctx.commandName} activar* 😌\n> Racha actual: ${streak} días`, streak, {
        title: 'Mascota de racha',
        subtitle: 'Todavía no tienes una mascota activa',
        stats: [{ label: 'Estado', value: 'Inactiva', note: 'sin huevo' }, { label: 'Requisito', value: `${STREAK_ACTIVATION_DAYS} días`, note: 'de racha' }],
        caption: `Usa ${ctx.commandName} activar al completar la racha`
      });
    }

    const state = pet.hatched ? getStreakPetStage(streak) : 'Huevo activado · espera la eclosión';
    return sendPet(ctx, `『 🐺 』 *${PET_NAME.toUpperCase()}*\n\n> Estado: *${state}*\n> Racha: ${streak} días\n> ${pet.hatched ? 'Tu lobo evoluciona al conservar tu racha.' : `Usa *${ctx.commandName} eclosionar* desde el día ${HATCH_DAYS}.`} 😄`, streak, {
      title: PET_NAME,
      subtitle: state,
      stats: [{ label: 'Estado', value: pet.hatched ? 'Eclosionada' : 'Huevo', note: 'activa' }],
      caption: pet.hatched ? 'Tu lobo evoluciona al conservar tu racha' : `Usa ${ctx.commandName} eclosionar desde el día ${HATCH_DAYS}`
    });
  });
