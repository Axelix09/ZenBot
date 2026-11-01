import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { resolveTargetJid, findRegisteredUser } from '../../lib/core/targetResolver.js';
import { buscarSiguientePerfil, containsJidIdentity, pushUniqueJid, removeJidIdentity } from '../../lib/database/zenmatch-helpers.js';

export const cmdMatchLike = new ZenCommand('matchlike')
  .setCategory('Social')
  .setHidden(true)
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    if (!user.zenmatch?.active) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 Primero debés crear tu perfil con *${ZenConfig.prefix}matchcrear* 😉`);
    }

    const [targetRef] = ctx.args;
    if (!targetRef) return;

    const targetJid = await resolveTargetJid(ctx, targetRef);
    const targetUser = await findRegisteredUser(ctx, targetJid);

    if (!targetUser || !targetUser.zenmatch?.active) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 Ese perfil ya no está disponible 🥲`);
    }

    const zm = user.zenmatch;
    const tzm = targetUser.zenmatch;
    const targetId = targetUser.id;

    await pushUniqueJid(ctx, zm.likesSent, targetId);
    await pushUniqueJid(ctx, tzm.likesReceived, user.id);

    const isMatch = await containsJidIdentity(ctx, tzm.likesSent, user.id);

    if (isMatch) {
      await pushUniqueJid(ctx, zm.matches, targetId);
      await pushUniqueJid(ctx, tzm.matches, user.id);

      zm.chatRequests = await removeJidIdentity(ctx, zm.chatRequests || [], targetId);
      tzm.chatRequests = await removeJidIdentity(ctx, tzm.chatRequests || [], user.id);

      if (typeof user.markModified === 'function') user.markModified('zenmatch');
      if (typeof targetUser.markModified === 'function') targetUser.markModified('zenmatch');

      await user.save();
      await targetUser.save();

      const resolvedMe = ctx.resolveTargetJid(user.id);
      const myNumber = resolvedMe?.endsWith('@s.whatsapp.net') ? resolvedMe.split('@')[0] : null;
      const targetNumber = targetId.endsWith('@s.whatsapp.net') ? targetId.split('@')[0] : null;

      await ctx.react('🔥');
      await ctx.reply(
        `『 🔥 』 *¡ES UN MATCH!* 🎉\n\n` +
        `> ¡Tú y *${tzm.name}* se han gustado mutuamente! 😄\n\n` +
        (targetNumber ? `📲 *Inicia la conversación directamente en WhatsApp:*\nhttps://wa.me/${targetNumber}` : `> Abrí el chat desde el perfil de WhatsApp.`)
      );

      await ctx.sock.sendMessage(targetId, {
        text:
          `『 🔥 』 *¡NUEVO MATCH EN ZENMATCH!* 🎉\n\n` +
          `> ¡A *${zm.name}* también le gustas! 😌\n\n` +
          (myNumber ? `📲 *Empiecen a chatear aquí:*\nhttps://wa.me/${myNumber}` : `📲 Abre el chat desde el perfil de WhatsApp.`)
      });

      return;
    }

    await pushUniqueJid(ctx, tzm.chatRequests, user.id);

    if (typeof user.markModified === 'function') user.markModified('zenmatch');
    if (typeof targetUser.markModified === 'function') targetUser.markModified('zenmatch');

    await user.save();
    await targetUser.save();

    await ctx.react('❤️');
    await ctx.reply(`『 ❤️ 』 *Le diste Me Gusta a ${tzm.name}.*`);

    try {
      await ctx.sock.sendMessage(targetId, {
        text:
          `『 ❤️ 』 *¡NUEVO ME GUSTA EN ZENMATCH!*\n\n` +
          `> Alguien reaccionó a tu perfil 😉\n` +
          `> Usá *${ZenConfig.prefix}match solicitudes* para revisar.`
      });
    } catch (_) {}

    return buscarSiguientePerfil(ctx, user);
  });

