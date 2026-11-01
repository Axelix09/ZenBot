import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { resolveTargetJid, findRegisteredUser } from '../../lib/core/targetResolver.js';
import { ZenConfig } from '../../zen.config.js';
import { getGameSession, saveGameSession, deleteGameSession } from '../../lib/services/sessionManager.js';

const COOLDOWN_MS = 900000;
const ACCEPT_TIMEOUT = 60000;
const MIN_BET = 20;
const MAX_BET = 10000;

const BATTLE_STORIES = [
  "🤠 Se miraron a los ojos en el centro del pueblo. {w} fue más rápido desenfundando su revólver y dejó a {l} besando el polvo.",
  "⚔️ En un choque de espadas épico, {w} encontró un hueco en la defensa de {l} y terminó el combate con un tajo certero.",
  "🥋 {w} aplicó una técnica secreta de artes marciales que dejó a {l} paralizado antes de que pudiera parpadear.",
  "🪄 {w} lanzó un hechizo de fuego que consumió el escudo de {l}. El duelo terminó en una explosión de cenizas.",
  "🦾 En una pelea callejera brutal, {w} conectó un gancho de derecha que mandó a {l} directo a la lona.",
  "🌌 {w} usó un sable de luz para desarmar a {l} en medio de una estación espacial futurista.",
  "🏹 {l} lanzó una flecha, pero {w} la partió a la mitad con un cuchillo y contraatacó con precisión quirúrgica.",
  "🥊 {w} dominó los 12 rounds y terminó ganando por decisión unánime, dejando a {l} muy lastimado.",
  "🐉 {w} invocó el poder del dragón antiguo, reduciendo la voluntad de {l} a cenizas.",
  "♟️ No fue una pelea de fuerza, sino de ingenio. {w} le hizo jaque mate a {l} en pocos movimientos.",
  "🧨 {l} intentó usar una granada, pero {w} se la devolvió de una patada antes de que explotara ¡BOOM!",
  "⚡ {w} se movió a la velocidad del rayo, apareciendo detrás de {l} antes de que este pudiera reaccionar.",
  "🛡️ {l} atacó con todo, pero {w} se mantuvo firme como una roca y esperó el momento justo para el contragolpe.",
  "🔱 Ante miles de espectadores en el coliseo, {w} obligó a {l} a pedir clemencia de rodillas."
];

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export default new ZenCommand('duelo')
  .addAlias('duel', 'retar')
  .setCooldown(0)
  .setCategory('Economía')
  .requireRegistration()
  .setUsage('@usuario <apuesta>')
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

    const now = Date.now();
    if (!user.cooldowns) user.cooldowns = {};
    const lastDuel = user.cooldowns.duelo || 0;
    const remaining = COOLDOWN_MS - (now - lastDuel);

    if (remaining > 0) {
      await ctx.react('⏳');
      const m = Math.floor(remaining / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      return ctx.reply(`『 ⏳ 』 *COOLDOWN DE DUELO*\n\n> Esperá *${m}m ${s}s* para ingresar a la arena 🥱`);
    }

    const rawTarget = ctx.mentions?.[0] || ctx.quotedParticipant;
    const targetJid = await resolveTargetJid(ctx, rawTarget);

    if (!targetJid) {
      await ctx.react('⚔️');
      return ctx.reply(
        `『 ⚔️ 』 *ARENA DE DUELOS*\n\n` +
        `✦ *Uso:* ${ZenConfig.prefix}${ctx.commandName} @usuario [apuesta]\n✦ *Límite:* ${MIN_BET} - ${MAX_BET} ${ZenConfig.currencies.zencoins.emoji}\n✦ *Tiempo:* 1 minuto para aceptar\n✦ *Cooldown:* 15 minutos por duelo`
      );
    }

    if (await ctx.isSameUser(targetJid, ctx.sender)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *AUTO-DUELO*\n\n> No podés batirte en duelo con vos mismo 😉`);
    }

    const opponent = await findRegisteredUser(ctx, targetJid);

    if (!opponent || !opponent.registered) {
      await ctx.react('⚠️');
      const oppName = targetJid.split('@')[0];
      return ctx.reply(`『 ⚠️ 』 *USUARIO NO REGISTRADO*\n\n> *${oppName}* todavía no se registró 🤔`);
    }

    const activeDuel = await getGameSession(targetJid, 'duel');
    if (activeDuel) {
      await ctx.react('⏳');
      return ctx.reply(`『 ⏳ 』 *DUELO PENDIENTE*\n\n> *${opponent.name}* ya tiene un duelo activo 😌`);
    }

    if (opponent.cooldowns && opponent.cooldowns.duelo) {
      const oppRemaining = COOLDOWN_MS - (now - opponent.cooldowns.duelo);
      if (oppRemaining > 0) {
        const m = Math.floor(oppRemaining / 60000);
        await ctx.react('⏳');
        return ctx.reply(`『 ⏳ 』 *OPONENTE EN COOLDOWN*\n\n> *${opponent.name}* espera *${m}m* para duelar 😴`);
      }
    }

    const cleanArgs = ctx.args.filter(arg => !arg.includes('@'));
    const amountMatch = cleanArgs.join(' ').match(/\d+/);
    let apuesta = 0;
    let esAleatoria = false;

    if (amountMatch) {
      apuesta = parseInt(amountMatch[0], 10);
      if (apuesta < MIN_BET || apuesta > MAX_BET) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *APUESTA INVÁLIDA*\n\n> Debe estar entre *${MIN_BET}* y *${MAX_BET}* ${ZenConfig.currencies.zencoins.name} 🧐`);
      }
    } else {
      apuesta = Math.floor(Math.random() * (MAX_BET - MIN_BET)) + MIN_BET;
      esAleatoria = true;
    }

    if (user.zencoins < apuesta) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SALDO INSUFICIENTE*\n\n> Necesitás ${apuesta} ${ZenConfig.currencies.zencoins.emoji} (Tenés: ${user.zencoins}) 🥺`);
    }

    if (opponent.zencoins < apuesta) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *OPONENTE SIN FONDOS*\n\n> *${opponent.name}* tiene ${opponent.zencoins} ${ZenConfig.currencies.zencoins.emoji} 😬`);
    }

    const duelRequest = {
      challenger: ctx.sender,
      challengerName: user.name,
      opponent: targetJid,
      opponentName: opponent.name,
      bet: apuesta,
      isRandom: esAleatoria,
      timestamp: now,
      timeout: now + ACCEPT_TIMEOUT,
      accepted: false
    };

    await saveGameSession(targetJid, 'duel', duelRequest);

    const requestMsg = 
      `『 ⚔️ 』 *SOLICITUD DE DUELO*\n\n` +
      `✦ *Retador:* ${user.name}\n✦ *Oponente:* ${opponent.name}\n✦ *Apuesta:* ${apuesta} ${ZenConfig.currencies.zencoins.emoji}\n${esAleatoria ? '✦ *Apuesta aleatoria*' : ''}\n\n` +
      `> _Tienes 1 minuto para aceptar 😌_\n> _Aceptar: ${ZenConfig.prefix}dueloaceptar_\n> _Rechazar: ${ZenConfig.prefix}duelorechazar_`;

    await ctx.reply(requestMsg);
    await ctx.react('⚔️');

    await ctx.sock.sendMessage(targetJid, {
      text: `『 ⚔️ 』 *¡${user.name} TE HA RETADO!*\n\n✦ *Apuesta:* ${apuesta} ${ZenConfig.currencies.zencoins.emoji}\n✦ *Tiempo:* 1 minuto\n\n> _Aceptar: ${ZenConfig.prefix}dueloaceptar_\n> _Rechazar: ${ZenConfig.prefix}duelorechazar_`,
      mentions: [targetJid, ctx.sender]
    });

    setTimeout(async () => {
      const pending = await getGameSession(targetJid, 'duel');
      if (pending && !pending.accepted) {
        await deleteGameSession(targetJid, 'duel');
        await ctx.reply(`『 ⏳ 』 *DUELO EXPIRADO*\n\n> *${opponent.name}* no respondió a tiempo 🫠`);
      }
    }, ACCEPT_TIMEOUT);
  });

