import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';

const COOLDOWN_MS = 3600000;
const TICKET_PRICE = 500;
const MAX_TICKETS = 10;

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export default new ZenCommand('loteria')
  .addAlias('lottery', 'lotto', 'chance')
  .setCooldown(0)
  .setCategory('Economía')
  .requireRegistration()
  .setUsage('[cantidad]')
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

    const [qtyRaw] = ctx.args;

    const now = Date.now();
    if (!user.cooldowns) user.cooldowns = {};
    const lastUsed = user.cooldowns.loteria || 0;
    if (now - lastUsed < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - lastUsed)) / 60000);
      await ctx.react('⏳');
      return ctx.reply(`『 ⏳ 』 *SORTEO CADA HORA*\n\n> Esperá *${remaining} min* para el próximo sorteo 🙂`);
    }

    if (!qtyRaw) {
      await ctx.react('🎰');
      return ctx.reply(
        `『 🎰 』 *LOTERÍA NACIONAL*\n\n` +
        `✦ *Premios:*\n  • 1er Premio: x50 🏆\n  • 2do Premio: x10 🥈\n  • 3er Premio: x3 🥉\n  • Consolación: x1 🎁\n  • Nada: 0 💀\n\n` +
        `✦ *Uso:* ${ZenConfig.prefix}${ctx.commandName} [cantidad]\n✦ *Costo:* ${TICKET_PRICE} ${ZenConfig.currencies.zencoins.emoji} por boleto\n✦ *Máximo:* ${MAX_TICKETS} boletos\n> _Ejemplo: ${ZenConfig.prefix}${ctx.commandName} 5_`
      );
    }

    const quantity = parseInt(qtyRaw, 10);
    if (isNaN(quantity) || quantity < 1 || quantity > MAX_TICKETS) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *CANTIDAD INVÁLIDA*\n\n> Tiene que ser entre *1* y *${MAX_TICKETS}* boletos 🤨`);
    }

    const totalCost = quantity * TICKET_PRICE;
    if (user.zencoins < totalCost) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SALDO INSUFICIENTE*\n\n> Necesitás ${totalCost} ${ZenConfig.currencies.zencoins.emoji} 🫣`);
    }

    user.zencoins -= totalCost;
    const winningTicket = Math.floor(Math.random() * 100) + 1;
    const playerTicket = Math.floor(Math.random() * 100) + 1;

    user.cooldowns.loteria = now;
    if (typeof user.markModified === 'function') user.markModified('cooldowns');

    const diff = Math.abs(winningTicket - playerTicket);
    let winMultiplier = 0;
    let prizeName = '';
    let message = '';
    let emoji = '';

    if (diff === 0) {
      winMultiplier = 50;
      prizeName = '🏆 1ER PREMIO';
      emoji = '👑';
      message = '¡EL NÚMERO GANADOR COINCIDE PERFECTAMENTE! Eres millonario.';
    } else if (diff <= 2) {
      winMultiplier = 10;
      prizeName = '🥈 2DO PREMIO';
      emoji = '⭐';
      message = '¡Tu boleto estaba a solo 2 números del ganador!';
    } else if (diff <= 5) {
      winMultiplier = 3;
      prizeName = '🥉 3ER PREMIO';
      emoji = '🎯';
      message = '¡Casi aciertas! Quedaste a 5 números.';
    } else if (diff <= 10) {
      winMultiplier = 1;
      prizeName = '🎁 CONSOLACIÓN';
      emoji = '😊';
      message = 'Recuperas el costo de un boleto.';
    } else {
      winMultiplier = 0;
      prizeName = '💀 NINGUNO';
      emoji = '😭';
      message = `El número ganador fue ${winningTicket}. Tu boleto: ${playerTicket}.`;
    }

    if (winMultiplier > 0) {
      const winAmount = Math.floor(totalCost * winMultiplier);
      user.zencoins += winAmount;
      await user.save();
      await ctx.react('🎉');

      const celebrations = [
        '¡La suerte está de tu lado!',
        '¡Qué emoción! Has ganado un premio.',
        '¡El universo te sonríe!',
        '¡Felicidades! Disfruta tu premio.'
      ];

      return ctx.reply(
        `『 🎉 』 *RESULTADO DE LA LOTERÍA*\n\n` +
        `✦ *Boletos:* ${quantity}\n✦ *Costo:* ${totalCost} ${ZenConfig.currencies.zencoins.emoji}\n✦ *Premio:* ${prizeName}\n✦ *Multiplicador:* x${winMultiplier}\n✦ *Ganancia:* +${winAmount} ${ZenConfig.currencies.zencoins.emoji}\n\n` +
        `📖 _${message}_\n\n✨ _${pickRandom(celebrations)}_`
      );
    } else {
      await user.save();
      await ctx.react('💀');

      const consolations = [
        'La suerte no estuvo de tu lado hoy.',
        'El azar es caprichoso. Pronto te sonreirá.',
        'No siempre se gana. ¡Ánimo para la próxima!',
        'El universo te debe una.'
      ];

      return ctx.reply(
        `『 💀 』 *RESULTADO DE LA LOTERÍA*\n\n` +
        `✦ *Boletos:* ${quantity}\n✦ *Costo:* ${totalCost} ${ZenConfig.currencies.zencoins.emoji}\n✦ *Premio:* ${prizeName}\n\n` +
        `📖 _${message}_\n\n💭 _${pickRandom(consolations)}_`
      );
    }
  });