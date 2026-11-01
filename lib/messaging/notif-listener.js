import { areNotificationsEnabled, sendAdminNotification } from './group-notifications.js';

const jidOf = (participant) => participant?.phoneNumber || participant?.jid || participant?.id;
const tagOf = (jid) => `@${String(jid).split('@')[0].split(':')[0]}`;

const describeParticipants = (event, author) => {
  const jids = (event.participants || []).map(jidOf).filter(Boolean);
  if (!jids.length) return null;
  const list = jids.map(tagOf).join(', ');
  const actor = tagOf(author);

  switch (event.action) {
    case 'add':
      return {
        message: `『 👋 』 *NUEVO MIEMBRO*\n\n> ${list} entró al grupo, lo agregó ${actor} 😄`,
        mentions: [...jids, author]
      };
    case 'remove':
      return {
        message: `『 👋 』 *MIEMBRO ELIMINADO*\n\n> ${list} fue eliminado del grupo 😬`,
        mentions: jids
      };
    case 'leave':
      return {
        message: `『 👋 』 *MIEMBRO ELIMINADO*\n\n> ${list} se fue del grupo 😢`,
        mentions: jids
      };
    case 'promote':
      return {
        message: `『 ⬆️ 』 *ADMIN PROMOVIDO*\n\n> ${list} ahora es admin, lo promovió ${actor} 🥳`,
        mentions: [...jids, author]
      };
    case 'demote':
      return {
        message: `『 ⬇️ 』 *ADMIN DES-PROMOVIDO*\n\n> ${list} ya no es admin 😅`,
        mentions: jids
      };
    default:
      return null;
  }
};

const describeUpdate = (event, author) => {
  const actor = tagOf(author);

  if (event.announce === true) {
    return {
      message: `『 🔒 』 *GRUPO CERRADO*\n\n> El grupo quedó en modo *Solo Administradores* 🤫\n> Solo los admins pueden escribir.`,
      mentions: []
    };
  }

  if (event.announce === false) {
    return {
      message: `『 🔓 』 *GRUPO ABIERTO*\n\n> El grupo quedó abierto para *Todos* 😄\n> Cualquiera puede escribir.`,
      mentions: []
    };
  }

  if (event.subject !== undefined) {
    return {
      message: `『 📝 』 *NOMBRE DE GRUPO ACTUALIZADO*\n\n> El grupo ahora se llama *${event.subject || 'sin nombre'}* 😎\n> Lo cambió ${actor}.`,
      mentions: [author]
    };
  }

  if (Object.hasOwn(event, 'desc')) {
    return {
      message: `『 📄 』 *DESCRIPCIÓN DE GRUPO ACTUALIZADA*\n\n> Nueva descripción 🧐\n_${event.desc || 'sin descripción'}_\n\n> Lo cambió ${actor} 😉`,
      mentions: [author]
    };
  }

  return null;
};

export const notifListener = {
  async groupEvent(event, sock, ctx) {
    if (!ctx.isGroup) return;

    const groupId = ctx.chat;
    if (!areNotificationsEnabled(groupId)) return;

    const author = ctx.sender;
    const described = event.kind === 'participants'
      ? describeParticipants(event, author)
      : event.kind === 'update'
        ? describeUpdate(event, author)
        : null;
    if (!described) return;

    const admins = await sock.getGroupAdmins(groupId).catch(() => null);
    if (!admins) return;

    await sendAdminNotification(sock, groupId, admins, described.message, described.mentions);
  }
};
