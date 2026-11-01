import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { PREDEFINED_TAGS } from '../../lib/database/zenmatch-data.js';
import { resolveTargetJid, findRegisteredUser } from '../../lib/core/targetResolver.js';
import { pushUniqueJid } from '../../lib/database/zenmatch-helpers.js';

export const cmdMatchFiltro = new ZenCommand('matchfiltro')
  .setCategory('Social')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const [action, value] = ctx.args;
    const prefix = ZenConfig.prefix;

    if (!user.zenmatch) user.zenmatch = {};
    if (!user.zenmatch.filters) user.zenmatch.filters = {};

    const filters = user.zenmatch.filters;

    if (!action) {
      await ctx.react('🎯');
      return ctx.reply(
        `『 🎯 』 *FILTROS DE BÚSQUEDA ZENMATCH*\n\n` +
        `✦ *Etiqueta requerida:* ${filters.requiredTag || 'Ninguna'}\n` +
        `✦ *Rango edad:* ${filters.minAge || 18} - ${filters.maxAge || 99} años\n\n` +
        `✦ *Comandos:*\n` +
        `  • *${prefix}matchfiltro tag #etiqueta* ➜ Filtrar por gusto\n` +
        `  • *${prefix}matchfiltro edad <min>-<max>* ➜ Filtrar por edad\n` +
        `  • *${prefix}matchfiltro borrar* ➜ Limpiar todos los filtros`
      );
    }

    const sub = action.toLowerCase();

    if (sub === 'tag' || sub === 'etiqueta') {
      if (!value || !PREDEFINED_TAGS.includes(value.toLowerCase())) {
        return ctx.reply(`『 ⚠️ 』 Esa etiqueta no es válida 🤨 Elegí una de: ${PREDEFINED_TAGS.join(' ')}`);
      }
      filters.requiredTag = value.toLowerCase();
      if (typeof user.markModified === 'function') user.markModified('zenmatch');
      await user.save();
      await ctx.react('✅');
      return ctx.reply(`『 ✅ 』 *FILTRO GUARDADO:* Solo buscarás candidatos con ${filters.requiredTag}`);
    }

    if (sub === 'edad') {
      if (!value || !value.includes('-')) {
        return ctx.reply(`『 ⚠️ 』 Usá el formato min-max 🧐 Ejemplo: *${prefix}matchfiltro edad 20-30*`);
      }
      const [min, max] = value.split('-').map(n => parseInt(n, 10));
      if (isNaN(min) || isNaN(max) || min < 18 || max > 99 || min > max) {
        return ctx.reply(`『 ⚠️ 』 Ese rango de edad no vale 🤨 (mínimo 18 años).`);
      }
      filters.minAge = min;
      filters.maxAge = max;
      if (typeof user.markModified === 'function') user.markModified('zenmatch');
      await user.save();
      await ctx.react('✅');
      return ctx.reply(`『 ✅ 』 *RANGOS DE EDAD GUARDADOS:* ${min} a ${max} años.`);
    }

    if (sub === 'borrar' || sub === 'limpiar') {
      user.zenmatch.filters = {};
      if (typeof user.markModified === 'function') user.markModified('zenmatch');
      await user.save();
      await ctx.react('✨');
      return ctx.reply(`『 ✨ 』 *TODOS LOS FILTROS HAN SIDO BORRADOS*`);
    }
  });

export const cmdMatchReportar = new ZenCommand('matchreportar')
  .setCategory('Social')
  .setHidden(true)
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const [targetRef] = ctx.args;

    if (!targetRef) return ctx.reply(`『 ⚠️ 』 Decime el ID del perfil que querés reportar 🤔`);

    const targetJid = await resolveTargetJid(ctx, targetRef);
    const targetUser = await findRegisteredUser(ctx, targetJid);
    if (!targetUser || !targetUser.zenmatch) return ctx.reply(`『 ⚠️ 』 No encontré ese perfil 😕`);

    await pushUniqueJid(ctx, user.zenmatch.passed, targetUser.id);

    targetUser.zenmatch.reportsCount = (targetUser.zenmatch.reportsCount || 0) + 1;

    if (typeof user.markModified === 'function') user.markModified('zenmatch');
    if (typeof targetUser.markModified === 'function') targetUser.markModified('zenmatch');

    await user.save();
    await targetUser.save();

    await ctx.react('🛡️');
    return ctx.reply(`『 🛡️ 』 *PERFIL REPORTADO Y OCULTADO DE TU BÚSQUEDA*`);
  });
