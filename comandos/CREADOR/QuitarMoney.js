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

export default new ZenCommand('removeuser')
  .addAlias('quitaruser', 'restaruser', 'quitarkogen', 'quitarzen', 'quitarlux')
  .setCooldown(2)
  .setCategory('Owner')
  .requireOwner()
  .setUsage('[mención|responder|auto] <zen|kogen|lux> <cantidad|all>')
  .onExecute(async (ctx) => {
    const { targetRaw, type, amountRaw } = parseParams(ctx);
    const targetJid = await resolveTargetJid(ctx, targetRaw);

    if (!targetJid || !type || !amountRaw) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *USO CORRECTO*\n\n` +
        `> Mencionando: ${ZenConfig.prefix}removeuser @usuario [zen|kogen|lux] [cantidad|all]\n` +
        `> Respondiendo: ${ZenConfig.prefix}removeuser [zen|kogen|lux] [cantidad|all]\n` +
        `> A ti mismo: ${ZenConfig.prefix}removeuser [zen|kogen|lux] [cantidad|all]\n\n` +
        `> _Ejemplo: ${ZenConfig.prefix}removeuser kogen 5_`
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
      return ctx.reply(`『 ⚠️ 』 *USUARIO NO REGISTRADO*\n\n> El usuario objetivo no está registrado 😕`);
    }

    const typeLower = type.toLowerCase();
    let moneda = '';
    let emoji = '';
    let campo = '';
    let saldoActual = 0;

    if (typeLower === 'zen' || typeLower === 'zencoins' || typeLower === 'coins') {
      moneda = 'ZenCoins';
      emoji = ZenConfig.currencies.zencoins.emoji;
      campo = 'zencoins';
      saldoActual = user.zencoins;
    } else if (typeLower === 'kogen' || typeLower === 'ko' || typeLower === 'k') {
      moneda = 'Kōgen';
      emoji = ZenConfig.currencies.kogen.emoji;
      campo = 'kogen';
      saldoActual = user.kogen;
    } else if (typeLower === 'lux' || typeLower === 'lx') {
      moneda = 'Lux';
      emoji = ZenConfig.currencies.lux.emoji;
      campo = 'lux';
      saldoActual = user.lux || 0;
    } else {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *TIPO INVÁLIDO*\n\n> Revisá cómo lo escribiste 🧐\n\n` +
        `> Revisá cómo lo escribiste 🧐\n> Opciones válidas: *zen*, *kogen*, *lux*`
      );
    }

    let amount = 0;
    const isAll = amountRaw.toLowerCase() === 'all' || amountRaw.toLowerCase() === 'todo';

    if (isAll) {
      amount = saldoActual;
    } else {
      amount = parseInt(amountRaw, 10);
      if (isNaN(amount) || amount <= 0) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *MONTO INVÁLIDO*\n\n> Indicá un monto positivo o usa *all* para quitar todo 😵‍💫`);
      }
    }

    if (saldoActual < amount) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *SALDO INSUFICIENTE*\n\n` +
        `> ${user.name} tiene ${saldoActual} ${emoji} 🫣\n` +
        `> No se puede quitar ${amount} ${emoji}.`
      );
    }

    user[campo] -= amount;

    await user.save();
    await ctx.react('✅');

    return ctx.reply(
      `『 ✅ 』 *${moneda.toUpperCase()} REMOVIDOS*\n\n` +
      `✦ *Usuario:* ${user.name}\n` +
      `✦ *Monto:* -${amount} ${emoji}\n` +
      `✦ *Nuevo saldo:* ${user[campo]} ${emoji}`
    );
  });
