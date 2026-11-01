import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { getGameSession } from '../../lib/services/sessionManager.js';

const COOLDOWNS = {
  trabajar: 600000,
  crimen: 1200000,
  robar: 1200000,
  ruleta: 300000,
  duelo: 900000,
  diario: 86400000,
  apostar: 180000,
  casino: 120000,
  loteria: 3600000,
  regatear: 180000,
  invertir: 300000,
  suerte: 60000,
  slots: 15000,
  lanzar: 3000,
  banco: 5000
};

const formatTime = (ms) => {
  if (ms <= 0) return '✅ Listo';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `⏳ ${h}h ${m}m`;
  if (m > 0) return `⏳ ${m}m ${s}s`;
  return `⏳ ${s}s`;
};

export default new ZenCommand('einfo')
  .addAlias('cooldowns', 'tiempos', 'cd', 'miscd')
  .setCooldown(3)
  .setCategory('Economía')
  .requireRegistration()
  .onExecute(async (ctx) => {
    await ctx.react('⏱️');
    const user = await ctx.getUser();
    const now = Date.now();
    const cdData = user.cooldowns || {};

    if (user.loans?.blockedPermanently) {
      await ctx.react('🚫');
      return ctx.reply(V.blocked.permanentShort(user));
    }

    if (user.loans?.isBlocked && !user.loans?.isPromised) {
      await ctx.react('🔒');
      return ctx.reply(V.blocked.debtShort(user));
    }

    const stWork = formatTime(COOLDOWNS.trabajar - (now - (cdData.trabajar || 0)));
    const stCrime = formatTime(COOLDOWNS.crimen - (now - (cdData.crimen || 0)));
    const stRob = formatTime(COOLDOWNS.robar - (now - (cdData.robar || 0)));
    const stDuel = formatTime(COOLDOWNS.duelo - (now - (cdData.duelo || 0)));
    const stRoulette = formatTime(COOLDOWNS.ruleta - (now - (cdData.ruleta || 0)));
    const stDaily = formatTime(COOLDOWNS.diario - (now - (cdData.diario || 0)));
    const stApostar = formatTime(COOLDOWNS.apostar - (now - (cdData.apostar || 0)));
    const stCasino = formatTime(COOLDOWNS.casino - (now - (cdData.casino || 0)));
    const stLoteria = formatTime(COOLDOWNS.loteria - (now - (cdData.loteria || 0)));
    const stRegatear = formatTime(COOLDOWNS.regatear - (now - (cdData.regatear || 0)));
    const stInvertir = formatTime(COOLDOWNS.invertir - (now - (cdData.invertir || 0)));
    const stSuerte = formatTime(COOLDOWNS.suerte - (now - (cdData.suerte || 0)));
    const stSlots = formatTime(COOLDOWNS.slots - (now - (cdData.slots || 0)));
    const stBanco = formatTime(COOLDOWNS.banco - (now - (cdData.banco || 0)));

    const mineLast = cdData.minar || 0;
    const mineAmt = cdData.minar_amount || 0;
    const stMine = formatTime(mineAmt - (now - mineLast));

    const huntLast = cdData.cazar || 0;
    const huntAmt = cdData.cazar_amount || 0;
    const stHunt = formatTime(huntAmt - (now - huntLast));

    const fishLast = cdData.lanzar || 0;
    const fishAmt = COOLDOWNS.lanzar;
    const stFish = formatTime(fishAmt - (now - fishLast));

    const activeFishing = await getGameSession(ctx.sender, 'fishing');
    const fishStatus = activeFishing ? '🎣 Combate Activo' : stFish;

    const roulettePlays = user.dailyStats?.rouletteCount || 0;
    const rouletteStatus = roulettePlays >= 15 ? '🚫 Límite diario (15/15)' : `${stRoulette} (${roulettePlays}/15)`;

    const lines = [
      `『 ⏱️ 』 *ESTADO DE TUS ENFRIAMIENTOS*`,
      ``,
      `✦ *Usuario:* ${user.name}`,
      ``,
      `✦ *RECOLECCIÓN Y TRABAJO*`,
      `  • Trabajar: ${stWork}`,
      `  • Minar: ${stMine}`,
      `  • Cazar: ${stHunt}`,
      `  • Lanzar caña: ${fishStatus}`,
      ``,
      `✦ *JUEGOS DE AZAR*`,
      `  • Apostar: ${stApostar}`,
      `  • Casino (Blackjack): ${stCasino}`,
      `  • Dados/PPT: ${stSuerte}`,
      `  • Tragamonedas: ${stSlots}`,
      `  • Ruleta: ${rouletteStatus}`,
      `  • Lotería: ${stLoteria}`,
      ``,
      `✦ *DELITOS Y COMBATE*`,
      `  • Crimen: ${stCrime}`,
      `  • Asaltar: ${stRob}`,
      `  • Duelo: ${stDuel}`,
      ``,
      `✦ *ECONOMÍA Y MERCADO*`,
      `  • Regatear: ${stRegatear}`,
      `  • Invertir: ${stInvertir}`,
      `  • Banco: ${stBanco}`,
      `  • Diario: ${stDaily}`,
      ``,
      `> _Los temporizadores se actualizan automáticamente._`
    ];

    return ctx.reply(lines.join('\n'));
  });