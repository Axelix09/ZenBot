import { ZenCommand } from '../../lib/core/factory.js';
import { UserModel } from '../../lib/database/adapter.js';
import { ZenConfig } from '../../zen.config.js';
import { renderHtmlCard, cardAsset } from '../../lib/cards/htmlCard.js';

export default new ZenCommand('ranking')
  .addAlias('ricos', 'leaderboard', 'millonarios')
  .setCooldown(10)
  .setCategory('General')
  .requireRegistration()
  .onExecute(async (ctx) => {
    await ctx.react('🏆');

    const rawUsers = await UserModel.find({ registered: true });

    const sortedUsers = rawUsers
      .filter(u => u.registered)
      .sort((a, b) => b.zencoins - a.zencoins);

    if (!sortedUsers.length) {
      return ctx.reply(`『 ⚠️ 』 *SIN USUARIOS*\n\n> No hay usuarios registrados en el sistema 🤔`);
    }

    const accountUser = await ctx.getUser();
    const senderRankIndex = sortedUsers.findIndex((u) =>
      u.id === accountUser.id || ctx.hasSameJidAlias(u.id, accountUser.id)
    );
    const senderRank = senderRankIndex !== -1 ? senderRankIndex + 1 : null;

    const leaders = sortedUsers.slice(0, 10);

    const lines = [
      `『 🏆 』 *RÁNKING MILLONARIOS*`,
      ``,
      `✦ *Top Financiero Global*`,
      ``
    ];

    const medals = ['🥇', '🥈', '🥉'];

    leaders.forEach((u, i) => {
      const medal = medals[i] || '👤';
      lines.push(`  ${i + 1}. ${medal} *${u.name}*\n     ${ZenConfig.currencies.zencoins.emoji} ${u.zencoins}  ·  ${ZenConfig.currencies.kogen.emoji} ${u.kogen}  ·  Nvl. ${u.level}`);
    });

    lines.push(``);
    lines.push(`⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯`);
    lines.push(``);

    if (senderRank !== null) {
      const selfUser = sortedUsers[senderRankIndex];
      if (senderRank > 10) {
        lines.push(
          `✦ *Tu clasificación:* #${senderRank}\n  ${ZenConfig.currencies.zencoins.emoji} ${selfUser.zencoins}  ·  ${ZenConfig.currencies.kogen.emoji} ${selfUser.kogen}  ·  Nvl. ${selfUser.level}`
        );
      } else {
        lines.push(`✦ *Tu clasificación:* #${senderRank} (¡En el podio!)`);
      }
    }

    lines.push(``);
    lines.push(`> _El ránking solo evalúa saldos en billetera local._`);

    const texto = lines.join('\n');
    try {
      const card = await renderHtmlCard({
        eyebrow: `${ZenConfig.botName.toUpperCase()} · ECONOMÍA`,
        title: 'Ranking millonarios',
        subtitle: 'Top financiero global · saldo disponible en cartera',
        accent: '#fbbf24',
        accent2: '#f97316',
        art: cardAsset('economy-orb.png'),
        stats: [
          { label: 'Usuarios', value: String(sortedUsers.length), note: 'registrados' },
          { label: 'Líder', value: leaders[0]?.name || '—', note: `${leaders[0]?.zencoins || 0} ZC` },
          { label: 'Tu puesto', value: senderRank ? `#${senderRank}` : '—', note: 'clasificación' }
        ],
        rows: leaders.slice(0, 6).map((user, index) => ({
          label: `${medals[index] || `#${index + 1}`} ${user.name}`,
          value: `${user.zencoins} ${ZenConfig.currencies.zencoins.emoji}`
        })),
        caption: 'Solo evalúa saldos en billetera local'
      });
      return ctx.sock.sendMessage(ctx.chat, { image: card, caption: texto }, { quoted: ctx.rawMsg });
    } catch (error) {
      if (process.env.DEBUG) console.debug('[ranking card] fallback:', error.message);
      return ctx.reply(texto);
    }
  });
