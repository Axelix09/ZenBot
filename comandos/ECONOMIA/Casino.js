import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { renderHtmlCard, cardAsset } from '../../lib/cards/htmlCard.js';

const COOLDOWN_MS = 120000;
const MIN_BET = 100;
const MAX_BET = 5000;

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export default new ZenCommand('casino')
  .addAlias('blackjack', 'bj', 'cartas')
  .setCooldown(0)
  .setCategory('Economía')
  .requireRegistration()
  .setUsage('<monto>')
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

    const [betRaw] = ctx.args;

    const now = Date.now();
    if (!user.cooldowns) user.cooldowns = {};
    const lastUsed = user.cooldowns.casino || 0;
    if (now - lastUsed < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - lastUsed)) / 1000);
      await ctx.react('⏳');
      return ctx.reply(`『 ⏳ 』 *MESA OCUPADA*\n\n> Esperá *${remaining}s* para jugar de nuevo 😴`);
    }

    if (!betRaw) {
      await ctx.react('🃏');
      const texto =
        `『 🃏 』 *CASINO ZEN*\n\n` +
        `✦ *Blackjack (21)*\n> El crupier reparte cartas. Ganás si tu mano es 21 o superior al crupier 😄\n> Si pasas de 21, pierdes.\n\n` +
        `✦ *Uso:* ${ZenConfig.prefix}${ctx.commandName} [monto]\n✦ *Límites:* ${MIN_BET} - ${MAX_BET} ${ZenConfig.currencies.zencoins.emoji}\n> _Ejemplo: ${ZenConfig.prefix}${ctx.commandName} 1000_`;
      try {
        const card = await renderHtmlCard({
          eyebrow: `${ZenConfig.botName.toUpperCase()} · CASINO`,
          title: 'Casino Zen',
          subtitle: 'Blackjack 21 · vence al crupier sin pasarte de 21',
          accent: '#f43f5e',
          accent2: '#fbbf24',
          art: cardAsset('casino-cards.png'),
          stats: [
            { label: 'Apuesta mínima', value: `${MIN_BET} ZC`, note: 'por partida' },
            { label: 'Apuesta máxima', value: `${MAX_BET} ZC`, note: 'por partida' },
            { label: 'Saldo', value: `${user.zencoins} ZC`, note: 'disponible' }
          ],
          rows: [
            { label: 'Comando', value: `${ZenConfig.prefix}${ctx.commandName} [monto]` },
            { label: 'Objetivo', value: 'Llegar a 21' }
          ],
          caption: `Ejemplo: ${ZenConfig.prefix}${ctx.commandName} 1000`
        });
        return ctx.sock.sendMessage(ctx.chat, { image: card, caption: texto }, { quoted: ctx.rawMsg });
      } catch (error) {
        if (process.env.DEBUG) console.debug('[casino card] fallback:', error.message);
        return ctx.reply(texto);
      }
    }

    const bet = parseInt(betRaw, 10);
    if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *APUESTA INVÁLIDA*\n\n> Tiene que ser entre *${MIN_BET}* y *${MAX_BET}* ${ZenConfig.currencies.zencoins.emoji} 🤔`);
    }

    if (user.zencoins < bet) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SALDO INSUFICIENTE*\n\n> Solo tenés ${user.zencoins} ${ZenConfig.currencies.zencoins.emoji} 🫣`);
    }

    const getCardValue = (value) => {
      if (value === 'A') return 11;
      if (['J', 'Q', 'K'].includes(value)) return 10;
      return parseInt(value, 10);
    };

    const drawCard = () => {
      const suit = pickRandom(SUITS);
      const value = pickRandom(VALUES);
      return { suit, value, points: getCardValue(value), display: `${value}${suit}` };
    };

    const calculatePoints = (cards) => {
      let total = cards.reduce((sum, c) => sum + c.points, 0);
      let aces = cards.filter(c => c.value === 'A').length;
      while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
      }
      return total;
    };

    const playerCards = [drawCard(), drawCard()];
    const dealerCards = [drawCard(), drawCard()];

    const playerTotal = calculatePoints(playerCards);
    const dealerInitialTotal = calculatePoints(dealerCards);

    let result = '';
    let win = false;
    let multiplier = 0;
    let finalDealerCards = [...dealerCards];
    let finalDealerTotal = dealerInitialTotal;

    const isPlayerBlackjack = playerTotal === 21;
    const isDealerBlackjack = dealerInitialTotal === 21;

    if (isPlayerBlackjack && !isDealerBlackjack) {
      win = true;
      multiplier = 2.5;
      result = '🎉 ¡BLACKJACK!';
    } else if (isDealerBlackjack && !isPlayerBlackjack) {
      win = false;
      multiplier = 0;
      result = '💀 El crupier tiene Blackjack.';
    } else if (isPlayerBlackjack && isDealerBlackjack) {
      win = false;
      multiplier = 0;
      result = '🤝 Empate (ambos Blackjack)';
    } else {
      while (finalDealerTotal < 17) {
        finalDealerCards.push(drawCard());
        finalDealerTotal = calculatePoints(finalDealerCards);
      }

      if (playerTotal > 21) {
        win = false;
        multiplier = 0;
        result = `💀 Pasaste de 21 (${playerTotal})`;
      } else if (finalDealerTotal > 21) {
        win = true;
        multiplier = 2;
        result = `🎉 El crupier pasó de 21 (${finalDealerTotal})`;
      } else if (playerTotal > finalDealerTotal) {
        win = true;
        multiplier = 2;
        result = `🎉 Ganaste (${playerTotal} vs ${finalDealerTotal})`;
      } else if (playerTotal === finalDealerTotal) {
        win = false;
        multiplier = 0;
        result = `🤝 Empate (${playerTotal} vs ${finalDealerTotal})`;
      } else {
        win = false;
        multiplier = 0;
        result = `💀 Perdiste (${playerTotal} vs ${finalDealerTotal})`;
      }
    }

    user.cooldowns.casino = now;
    if (typeof user.markModified === 'function') user.markModified('cooldowns');

    const playerHand = playerCards.map(c => c.display).join(' ');
    const dealerHand = finalDealerCards.map(c => c.display).join(' ');

    if (win && multiplier > 0) {
      const winAmount = Math.floor(bet * multiplier);
      user.zencoins += winAmount;
      await user.save();
      await ctx.react('🎉');

      const wins = [
        '¡Eres un as del Blackjack!',
        '¡El crupier no pudo con tu suerte!',
        '¡Qué jugada magistral!',
        '¡El casino tiembla!'
      ];

      return ctx.reply(
        `『 🎉 』 *VICTORIA EN EL CASINO*\n\n> ¡Eso estuvo bueno! 😄\n\n` +
        `✦ *Tu mano:* ${playerHand}\n✦ *Tu puntaje:* ${playerTotal}\n✦ *Crupier:* ${dealerHand}\n✦ *Puntaje del crupier:* ${finalDealerTotal}\n\n` +
        `✦ *${result}*\n✦ *Apuesta:* ${bet} ${ZenConfig.currencies.zencoins.emoji}\n✦ *Multiplicador:* x${multiplier}\n✦ *Ganancia:* +${winAmount} ${ZenConfig.currencies.zencoins.emoji}\n\n` +
        `📖 _${pickRandom(wins)}_`
      );
    } else {
      const loss = (multiplier === 0) ? bet : 0;
      user.zencoins = Math.max(0, user.zencoins - loss);
      await user.save();
      await ctx.react('💀');

      const losses = [
        'El casino siempre gana.',
        'La casa tiene ventaja.',
        'Suerte para la próxima.',
        'El crupier es implacable.'
      ];

      return ctx.reply(
        `『 💀 』 *DERROTA EN EL CASINO*\n\n> Noo, falló 😵\n\n` +
        `✦ *Tu mano:* ${playerHand}\n✦ *Tu puntaje:* ${playerTotal}\n✦ *Crupier:* ${dealerHand}\n✦ *Puntaje del crupier:* ${finalDealerTotal}\n\n` +
        `✦ *${result}*\n✦ *Pérdida:* -${loss} ${ZenConfig.currencies.zencoins.emoji}\n\n` +
        `📖 _${pickRandom(losses)}_`
      );
    }
  });