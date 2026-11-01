import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { resolveTargetJid, findRegisteredUser } from '../../lib/core/targetResolver.js';

export default new ZenCommand('inspect')
  .addAlias('userinfo', 'getuser')
  .setCooldown(3)
  .setCategory('Owner')
  .requireOwner()
  .setUsage('@usuario')
  .onExecute(async (ctx) => {
    const targetMention = ctx.mentions?.[0];
    const targetJid = targetMention ? await resolveTargetJid(ctx, targetMention) : ctx.sender;

    const user = await findRegisteredUser(ctx, targetJid);
    if (!user) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *USUARIO NO REGISTRADO*\n\n> El usuario mencionado no está registrado 🥲`);
    }

    const targetName = user.name || targetJid.split('@')[0];
    const stats = user.stats || {};

    const loanStatus = user.loans?.active ? '🔴 Activo' : '✅ Sin deuda';
    const blockStatus = user.loans?.blockedPermanently ? '🚫 PERMANENTE' : user.loans?.isBlocked ? '🔒 Bloqueado' : '✅ Normal';

    await ctx.react('🔍');

    return ctx.reply(
      `『 🔍 』 *INSPECCIÓN DE USUARIO*\n\n` +
      `✦ *ID:* ${user.id}\n` +
      `✦ *Nombre:* ${targetName}\n` +
      `✦ *Registrado:* ${user.registered ? '✅ Sí' : '❌ No'}\n` +
      `✦ *Nivel:* ${user.level} (${user.xp} XP)\n` +
      `✦ *Rango:* ${user.role}\n` +
      `✦ *Racha:* ${user.streak || 0} días\n\n` +
      `💰 *ECONOMÍA*\n` +
      `✦ *ZenCoins:* ${user.zencoins} ${ZenConfig.currencies.zencoins.emoji}\n` +
      `✦ *Kōgen:* ${user.kogen} ${ZenConfig.currencies.kogen.emoji}\n` +
      `✦ *${ZenConfig.currencies.lux.name}:* ${user.lux || 0} ${ZenConfig.currencies.lux.emoji}\n` +
      `✦ *Banco:* ${user.bankBalance} ${ZenConfig.currencies.zencoins.emoji}\n\n` +
      `🏦 *PRÉSTAMOS*\n` +
      `✦ *Estado:* ${loanStatus}\n` +
      `✦ *Deuda:* ${user.loans?.totalDebt || 0} ${ZenConfig.currencies.zencoins.emoji}\n` +
      `✦ *Confianza:* ${user.loans?.trustScore || 50}%\n` +
      `✦ *Cuenta:* ${blockStatus}\n\n` +
      `📊 *ESTADÍSTICAS*\n` +
      `✦ *Comandos:* ${stats.commandsUsed || 0}\n` +
      `✦ *Robos exitosos:* ${stats.robsWon || 0}\n` +
      `✦ *Inversiones:* ${stats.investments || 0}\n` +
      `✦ *Cazas exitosas:* ${user.hunterStats?.successfulHunts || 0}\n` +
      `✦ *Minas exitosas:* ${user.miningStats?.successfulMinings || 0}\n` +
      `✦ *Pesca exitosa:* ${user.fishingStats?.successfulCatches || 0}`
    );
  });