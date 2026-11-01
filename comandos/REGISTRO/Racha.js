import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { STREAK_ACTIVATION_DAYS } from '../../lib/database/userCore.js';
import { getTitleById } from '../../lib/game/titles.js';
import { getStreakPetImage, getStreakPetStage } from '../../lib/game/assetUrls.js';
import { renderHtmlCard } from '../../lib/cards/htmlCard.js';

const STREAK_MILESTONES = [
  { days: 3,   title: 'Visitante' },
  { days: 7,   title: 'Constante' },
  { days: 14,  title: 'Persistente' },
  { days: 30,  title: 'Comprometida/o' },
  { days: 60,  title: 'Incansable' },
  { days: 90,  title: 'Veterana/o' },
  { days: 180, title: 'Guardián ancestral' },
  { days: 365, title: 'Imparable Total' }
];

const nextMilestone = (streak) => STREAK_MILESTONES.find(m => m.days > streak) || null;

const sendStreakCard = async (ctx, text, streak, pet = {}, card = {}) => {
  const petStreak = pet.hatched ? streak : 0;
  const petText = !pet.activated
    ? 'Inactiva · usa .mascota activar al completar la racha'
    : !pet.hatched
      ? 'Huevo activado · usa .mascota eclosionar desde el día 7'
      : getStreakPetStage(streak);
  const petShort = !pet.activated ? 'Inactiva' : !pet.hatched ? 'Huevo' : getStreakPetStage(streak).split(' · ')[0].replace(/^Lobo (.)/, (_, c) => c.toUpperCase());
  const caption = `${text}\n\n✦ *Mascota:* Lobo de Racha · ${petText}`;
  const payload = { caption, mentions: [ctx.sender] };
  try {
    const image = await renderHtmlCard({
      eyebrow: `${ZenConfig.botName.toUpperCase()} · RACHA`,
      title: card.title || 'Tu racha',
      subtitle: card.subtitle || '',
      accent: '#f97316',
      accent2: '#facc15',
      art: getStreakPetImage(petStreak),
      stats: [...(card.stats || []), { label: 'Mascota', value: petShort, note: 'Lobo de Racha' }],
      rows: card.rows || [],
      caption: card.caption || ''
    });
    return await ctx.sock.sendMessage(ctx.chat, { image, ...payload }, { quoted: ctx.rawMsg });
  } catch {
    try {
      return await ctx.sock.sendMessage(ctx.chat, { image: getStreakPetImage(petStreak), ...payload }, { quoted: ctx.rawMsg });
    } catch {
      return ctx.reply(caption);
    }
  }
};

export default new ZenCommand('racha')
  .addAlias('streak', 'rachas')
  .setCooldown(5)
  .setCategory('Perfil')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    await ctx.react('🔥');
    const pet = user.streakPet || { activated: false, hatched: false };

    const activeTitle = user.activeTitle ? getTitleById(user.activeTitle) : null;
    const titleLine = activeTitle ? `\n✦ *Título equipado:* ${activeTitle.emoji} ${activeTitle.name}` : '';
    const titleRow = activeTitle ? [{ label: 'Título equipado', value: `${activeTitle.emoji} ${activeTitle.name}` }] : [];

    if (!user.streak) {
      return sendStreakCard(ctx,
        `『 🔥 』 *SIN RACHA ACTIVA*\n\n` +
        `> Usá cualquier comando hoy para empezar a sumar días 🤔` +
        titleLine,
        0, pet,
        {
          title: 'Sin racha activa',
          subtitle: 'Usa cualquier comando hoy para empezar a sumar días',
          stats: [
            { label: 'Racha', value: '0 días', note: 'sin iniciar' },
            { label: 'Récord', value: `${user.maxStreak || 0} días`, note: 'mejor marca' }
          ],
          rows: titleRow,
          caption: 'Usa un comando por día para mantenerla'
        }
      );
    }

    if (user.streak < STREAK_ACTIVATION_DAYS) {
      return sendStreakCard(ctx,
        `『 🔥 』 *RACHA EN PROGRESO*\n\n` +
        `✦ *Día:* ${user.streak}/${STREAK_ACTIVATION_DAYS}\n` +
        `✦ *Faltan:* ${STREAK_ACTIVATION_DAYS - user.streak} días seguidos para activarla\n\n` +
        `> _Si te saltas un día, vuelve a empezar desde 0 😉_` +
        titleLine,
        user.streak, pet,
        {
          title: 'Racha en progreso',
          subtitle: `Día ${user.streak} de ${STREAK_ACTIVATION_DAYS} para activarla`,
          stats: [
            { label: 'Día', value: `${user.streak}/${STREAK_ACTIVATION_DAYS}`, note: 'progreso' },
            { label: 'Faltan', value: `${STREAK_ACTIVATION_DAYS - user.streak} días`, note: 'para activar' }
          ],
          rows: titleRow,
          caption: 'Si te saltas un día, vuelves a empezar desde 0'
        }
      );
    }

    const next = nextMilestone(user.streak);
    const progreso = next
      ? `✦ *Próximo título:* ${next.title} (faltan ${next.days - user.streak} días)`
      : `✦ *¡Todos los títulos de racha desbloqueados!* 🏆`;

    return sendStreakCard(ctx,
      `『 🔥 』 *TU RACHA*` +
      `\n\n✦ *Racha actual:* ${user.streak} días` +
      `\n✦ *Récord personal:* ${user.maxStreak} días` +
      `\n\n${progreso}` +
      titleLine +
      `\n\n> _Usa al menos un comando por día para mantenerla viva 😌_`,
      user.streak, pet,
      {
        title: 'Tu racha',
        subtitle: next ? `Faltan ${next.days - user.streak} días para ${next.title}` : 'Todos los títulos de racha desbloqueados',
        stats: [
          { label: 'Racha actual', value: `${user.streak} días`, note: 'sin parar' },
          { label: 'Récord', value: `${user.maxStreak || 0} días`, note: 'mejor marca' }
        ],
        rows: [
          ...(next ? [{ label: 'Próximo', value: next.title }] : []),
          ...titleRow
        ],
        caption: 'Usa al menos un comando por día'
      }
    );
  });