export const acceptDuel = new ZenCommand('dueloaceptar')
  .addAlias('acceptduel', 'duelaccept')
  .setCategory('Economía')
  .setHidden(true)
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();

    if (user.loans?.blockedPermanently || user.loans?.isBlocked) {
      await ctx.react('🚫');
      return ctx.reply(
        `『 🚫 』 *CUENTA BLOQUEADA*\n\n` +
        `> No podés aceptar duelos mientras tu cuenta esté bloqueada 🫢\n` +
        `> Regularizá tu situación para usar comandos de economía.`
      );
    }

    const pending = await getGameSession(ctx.sender, 'duel');

    if (!pending) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SIN DUELO PENDIENTE*\n\n> No tenés ninguna solicitud activa 😕`);
    }

    if (pending.accepted) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *DUELO YA ACEPTADO*\n\n> Este duelo ya fue procesado 😅`);
    }

    if (Date.now() > pending.timeout) {
      await deleteGameSession(ctx.sender, 'duel');
      await ctx.react('⏳');
      return ctx.reply(`『 ⏳ 』 *DUELO EXPIRADO*\n\n> La solicitud ya no es válida 🫠`);
    }

    pending.accepted = true;
    await deleteGameSession(ctx.sender, 'duel');

    const challenger = await ctx.getUserById(pending.challenger);
    const opponent = await ctx.getUser();

    if (challenger.zencoins < pending.bet || opponent.zencoins < pending.bet) {
      await ctx.react('⚠️');
      await ctx.reply(`『 ⚠️ 』 *DUELO CANCELADO*\n\n> Uno de los participantes ya no posee los fondos suficientes 😵`);
      return;
    }

    const invA = challenger.inventory || {};
    const invB = opponent.inventory || {};

    let hpA = invA.potion > 0 ? 200 : 100;
    let hpB = invB.potion > 0 ? 200 : 100;
    let dmgBuffA = invA.sword > 0 ? 1.15 : 1.0;
    let dmgBuffB = invB.sword > 0 ? 1.15 : 1.0;

    const usedA = { p: invA.potion > 0, s: invA.sword > 0 };
    const usedB = { p: invB.potion > 0, s: invB.sword > 0 };

    if (usedA.p) challenger.inventory.potion -= 1;
    if (usedA.s) challenger.inventory.sword -= 1;
    if (usedB.p) opponent.inventory.potion -= 1;
    if (usedB.s) opponent.inventory.sword -= 1;

    let logs = [];
    while (hpA > 0 && hpB > 0) {
      let d1 = Math.floor((Math.random() * 20 + 10) * dmgBuffA);
      hpB -= d1;
      logs.push(`⚔️ @${pending.challenger.split('@')[0]} inflige ${d1} DMG`);
      if (hpB <= 0) break;

      let d2 = Math.floor((Math.random() * 20 + 10) * dmgBuffB);
      hpA -= d2;
      logs.push(`🛡️ @${ctx.sender.split('@')[0]} responde con ${d2} DMG`);
    }

    const win = hpA > 0;
    const winnerJid = win ? pending.challenger : ctx.sender;
    const loserJid = win ? ctx.sender : pending.challenger;

    if (win) {
      challenger.zencoins += pending.bet;
      opponent.zencoins = Math.max(0, opponent.zencoins - pending.bet);
    } else {
      opponent.zencoins += pending.bet;
      challenger.zencoins = Math.max(0, challenger.zencoins - pending.bet);
    }

    const now = Date.now();
    challenger.cooldowns.duelo = now;
    opponent.cooldowns.duelo = now;

    if (!challenger.stats) challenger.stats = {};
    if (!opponent.stats) opponent.stats = {};

    if (win) {
      challenger.stats.robsWon = (challenger.stats.robsWon || 0) + 1;
      opponent.stats.robsLost = (opponent.stats.robsLost || 0) + 1;
    } else {
      opponent.stats.robsWon = (opponent.stats.robsWon || 0) + 1;
      challenger.stats.robsLost = (challenger.stats.robsLost || 0) + 1;
    }

    if (typeof challenger.markModified === 'function') {
      challenger.markModified('inventory');
      challenger.markModified('cooldowns');
      challenger.markModified('stats');
    }
    if (typeof opponent.markModified === 'function') {
      opponent.markModified('inventory');
      opponent.markModified('cooldowns');
      opponent.markModified('stats');
    }

    await challenger.save();
    await opponent.save();

    const story = pickRandom(BATTLE_STORIES)
      .replace(/{w}/g, `@${winnerJid.split('@')[0]}`)
      .replace(/{l}/g, `@${loserJid.split('@')[0]}`);

    let pfpUrl = null;
    try {
      pfpUrl = await ctx.sock.profile.pictureUrl(winnerJid, 'image');
    } catch (_) {
      pfpUrl = 'https://i.ibb.co/nNkgRQjK/images-4.jpg';
    }

    let textOut = 
      `『 ⚔️ 』 *RESULTADO DEL DUELO*\n\n` +
      (pending.isRandom ? `✦ *Apuesta aleatoria:* ${pending.bet} ${ZenConfig.currencies.zencoins.emoji}\n\n` : '') +
      `✦ *ESTADO DE ENTRADA:*\n  • @${pending.challenger.split('@')[0]}: ${usedA.p ? '200' : '100'} HP ${usedA.s ? '⚔️ (+15% ATK)' : ''}\n  • @${ctx.sender.split('@')[0]}: ${usedB.p ? '200' : '100'} HP ${usedB.s ? '⚔️ (+15% ATK)' : ''}\n\n` +
      `✦ *DESARROLLO:*\n  ${logs.slice(-4).join('\n  ')}\n\n` +
      `✦ *Desenlace:*\n  _${story}_\n\n` +
      `✦ *Ganador:* @${winnerJid.split('@')[0]}\n✦ *Botín:* +${pending.bet} ${ZenConfig.currencies.zencoins.emoji}\n\n` +
      `> _Cooldown: 15 minutos para ambos._`;

    await ctx.sock.sendMessage(ctx.chat, {
      image: { url: pfpUrl },
      caption: textOut,
      mentions: [pending.challenger, ctx.sender]
    }, { quoted: ctx.rawMsg });
  });

export const rejectDuel = new ZenCommand('duelorechazar')
  .addAlias('rejectduel', 'duelreject')
  .setCategory('Economía')
  .setHidden(true)
  .requireRegistration()
  .onExecute(async (ctx) => {
    const pending = await getGameSession(ctx.sender, 'duel');

    if (!pending) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SIN DUELO PENDIENTE*\n\n> No tenés ninguna solicitud activa 😕`);
    }

    if (pending.accepted) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *DUELO YA ACEPTADO*\n\n> Este duelo ya fue aceptado 😅`);
    }

    await deleteGameSession(ctx.sender, 'duel');
    await ctx.react('❌');

    const rejectMsg = `『 ❌ 』 *DUELO RECHAZADO*\n\n> *${pending.opponentName}* rechazó el duelo de *${pending.challengerName}* 😵`;

    await ctx.reply(rejectMsg);
    await ctx.sock.sendMessage(pending.challenger, {
      text: `『 ❌ 』 *DUELO RECHAZADO*\n\n> *${pending.opponentName}* rechazó tu solicitud 😵`,
      mentions: [pending.challenger]
    });
  });