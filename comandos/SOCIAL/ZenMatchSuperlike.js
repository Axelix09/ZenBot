import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { resolveTargetJid, findRegisteredUser } from '../../lib/core/targetResolver.js';
import { pushUniqueJid } from '../../lib/database/zenmatch-helpers.js';

export default new ZenCommand('matchsuper')
  .addAlias('superlike')
  .setCooldown(5)
  .setCategory('Social')
  .setHidden(true)
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();

    if (!user.zenmatch?.active) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 Primero debés crear tu perfil con *${ZenConfig.prefix}matchcrear* 😉`);
    }

    const [targetRef, ...msgParts] = ctx.args;
    const note = msgParts.join(' ').trim();

    if (!targetRef) return;

    if (user.kogen < 5) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *${ZenConfig.currencies.kogen.name.toUpperCase()} INSUFICIENTE*\n\n> Un Super Like cuesta *5 ${ZenConfig.currencies.kogen.name}* y todavía no te alcanzan 🥺`);
    }

    const targetJid = await resolveTargetJid(ctx, targetRef);
    const targetUser = await findRegisteredUser(ctx, targetJid);

    if (!targetUser || !targetUser.zenmatch?.active) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 Ese perfil ya no está disponible 🥲`);
    }

    user.kogen -= 5;
    const zm = user.zenmatch;
    const tzm = targetUser.zenmatch;

    await pushUniqueJid(ctx, zm.likesSent, targetUser.id);
    await pushUniqueJid(ctx, tzm.likesReceived, user.id);
    await pushUniqueJid(ctx, tzm.chatRequests, user.id);

    if (typeof user.markModified === 'function') user.markModified('zenmatch');
    if (typeof targetUser.markModified === 'function') targetUser.markModified('zenmatch');

    await user.save();
    await targetUser.save();

    await ctx.react('⭐');
    await ctx.reply(`『 ⭐ 』 *SUPER LIKE ENVIADO A ${tzm.name.toUpperCase()}*`);

    const noteText = note ? `\n\n💬 *Mensaje rompehielos:*\n_"${note}"_` : '';

    try {
      await ctx.sock.sendMessage(targetUser.id, {
        text:
          `『 ⭐ 』 *¡RECIBISTE UN SUPER LIKE EN ZENMATCH!*\n\n` +
          `> *${zm.name}* te envió un Super Like con atención especial.${noteText} 🙂\n\n` +
          `> Revisá tus solicitudes con *${ZenConfig.prefix}match solicitudes*.`
      });
    } catch (_) {}
  });