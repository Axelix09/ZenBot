import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { getTitleById, formatTitleList, TITLES } from '../../lib/game/titles.js';

export default new ZenCommand('titulo')
  .addAlias('title', 'titles', 'misTitulos')
  .setCooldown(5)
  .setCategory('Perfil')
  .requireRegistration()
  .setUsage('<equipar|quitar> <título>')
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

    const [action, target] = ctx.args;

    if (!action) {
      await ctx.react('📜');
      return ctx.reply(formatTitleList(user));
    }

    const sub = action.toLowerCase();

    if (sub === 'equipar' || sub === 'set' || sub === 'usar') {
      if (!target) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *ID REQUERIDA*\n\n> Eso no me cierra 😵‍💫\n> Ejemplo: *${ZenConfig.prefix}${ctx.commandName} equipar cazador_experto*`);
      }

      const title = getTitleById(target.toLowerCase());
      if (!title) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *TÍTULO NO ENCONTRADO*\n\n> Hmm, eso no aparece 🤔\n> ID: *${target}*\n> Usá *${ZenConfig.prefix}${ctx.commandName} list* para ver disponibles 🥲`);
      }

      const titles = user.titles || [];
      if (!titles.includes(title.id)) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *TÍTULO BLOQUEADO*\n\n> *${title.name}* no está desbloqueado 😳\n> _Requisito: ${title.description}_`);
      }

      user.activeTitle = title.id;
      await user.save();
      await ctx.react('✨');
      return ctx.reply(`『 ✨ 』 *TÍTULO EQUIPADO*\n\n> Equipaste: ${title.emoji} *${title.name}*`);
    }

    if (sub === 'list' || sub === 'lista') {
      await ctx.react('📋');
      const categories = {};
      for (const [key, title] of Object.entries(TITLES)) {
        if (!categories[title.category]) categories[title.category] = [];
        const unlocked = (user.titles || []).includes(title.id);
        categories[title.category].push({ ...title, unlocked });
      }

      const categoryNames = {
        pesca: '🎣 Pesca',
        caza: '🏹 Caza',
        mineria: '⛏️ Minería',
        economia: '💰 Economía',
        duelos: '⚔️ Duelos',
        robo: '🥷 Robos',
        racha: '🔥 Rachas',
        general: '✨ Generales',
        coleccion: '📚 Colección',
        records: '🏆 Récords'
      };

      let lines = ['『 📋 』 *CATÁLOGO DE TÍTULOS*\n'];
      for (const [cat, titles] of Object.entries(categories)) {
        lines.push(`\n✦ *${categoryNames[cat] || cat}*`);
        for (const title of titles) {
          const status = title.unlocked ? '✅' : '🔒';
          lines.push(`  ${status} ${title.emoji} ${title.name} [${title.id}]`);
          lines.push(`     _${title.description}_`);
        }
      }
      lines.push(`\n> _Usa *${ZenConfig.prefix}${ctx.commandName} equipar [id]* para equipar un título 😄_`);
      return ctx.reply(lines.join('\n'));
    }

    if (sub === 'remover' || sub === 'quitar' || sub === 'unset') {
      if (!user.activeTitle) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *SIN TÍTULO ACTIVO*\n\n> No tenés ningún título equipado 🥲`);
      }

      const oldTitle = getTitleById(user.activeTitle);
      user.activeTitle = null;
      await user.save();
      await ctx.react('✨');
      return ctx.reply(`『 ✨ 』 *TÍTULO REMOVIDO*\n\n> Removiste ${oldTitle ? oldTitle.emoji : ''} de tu perfil 🙂`);
    }

    await ctx.react('⚠️');
    return ctx.reply(
      `『 ⚠️ 』 *ACCIONES DISPONIBLES*\n\n` +
      `✦ *${ZenConfig.prefix}${ctx.commandName}* ➜ Ver títulos desbloqueados\n✦ *${ZenConfig.prefix}${ctx.commandName} list* ➜ Ver todos los títulos\n✦ *${ZenConfig.prefix}${ctx.commandName} equipar [id]* ➜ Equipar un título\n✦ *${ZenConfig.prefix}${ctx.commandName} remover* ➜ Quitar título actual`
    );
  });