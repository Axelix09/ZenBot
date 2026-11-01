import { ZenCommand } from '../../lib/core/factory.js';
import { resolveTargetJid, findRegisteredUser } from '../../lib/core/targetResolver.js';
import { ZenConfig } from '../../zen.config.js';
import { renderHtmlCard, cardAsset } from '../../lib/cards/htmlCard.js';

const checkBank = (u) => {
  if (u.bankBalance > 0 && u.bankProtectionUntil && Date.now() > u.bankProtectionUntil) {
    u.zencoins += u.bankBalance;
    u.bankBalance = 0;
    u.bankProtectionUntil = null;
  }
};

const previewBank = (u) => {
  if (u.bankBalance > 0 && u.bankProtectionUntil && Date.now() > u.bankProtectionUntil) {
    return { zencoins: u.zencoins + u.bankBalance, bankBalance: 0, bankProtectionUntil: null };
  }
  return { zencoins: u.zencoins, bankBalance: u.bankBalance, bankProtectionUntil: u.bankProtectionUntil };
};

export default new ZenCommand('balance')
  .addAlias('bal', 'cartera', 'wallet')
  .setCooldown(5)
  .setCategory('Economía')
  .requireRegistration()
  .setUsage('@usuario (opcional)')
  .onExecute(async (ctx) => {
    const mentioned = ctx.mentions?.[0];
    const rawTarget = mentioned || ctx.quotedParticipant || ctx.sender;
    const targetJid = await resolveTargetJid(ctx, rawTarget);
    
    let user = (!mentioned && !ctx.quotedParticipant)
      ? await ctx.getUser()
      : await findRegisteredUser(ctx, targetJid);

    const pushName = user?.name || targetJid?.split('@')[0] || ctx.rawMsg.pushName || 'Usuario';

    if (!user || !user.registered) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *USUARIO NO REGISTRADO*\n\n> *${pushName}* todavía no se registró 😕`);
    }

    const isSelf = await ctx.isSameUser(targetJid, ctx.sender);
    await ctx.react(ZenConfig.currencies.zencoins.emoji);

    const stats = user.stats || {};
    let displayZencoins = user.zencoins;
    let displayBankBalance = user.bankBalance;
    let displayBankProtectionUntil = user.bankProtectionUntil;

    if (isSelf) {
      checkBank(user);
      displayZencoins = user.zencoins;
      displayBankBalance = user.bankBalance;
      displayBankProtectionUntil = user.bankProtectionUntil;

      if (user.zencoins > (stats.maxZenCoinsRecord || 0)) {
        stats.maxZenCoinsRecord = user.zencoins;
        if (typeof user.markModified === 'function') {
          user.markModified('stats');
        }
        await user.save();
      }
    } else {
      const preview = previewBank(user);
      displayZencoins = preview.zencoins;
      displayBankBalance = preview.bankBalance;
      displayBankProtectionUntil = preview.bankProtectionUntil;
    }

    const protegida = user.protectionUntil && user.protectionUntil > Date.now();
    const minProteccion = protegida ? Math.ceil((user.protectionUntil - Date.now()) / 60000) : 0;
    const proteccionLine = protegida
      ? `✦ *Protección activa:* ${minProteccion} min restantes`
      : '';

    const now = Date.now();
    const bankProtected = displayBankProtectionUntil && displayBankProtectionUntil > now;
    const minBankProt = bankProtected ? Math.ceil((displayBankProtectionUntil - now) / 60000) : 0;
    const hLeft = Math.floor(minBankProt / 60);
    const rMin = minBankProt % 60;
    const timeText = hLeft > 0 ? `${hLeft}h ${rMin}m` : `${rMin}m`;

    const bankLine = bankProtected
      ? `✦ *Banco:* ${displayBankBalance} ${ZenConfig.currencies.zencoins.emoji}  _(Seguro: ${timeText})_`
      : `✦ *Banco:* ${displayBankBalance} ${ZenConfig.currencies.zencoins.emoji}  _(Sin seguro)_`;

    let loanStatus = '';
    let blockStatus = '';

    if (user.loans?.active) {
      const daysLeft = user.loans.dueDate ? Math.max(0, Math.ceil((user.loans.dueDate - Date.now()) / 86400000)) : 0;
      const isOverdue = user.loans.dueDate && Date.now() > user.loans.dueDate;
      const daysOverdue = isOverdue ? Math.floor((Date.now() - user.loans.dueDate) / 86400000) : 0;
      
      if (user.loans.blockedPermanently) {
        blockStatus = '🚫 *CUENTA BLOQUEADA PERMANENTEMENTE*';
      } else if (user.loans.isBlocked) {
        if (user.loans.isPromised) {
          const promiseDays = Math.ceil((user.loans.promiseDate - Date.now()) / 86400000);
          blockStatus = `📝 *PROMESA ACTIVA* (${promiseDays} días restantes)`;
        } else {
          blockStatus = `🔒 *CUENTA BLOQUEADA* (${daysOverdue} días vencidos)`;
        }
      }
      
      loanStatus = `✦ *Préstamo:* ${user.loans.totalDebt} ${ZenConfig.currencies.zencoins.emoji}`;
      if (user.loans.interestAccumulated > 0) {
        loanStatus += ` (+${user.loans.interestAccumulated} intereses)`;
      }
      loanStatus += `\n✦ *Estado:* ${isOverdue ? `⚠️ ATRASADO (${daysOverdue} días)` : `${daysLeft} días restantes`}`;
    }

    const texto = [
      `『 💳 』 *CARTERA DE ${pushName.toUpperCase()}*`,
      ``,
      `✦ *${ZenConfig.currencies.zencoins.name}:* ${displayZencoins} ${ZenConfig.currencies.zencoins.emoji}`,
      `✦ *${ZenConfig.currencies.kogen.name}:* ${user.kogen} ${ZenConfig.currencies.kogen.emoji}`,
      `✦ *${ZenConfig.currencies.lux.name}:* ${user.lux || 0} ${ZenConfig.currencies.lux.emoji}`,
      bankLine,
      loanStatus ? loanStatus : '',
      blockStatus ? blockStatus : '',
      ``,
      `✦ *Asaltos recibidos:* ${stats.timesRobbed || 0}`,
      `✦ *Total robado:* ${stats.totalStolenFromMe || 0} ${ZenConfig.currencies.zencoins.emoji}`,
      `✦ *Récord de fortuna:* ${stats.maxZenCoinsRecord || 0} ${ZenConfig.currencies.zencoins.emoji}`,
      `✦ *Robos exitosos:* ${stats.robsWon || 0}`,
      `✦ *Acumulado robado:* ${stats.totalStolenByMe || 0} ${ZenConfig.currencies.zencoins.emoji}`,
      `✦ *Mayor transferencia:* ${stats.maxTransferReceived || 0} ${ZenConfig.currencies.zencoins.emoji}`,
      proteccionLine ? `✦ ${proteccionLine}` : ''
    ].filter(Boolean).join('\n');

    try {
      const card = await renderHtmlCard({
        eyebrow: `${ZenConfig.botName.toUpperCase()} · ECONOMÍA`,
        title: `Cartera de ${pushName}`,
        subtitle: `ID público ${user.userId || 'legacy'} · estado financiero actualizado`,
        accent: '#f59e0b',
        accent2: '#a78bfa',
        art: cardAsset('economy-orb.png'),
        stats: [
          { label: ZenConfig.currencies.zencoins.name, value: `${displayZencoins} ${ZenConfig.currencies.zencoins.emoji}`, note: 'saldo disponible' },
          { label: ZenConfig.currencies.kogen.name, value: `${user.kogen} ${ZenConfig.currencies.kogen.emoji}`, note: 'moneda premium' },
          { label: ZenConfig.currencies.lux.name, value: `${user.lux || 0} ${ZenConfig.currencies.lux.emoji}`, note: 'patrimonio' }
        ],
        rows: [
          { label: 'Banco', value: `${displayBankBalance} ${ZenConfig.currencies.zencoins.emoji}` },
          { label: 'Récord', value: `${stats.maxZenCoinsRecord || 0} ${ZenConfig.currencies.zencoins.emoji}` },
          { label: 'Robos exitosos', value: String(stats.robsWon || 0) },
          { label: 'Veces asaltado', value: String(stats.timesRobbed || 0) }
        ],
        caption: 'Usa .einfo para ver tus enfriamientos'
      });
      return ctx.sock.sendMessage(ctx.chat, { image: card, caption: texto }, { quoted: ctx.rawMsg });
    } catch (error) {
      if (process.env.DEBUG) console.debug('[balance card] fallback:', error.message);
      return ctx.reply(texto);
    }
  });
