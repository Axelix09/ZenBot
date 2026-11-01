import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { resolveTargetJid, findRegisteredUser } from '../../lib/core/targetResolver.js';
import { ZenConfig } from '../../zen.config.js';

const COOLDOWN_SECONDS = 1200;
const MIN_TARGET_ZENCOINS = 300;
const PROTECTION_MS = 30 * 60 * 1000;
const MIN_STEAL_PCT = 0.12;
const MAX_STEAL_PCT = 0.28;
const MAX_STEAL_CAP = 6000;
const FINE_MIN_PCT = 0.06;
const FINE_MAX_PCT = 0.15;

const checkBank = (u) => {
  if (u.bankBalance > 0 && u.bankProtectionUntil && Date.now() > u.bankProtectionUntil) {
    u.zencoins += u.bankBalance;
    u.bankBalance = 0;
    u.bankProtectionUntil = null;
  }
};

export default new ZenCommand('robar')
  .addAlias('rob', 'atracar', 'asaltar')
  .setCooldown(0)
  .setCategory('Economía')
  .requireRegistration()
  .setUsage('@usuario')
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

    const lastUsed = user.cooldowns.robar;
    const cooldownAmount = COOLDOWN_SECONDS * 1000;

    if (lastUsed) {
      const expirationTime = lastUsed + cooldownAmount;
      if (now < expirationTime) {
        const timeLeftSec = (expirationTime - now) / 1000;
        const m = Math.floor(timeLeftSec / 60);
        const s = Math.floor(timeLeftSec % 60);
        const timeStr = m > 0 ? `${m}m ${s}s` : `${s}s`;
        await ctx.react('⏳');
        return ctx.reply(`『 ⏳ 』 *ENFRIAMIENTO*\n\n> Esperá *${timeStr}* para asaltar de nuevo 🥱`);
      }
    }

    const rawMentioned = ctx.mentions?.[0] || ctx.quotedParticipant;
    const targetJid = await resolveTargetJid(ctx, rawMentioned);

    if (!targetJid) {
      await ctx.react('🗡️');
      return ctx.reply(
        `『 🗡️ 』 *SISTEMA DE ASALTO*\n\n` +
        `> Uso: *${ZenConfig.prefix}${ctx.commandName} @usuario* (o responde a su mensaje)\n\n` +
        `> _Riesgo: si fracasas, pagarás una multa._\n> _Inmunidad: la víctima recibe 30 min de protección._`
      );
    }

    if (await ctx.isSameUser(targetJid, ctx.sender)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *AUTO-ASALTO*\n\n> No podés robarte a ti mismo 😄`);
    }

    const target = await findRegisteredUser(ctx, targetJid);

    if (!target || !target.registered) {
      await ctx.react('⚠️');
      const targetName = targetJid.split('@')[0];
      return ctx.reply(`『 ⚠️ 』 *USUARIO NO REGISTRADO*\n\n> *${targetName}* todavía no se registró 😕`);
    }

    checkBank(user);
    checkBank(target);

    const targetName = target.name || targetJid.split('@')[0];

    if (user.marriedWith && await ctx.isSameUser(user.marriedWith, target.id)) {
      await ctx.react('💍');
      return ctx.reply(`『 💍 』 *PAREJA PROTEGIDA*\n\n> No podés robarle a tu pareja 😄`);
    }

    if (target.zencoins < MIN_TARGET_ZENCOINS) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *VÍCTIMA POBRE*\n\n> *${targetName}* no tiene suficientes fondos 🙂`);
    }

    if (target.protectionUntil && target.protectionUntil > Date.now()) {
      const minRestantes = Math.ceil((target.protectionUntil - Date.now()) / 60000);
      await ctx.react('🛡️');
      return ctx.reply(
        `『 🛡️ 』 *PROTECCIÓN ACTIVA*\n\n` +
        `> *${targetName}* está protegida (${minRestantes} min restantes) 🤨`
      );
    }

    let chanceBonus = 0;
    if (user.cooldowns?.buff_precision_until && user.cooldowns.buff_precision_until > Date.now()) {
      chanceBonus = 0.15;
    }

    const diffNivel = user.level - target.level;
    const chanceExito = Math.min(0.90, Math.max(0.15, 0.42 + diffNivel * 0.015 + chanceBonus));
    const exito = Math.random() < chanceExito;

    await ctx.react('🗡️');

    if (exito) {
      let stealMultiplier = 1.0;
      if (user.cooldowns?.buff_codicia_until && user.cooldowns.buff_codicia_until > Date.now()) {
        stealMultiplier = 1.15;
      }

      const pct = MIN_STEAL_PCT + Math.random() * (MAX_STEAL_PCT - MIN_STEAL_PCT);
      const monto = Math.min(MAX_STEAL_CAP, Math.floor(target.zencoins * pct * stealMultiplier));

      target.zencoins -= monto;
      user.zencoins += monto;
      target.protectionUntil = Date.now() + PROTECTION_MS;

      user.stats.robsWon = (user.stats.robsWon || 0) + 1;
      target.stats.timesRobbed = (target.stats.timesRobbed || 0) + 1;

      user.stats.totalStolenByMe = (user.stats.totalStolenByMe || 0) + monto;
      target.stats.totalStolenFromMe = (target.stats.totalStolenFromMe || 0) + monto;

      let shieldText = '';
      if (user.cooldowns?.buff_escudo_activo_until && user.cooldowns.buff_escudo_activo_until > Date.now()) {
        user.protectionUntil = Date.now() + (10 * 60 * 1000);
        shieldText = `\n🛡️ *Refugio activado:* 10 min de inmunidad.`;
      }

      if (typeof user.markModified === 'function') user.markModified('stats');
      if (typeof target.markModified === 'function') target.markModified('stats');

      user.cooldowns.robar = Date.now();
      if (typeof user.markModified === 'function') user.markModified('cooldowns');

      await user.save();
      await target.save();

      return ctx.reply(
        `『 🗡️ 』 *ASALTO EXITOSO*\n\n> ¡Qué crack! 🥳\n\n` +
        `✦ *Autor:* ${user.name}\n✦ *Objetivo:* ${targetName}\n\n` +
        `✦ *Botín:* ${monto} ${ZenConfig.currencies.zencoins.emoji}\n✦ *Víctima:* Protegida (30m)${shieldText}`,
        { mentions: [targetJid] }
      );
    } else {
      const pct = FINE_MIN_PCT + Math.random() * (FINE_MAX_PCT - FINE_MIN_PCT);
      const multa = Math.max(20, Math.floor(user.zencoins * pct));

      user.zencoins = Math.max(0, user.zencoins - multa);
      target.zencoins += multa;
      user.stats.robsLost = (user.stats.robsLost || 0) + 1;

      if (typeof user.markModified === 'function') user.markModified('stats');
      if (typeof target.markModified === 'function') target.markModified('stats');

      user.cooldowns.robar = Date.now();
      if (typeof user.markModified === 'function') user.markModified('cooldowns');

      await user.save();
      await target.save();

      return ctx.reply(
        `『 🚨 』 *ASALTO FALLIDO*\n\n> Uy, salió mal 😭\n\n` +
        `✦ *Autor:* ${user.name}\n✦ *Objetivo:* ${targetName}\n\n` +
        `✦ *Resultado:* Interceptado por seguridad\n✦ *Multa:* -${multa} ${ZenConfig.currencies.zencoins.emoji}`,
        { mentions: [targetJid] }
      );
    }
  });
