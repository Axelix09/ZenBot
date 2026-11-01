import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { resolveTargetJid, findRegisteredUser } from '../../lib/core/targetResolver.js';

function parseParams(ctx) {
  const args = ctx.args;
  let targetRaw = ctx.mentions?.[0];
  let type = '';
  let amountRaw = '';

  if (targetRaw) {
    const mentionIndex = args.findIndex(a => a.includes('@'));
    const remaining = args.filter((_, idx) => idx !== mentionIndex);
    type = remaining[0] || '';
    amountRaw = remaining[1] || '';
  } else {
    targetRaw = ctx.quotedParticipant || ctx.sender;
    type = args[0] || '';
    amountRaw = args[1] || '';
  }

  return { targetRaw, type, amountRaw };
}

export default new ZenCommand('setuser')
  .addAlias('dejaruser', 'estableceruser', 'dejarkogen', 'dejarzen', 'dejarlux')
  .setCooldown(2)
  .setCategory('Owner')
  .requireOwner()
  .setUsage('[mención|responder|auto] <zen|kogen|lux> <cantidad>')
  .onExecute(async (ctx) => {
    const { targetRaw, type, amountRaw } = parseParams(ctx);
    const targetJid = await resolveTargetJid(ctx, targetRaw);

    if (!targetJid || !type || amountRaw === undefined || amountRaw === '') {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *USO CORRECTO*\n\n` +
        `> Mencionando: ${ZenConfig.prefix}setuser @usuario [zen|kogen|lux] [cantidad]\n` +
        `> Respondiendo: ${ZenConfig.prefix}setuser [zen|kogen|lux] [cantidad]\n` +
        `> A ti mismo: ${ZenConfig.prefix}setuser [zen|kogen|lux] [cantidad]\n\n` +
        `> _Ejemplo: ${ZenConfig.prefix}setuser kogen 5_`
      );
    }

    let user;
    if (await ctx.isSameUser(targetJid, ctx.sender)) {
      user = await ctx.getUser();
    } else {
      user = await findRegisteredUser(ctx, targetJid);
    }

    if (!user) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *USUARIO NO REGISTRADO*\n\n> El usuario objetivo no está registrado 🥲`);
    }

    const amount = parseInt(amountRaw, 10);
    if (isNaN(amount) || amount < 0) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *MONTO INVÁLIDO*\n\n> Creo que te faltó algo 🤔\n\n> Indicá un monto válido (0 o positivo) 🧐`);
    }

    const typeLower = type.toLowerCase();
    let moneda = '';
    let emoji = '';
    let campo = '';
    let saldoAnterior = 0;

    if (typeLower === 'zen' || typeLower === 'zencoins' || typeLower === 'coins') {
      moneda = 'ZenCoins';
      emoji = ZenConfig.currencies.zencoins.emoji;
      campo = 'zencoins';
      saldoAnterior = user.zencoins;
      user.zencoins = amount;
    } else if (typeLower === 'kogen' || typeLower === 'ko' || typeLower === 'k') {
      moneda = 'Kōgen';
      emoji = ZenConfig.currencies.kogen.emoji;
      campo = 'kogen';
      saldoAnterior = user.kogen;
      user.kogen = amount;
    } else if (typeLower === 'lux' || typeLower === 'lx') {
      moneda = 'Lux';
      emoji = ZenConfig.currencies.lux.emoji;
      campo = 'lux';
      saldoAnterior = user.lux || 0;
      user.lux = amount;
    } else {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *TIPO INVÁLIDO*\n\n` +
        `> Creo que te faltó algo 🤔\n> Opciones válidas: *zen*, *kogen*, *lux*`
      );
    }

    await user.save();
    await ctx.react('✅');

    const diferencia = amount - saldoAnterior;
    const signo = diferencia >= 0 ? '+' : '';

    return ctx.reply(
      `『 ✅ 』 *${moneda.toUpperCase()} ESTABLECIDOS*\n\n` +
      `✦ *Usuario:* ${user.name}\n` +
      `✦ *Saldo anterior:* ${saldoAnterior} ${emoji}\n` +
      `✦ *Nuevo saldo:* ${user[campo]} ${emoji}\n` +
      `✦ *Cambio:* ${signo}${diferencia} ${emoji}`
    );
  });
