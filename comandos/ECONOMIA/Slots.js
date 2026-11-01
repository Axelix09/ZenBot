import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';

const COOLDOWN_MS = 15000;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const SYMBOLS = [
  { s: '7️⃣', w: 2,  m3: 50, m2: 5 },
  { s: '💎', w: 4,  m3: 20, m2: 3 },
  { s: '🔔', w: 7,  m3: 10, m2: 2 },
  { s: '🍉', w: 10, m3: 5,  m2: 1.5 },
  { s: '🍇', w: 12, m3: 3,  m2: 1 },
  { s: '🍋', w: 15, m3: 3,  m2: 1 },
  { s: '🍒', w: 20, m3: 3,  m2: 1 }
];

function getRandomSymbol() {
  const totalWeight = SYMBOLS.reduce((acc, curr) => acc + curr.w, 0);
  let random = Math.random() * totalWeight;
  for (const sym of SYMBOLS) {
    if (random < sym.w) return sym;
    random -= sym.w;
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

export default new ZenCommand('slots')
  .addAlias('slot', 'tragamonedas', 'maquina')
  .setCooldown(0)
  .setCategory('Economía')
  .requireRegistration()
  .setUsage('<apuesta>')
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

    const now = Date.now();
    if (!user.cooldowns) {
      user.cooldowns = {};
    }

    const lastUsed = user.cooldowns.slots;
    if (lastUsed) {
      const expirationTime = lastUsed + COOLDOWN_MS;
      if (now < expirationTime) {
        const timeLeftSec = Math.ceil((expirationTime - now) / 1000);
        await ctx.react('⏳');
        return ctx.reply(`『 ⏳ 』 *ENFRIAMIENTO*\n\n> Esperá *${timeLeftSec}s* para jugar de nuevo 🥱`);
      }
    }

    const [betRaw] = ctx.args;
    const minBet = 100;
    const maxBet = 10000;
    const apuesta = parseInt(betRaw, 10);

    if (isNaN(apuesta) || apuesta < minBet || apuesta > maxBet) {
      await ctx.react('🎰');
      let help = `『 🎰 』 *ZEN SLOTS*\n\n` +
               `> Uso: *${ZenConfig.prefix}${ctx.commandName} <apuesta>*\n> Límites: ${minBet} a ${maxBet} ${ZenConfig.currencies.zencoins.emoji}\n\n` +
               `✦ *PREMIOS:*\n  • 7️⃣7️⃣7️⃣ ➜ x50\n  • 💎💎💎 ➜ x20\n  • 🔔🔔🔔 ➜ x10\n  • 🍉🍉🍉 ➜ x5\n  • 🍒🍒🍒 ➜ x3\n  • 🍒🍒⬜ ➜ x1 (Recuperas)`;
      return ctx.reply(help);
    }

    if (user.zencoins < apuesta) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SALDO INSUFICIENTE*\n\n> Solo tenés ${user.zencoins} ${ZenConfig.currencies.zencoins.emoji} 😅`);
    }

    user.zencoins -= apuesta;
    user.cooldowns.slots = now;
    if (typeof user.markModified === 'function') {
      user.markModified('cooldowns');
    }

    await user.save();
    await ctx.react('🎰');

    const buildFrame = (r1, r2, r3, statusStr) => {
      return `『 🎰 』 *ZEN SLOTS*\n\n` +
           `✦ *Apostador:* @${ctx.sender.split('@')[0]}\n✦ *Apuesta:* ${apuesta} ${ZenConfig.currencies.zencoins.emoji}\n\n` +
           `  [ ${r1} | ${r2} | ${r3} ]\n\n${statusStr}`;
    };

    const msgContext = {
      text: buildFrame('🌀', '🌀', '🌀', '> 🔄 _Girando los rodillos..._'),
      mentions: [ctx.sender]
    };
    
    const sentMsg = await ctx.sock.sendMessage(ctx.chat, msgContext, { quoted: ctx.rawMsg });
    const msgKey = sentMsg.key;

    for (let i = 0; i < 2; i++) {
      await sleep(500);
      let t1 = getRandomSymbol().s;
      let t2 = getRandomSymbol().s;
      let t3 = getRandomSymbol().s;
      await ctx.sock.sendMessage(ctx.chat, { 
        edit: msgKey, 
        text: buildFrame(t1, t2, t3, '> 🎰 _Los rodillos están girando..._'),
        mentions: [ctx.sender] 
      });
    }

    await sleep(600);

    const res1 = getRandomSymbol();
    const res2 = getRandomSymbol();
    const res3 = getRandomSymbol();

    let multiplicador = 0;
    let matchSymbol = null;
    let mensajeFinal = "";

    if (res1.s === res2.s && res2.s === res3.s) {
      multiplicador = res1.m3;
      matchSymbol = res1.s;
      mensajeFinal = `*🎁 ¡JACKPOT!* (3x ${matchSymbol})\n> Ganaste **${apuesta * multiplicador}** ${ZenConfig.currencies.zencoins.emoji}!`;
    } else if (res1.s === res2.s) {
      multiplicador = res1.m2;
      matchSymbol = res1.s;
      mensajeFinal = `*✅ PREMIO MENOR!* (2x ${matchSymbol})\n> Recuperás **${Math.floor(apuesta * multiplicador)}** ${ZenConfig.currencies.zencoins.emoji}.`;
    } else if (res2.s === res3.s) {
      multiplicador = res2.m2;
      matchSymbol = res2.s;
      mensajeFinal = `*✅ PREMIO MENOR!* (2x ${matchSymbol})\n> Recuperás **${Math.floor(apuesta * multiplicador)}** ${ZenConfig.currencies.zencoins.emoji}.`;
    } else if (res1.s === res3.s) {
      multiplicador = res1.m2;
      matchSymbol = res1.s;
      mensajeFinal = `*✅ PREMIO MENOR!* (2x ${matchSymbol})\n> Recuperás **${Math.floor(apuesta * multiplicador)}** ${ZenConfig.currencies.zencoins.emoji}.`;
    } else {
      multiplicador = 0;
      mensajeFinal = `*💀 PERDISTE.*\n> Tus **${apuesta}** ${ZenConfig.currencies.zencoins.emoji} se los queda el casino.`;
    }

    if (multiplicador > 0) {
      const ganancia = Math.floor(apuesta * multiplicador);
      user.zencoins += ganancia;
      await user.save();
    }

    await ctx.sock.sendMessage(ctx.chat, { 
      edit: msgKey, 
      text: buildFrame(res1.s, res2.s, res3.s, mensajeFinal),
      mentions: [ctx.sender] 
    });
  });