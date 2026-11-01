import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';

const COOLDOWN_MS = 180000;
const MIN_BET = 100;
const MAX_BET = 5000;
const EVENTS = [
  { name: '🏇 Carrera de Tortugas', odds: [1.5, 3.0, 5.0], participants: ['🐢 Flash', '🐢 Tortu', '🐢 Speedy'] },
  { name: '🐙 Pelea de Pulpos', odds: [2.0, 2.5, 3.5], participants: ['🐙 Octavio', '🐙 Pulpi', '🐙 Tentáculo'] },
  { name: '🐧 Lanzamiento de Pingüinos', odds: [1.8, 2.8, 4.0], participants: ['🐧 Pingu', '🐧 Nieve', '🐧 Frosty'] },
  { name: '🐌 Carrera de Caracoles', odds: [1.2, 6.0, 8.0], participants: ['🐌 Lento', '🐌 Rápido', '🐌 Turbo'] },
  { name: '🤖 Duelo de Robots de Cocina', odds: [2.2, 2.2, 3.5], participants: ['🔌 Tostadora', '⚡ Batidora', '💪 Licuadora'] },
  { name: '🦙 Campeonato de Lanzamiento de Alpacas', odds: [1.5, 3.5, 4.0], participants: ['🦙 Alpaca 1', '🦙 Alpaca 2', '🦙 Alpaca 3'] },
  { name: '🥱 Competencia de Bostezos', odds: [1.1, 5.0, 10.0], participants: ['😴 Aburrido', '💤 Soñoliento', '😪 Dormilón'] },
  { name: '🐦 Torneo de Ajedrez con Palomas', odds: [2.5, 2.5, 3.0], participants: ['🐦 Paloma 1', '🐦 Paloma 2', '🐦 Paloma 3'] },
  { name: '🍕 Competencia de Comer Pizza', odds: [1.8, 3.0, 4.5], participants: ['🍕 Glotón', '🍕 Devorador', '🍕 Tragón'] },
  { name: '🎤 Batalla de Gallos de Memes', odds: [2.0, 2.8, 3.2], participants: ['🤣 Risa', '😭 Llanto', '😡 Enojo'] }
];
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export default new ZenCommand('apostar')
  .addAlias('bet', 'deporte', 'evento')
  .setCooldown(0)
  .setCategory('Economía')
  .requireRegistration()
  .setUsage('<monto> <participante>')
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

    const [betRaw, ...participantParts] = ctx.args;
    const participantName = participantParts.join(' ');
    const now = Date.now();
    const zc = ZenConfig.currencies.zencoins;
    if (!user.cooldowns) user.cooldowns = {};
    const lastUsed = user.cooldowns.apostar || 0;
    if (now - lastUsed < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - lastUsed)) / 1000);
      await ctx.react('⏳');
      return ctx.reply(`『 ⏳ 』 *ENFRIAMIENTO*\n\n> Esperá *${remaining}s* para realizar otra apuesta 🙃`);
    }
    if (!betRaw) {
      await ctx.react('🎲');
      const eventsList = EVENTS.map((e, i) => `✦ *${i + 1}. ${e.name}*\n  ${e.participants.map((p, j) => `${p} (x${e.odds[j]})`).join('  ')}`).join('\n\n');
      return ctx.reply(`『 🎲 』 *CASA DE APUESTAS ZEN*\n\n${eventsList}\n\n✦ *Uso:* ${ZenConfig.prefix}${ctx.commandName} [monto] [participante]\n✦ *Límites:* ${MIN_BET} - ${MAX_BET} ${zc.emoji}\n> _Ejemplo: ${ZenConfig.prefix}${ctx.commandName} 500 Flash_`);
    }
    const bet = parseInt(betRaw, 10);
    if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *MONTO INVÁLIDO*\n\n> Uy, algo no cuadra 🤨\n\n> La apuesta debe estar entre *${MIN_BET}* y *${MAX_BET}* ${zc.emoji} 🧐`);
    }
    if (user.zencoins < bet) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SALDO INSUFICIENTE*\n\n> Solo tenés ${user.zencoins} ${zc.emoji} 😅`);
    }
    const event = pickRandom(EVENTS);
    const chosenParticipant = event.participants.find(p => p.toLowerCase().includes(participantName.toLowerCase()));
    if (!chosenParticipant) {
      await ctx.react('⚠️');
      const available = event.participants.map(p => `"${p}"`).join(', ');
      return ctx.reply(`『 ⚠️ 』 *PARTICIPANTE NO ENCONTRADO*\n\n> Hmm, eso no aparece 🤔\n> En *${event.name}* compiten:\n${available}`);
    }
    const chosenIndex = event.participants.indexOf(chosenParticipant);
    const odds = event.odds[chosenIndex];
    const winner = pickRandom(event.participants);
    const isWin = winner === chosenParticipant;
    user.cooldowns.apostar = now;
    if (typeof user.markModified === 'function') user.markModified('cooldowns');
    if (isWin) {
      const winAmount = Math.floor(bet * odds);
      user.zencoins += winAmount;
      await user.save();
      await ctx.react('🎉');
      return ctx.reply(`『 🎉 』 *APUESTA GANADA*\n\n> ¡Bien ahí! 😎\n> *Evento:* ${event.name}\n> *Elección:* ${chosenParticipant} (x${odds})\n\n✦ *Ganancia:* +${winAmount} ${zc.emoji}\n✦ *Inversión:* ${bet} ${zc.emoji}\n\n📖 _${chosenParticipant} arrasó con la competencia._`);
    } else {
      user.zencoins -= bet;
      await user.save();
      await ctx.react('💀');
      return ctx.reply(`『 💀 』 *APUESTA PERDIDA*\n\n> Uy, salió mal 😭\n> *Evento:* ${event.name}\n> *Elección:* ${chosenParticipant} (x${odds})\n> *Ganador:* ${winner}\n\n✦ *Pérdida:* -${bet} ${zc.emoji}\n\n📖 _La suerte no estuvo de tu lado hoy._`);
    }
  });