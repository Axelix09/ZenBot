import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';

const COOLDOWN_MS = 60000;
const MIN_BET = 50;
const MAX_BET = 3000;

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const DICE_NAMES = ['UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS'];

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export default new ZenCommand('suerte')
  .addAlias('dados', 'dice')
  .setCooldown(0)
  .setCategory('Economía')
  .requireRegistration()
  .setUsage('<monto> <par|impar|numero>')
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

    const [betRaw, ...choiceParts] = ctx.args;
    const choice = choiceParts.join(' ').toLowerCase();

    const now = Date.now();
    if (!user.cooldowns) user.cooldowns = {};
    const lastUsed = user.cooldowns.suerte || 0;
    if (now - lastUsed < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - lastUsed)) / 1000);
      await ctx.react('⏳');
      return ctx.reply(`『 ⏳ 』 *ENFRIAMIENTO*\n\n> Esperá *${remaining}s* para jugar de nuevo 🥱`);
    }

    if (!betRaw) {
      await ctx.react('🎲');
      return ctx.reply(
        `『 🎲 』 *JUEGOS DE SUERTE*\n\n` +
        `✦ *Opciones:*\n  • *par* / *impar* ➜ Adivina el dado (x2)\n  • *numero* ➜ Adivina el número exacto (x6)\n\n` +
        `✦ *Uso:* ${ZenConfig.prefix}${ctx.commandName} [monto] [par|impar|numero]\n✦ *Límites:* ${MIN_BET} - ${MAX_BET} ${ZenConfig.currencies.zencoins.emoji}\n> _Ejemplo: ${ZenConfig.prefix}${ctx.commandName} 200 par_`
      );
    }

    const bet = parseInt(betRaw, 10);
    if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *APUESTA INVÁLIDA*\n\n> Tiene que ser entre *${MIN_BET}* y *${MAX_BET}* ${ZenConfig.currencies.zencoins.emoji} 😵‍💫`);
    }

    if (user.zencoins < bet) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SALDO INSUFICIENTE*\n\n> Solo tenés ${user.zencoins} ${ZenConfig.currencies.zencoins.emoji} 😔`);
    }

    const diceRoll = Math.floor(Math.random() * 6) + 1;
    const diceFace = DICE_FACES[diceRoll - 1];
    const diceName = DICE_NAMES[diceRoll - 1];

    let win = false;
    let multiplier = 1;
    let resultText = '';
    let gameType = '';

    if (choice === 'par' || choice === 'impar') {
      const isPar = diceRoll % 2 === 0;
      const userPrediction = choice === 'par';
      win = isPar === userPrediction;
      multiplier = win ? 2 : 0;
      resultText = `Dado: ${diceFace} ${diceName} (${isPar ? 'PAR' : 'IMPAR'})`;
      gameType = `🎲 Adivina ${choice.toUpperCase()}`;
    } else if (choice === 'numero') {
      const guessed = parseInt(ctx.args[ctx.args.length - 1], 10);
      if (isNaN(guessed) || guessed < 1 || guessed > 6) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *NÚMERO INVÁLIDO*\n\n> Especifica un número del 1 al 6 🤨\n> _Ejemplo: ${ZenConfig.prefix}${ctx.commandName} 200 numero 4_`);
      }
      win = diceRoll === guessed;
      multiplier = win ? 6 : 0;
      resultText = `Tu número: ${guessed} | Dado: ${diceFace} ${diceName}`;
      gameType = '🎯 Adivina el número';
    } else {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *OPCIÓN INVÁLIDA*\n\n> Uy, algo no cuadra 🤨\n> Usá: *par*, *impar* o *numero*.`);
    }

    user.cooldowns.suerte = now;
    if (typeof user.markModified === 'function') user.markModified('cooldowns');

    if (win && multiplier > 0) {
      const winAmount = bet * multiplier;
      user.zencoins += winAmount;
      await user.save();
      await ctx.react('🎉');

      const reactions = [
        '¡Increíble! El destino te sonrió.',
        '¡Qué suerte! El universo conspiró a tu favor.',
        '¡Ganaste limpiamente!',
        'La fortuna está de tu lado.'
      ];

      return ctx.reply(
        `『 🎉 』 *VICTORIA*\n\n> ¡Listo! 🤩\n\n` +
        `✦ *Juego:* ${gameType}\n✦ *Resultado:* ${resultText}\n✦ *Apuesta:* ${bet} ${ZenConfig.currencies.zencoins.emoji}\n✦ *Multiplicador:* x${multiplier}\n✦ *Ganancia:* +${winAmount} ${ZenConfig.currencies.zencoins.emoji}\n\n` +
        `📖 _${pickRandom(reactions)}_`
      );
    } else {
      user.zencoins -= bet;
      await user.save();
      await ctx.react('💀');

      const dramaticLosses = [
        'El dado te ha traicionado.',
        'La mala suerte te persigue.',
        'Esto no es tu día.',
        'El azar es caprichoso.'
      ];

      return ctx.reply(
        `『 💀 』 *DERROTA*\n\n> Qué mala suerte 😢\n\n` +
        `✦ *Juego:* ${gameType}\n✦ *Resultado:* ${resultText}\n✦ *Apuesta:* ${bet} ${ZenConfig.currencies.zencoins.emoji}\n\n` +
        `📖 _${pickRandom(dramaticLosses)}_`
      );
    }
  });