export const cmdMatchSkip = new ZenCommand('matchskip')
  .setCategory('Social')
  .setHidden(true)
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    if (!user.zenmatch?.active) return;

    const [targetRef] = ctx.args;

    if (targetRef) {
      const targetJid = await resolveTargetJid(ctx, targetRef);
      const target = await findRegisteredUser(ctx, targetJid);
      const targetId = target?.id || targetJid;
      if (targetId && !(await containsJidIdentity(ctx, user.zenmatch.passed, targetId))) {
        user.zenmatch.passed.push(targetId);
        if (typeof user.markModified === 'function') user.markModified('zenmatch');
        await user.save();
      }
    }

    return buscarSiguientePerfil(ctx, user);
  });

export const cmdMatchSolicitudes = new ZenCommand('matchsolicitudes')
  .setCategory('Social')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const zm = user.zenmatch || {};

    if (!zm.active) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 Primero debés crear tu perfil con *${ZenConfig.prefix}matchcrear* 😉`);
    }

    const requests = zm.chatRequests || [];

    if (requests.length === 0) {
      await ctx.react('📩');
      return ctx.reply(`『 📩 』 *SIN SOLICITUDES*\n\n> No tenés solicitudes de chat pendientes por ahora 😕`);
    }

    const prefix = ZenConfig.prefix;
    let text = `『 📩 』 *SOLICITUDES RECIBIDAS (${requests.length})*\n\n`;

    for (let i = 0; i < requests.length; i++) {
      const requesterJid = requests[i];
      const requester = await ctx.getUserById(requesterJid);
      if (requester && requester.zenmatch) {
        const rzm = requester.zenmatch;
        text += `✦ *${i + 1}. ${rzm.name}* (${rzm.age} años)\n`;
        text += `  • Etiquetas: ${(rzm.tags || []).join(' ')}\n`;
        text += `  • Aceptar: *${prefix}matchaceptar ${requester.userId}*\n\n`;
      }
    }

    await ctx.react('📩');
    return ctx.reply(text);
  });

export const cmdMatchAceptar = new ZenCommand('matchaceptar')
  .setCategory('Social')
  .setHidden(true)
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    if (!user.zenmatch?.active) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 Primero debés crear tu perfil con *${ZenConfig.prefix}matchcrear* 😉`);
    }

    const [targetRef] = ctx.args;
    if (!targetRef) return ctx.reply(`『 ⚠️ 』 Decime el ID del perfil que querés aceptar 🤔`);

    const targetJid = await resolveTargetJid(ctx, targetRef);
    const targetUser = await findRegisteredUser(ctx, targetJid);

    if (!targetUser || !targetUser.zenmatch?.active) {
      return ctx.reply(`『 ⚠️ 』 Ese perfil no existe o ya no está disponible 😕`);
    }

    const zm = user.zenmatch;
    const tzm = targetUser.zenmatch;
    const targetId = targetUser.id;

    zm.chatRequests = await removeJidIdentity(ctx, zm.chatRequests || [], targetId);
    tzm.chatRequests = await removeJidIdentity(ctx, tzm.chatRequests || [], user.id);

    await pushUniqueJid(ctx, zm.matches, targetId);
    await pushUniqueJid(ctx, tzm.matches, user.id);

    if (typeof user.markModified === 'function') user.markModified('zenmatch');
    if (typeof targetUser.markModified === 'function') targetUser.markModified('zenmatch');

    await user.save();
    await targetUser.save();

    await ctx.react('🔥');
    await ctx.reply(
      `『 🔥 』 *¡SOLICITUD ACEPTADA!*\n\n` +
      `> Conectaste con *${tzm.name}* 🙂\n\n` +
      `📲 *Chatea en privado:*\n${targetId.endsWith('@s.whatsapp.net') ? `https://wa.me/${targetId.split('@')[0]}` : 'Abre el chat desde el perfil de WhatsApp.'}`
    );

    await ctx.sock.sendMessage(targetId, {
      text:
        `『 🔥 』 *¡SOLICITUD ACEPTADA EN ZENMATCH!*\n\n` +
        `> *${zm.name}* aceptó tu solicitud de chat 😄\n\n` +
        `📲 *Haz clic para chatear:*\n${ctx.resolveTargetJid(user.id)?.endsWith('@s.whatsapp.net') ? `https://wa.me/${ctx.resolveTargetJid(user.id).split('@')[0]}` : 'Abre el chat desde el perfil de WhatsApp.'}`
    });
  });