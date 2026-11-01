import { jidNormalizedUser } from 'zyrix';
import { UserModel, GroupModel } from '../database/adapter.js';
import { ZenConfig } from '../../zen.config.js';
import { isSubBotAnticallEnabled } from './subbot-settings.js';

const digits = (value) => String(value || '').replace(/[^0-9]/g, '');

const isOwnerJid = (jid) => ZenConfig.ownerNumbers.some((number) => `${digits(number)}@s.whatsapp.net` === jid);

const findUser = async (sock, jid) => {
  const normalized = jidNormalizedUser(jid);
  const aliases = new Set([normalized]);
  try {
    for (const alias of sock.getJidAliases?.(normalized) || []) aliases.add(jidNormalizedUser(alias));
  } catch {}
  for (const alias of aliases) {
    const user = await UserModel.findOne({ id: alias });
    if (user) return user;
  }
  return new UserModel({ id: normalized, name: 'Sin Nombre' });
};

const findGroup = async (jid) => (await GroupModel.findOne({ id: jid })) || new GroupModel({ id: jid });

const saveStats = async (user) => {
  if (typeof user.markModified === 'function') user.markModified('stats');
  await user.save();
};

const handleGroupCall = async (sock, call) => {
  const groupJid = call.groupJid || call.from;
  const callerJid = call.participants?.[0] || call.from;
  const group = await findGroup(groupJid);
  if (!group?.anticallgp) return;

  const metadata = await sock.groupMetadata(groupJid).catch(() => null);
  if (!metadata?.participants) return;

  const participant = metadata.participants.find((p) => p.id === callerJid || p.lid === callerJid);
  const isAdmin = participant?.admin === 'admin' || participant?.admin === 'superadmin';
  if (isAdmin || isOwnerJid(callerJid)) return;

  await sock.groups.kick(groupJid, [callerJid]);
  await sock.sendMessage(groupJid, {
    text: `📞 *SISTEMA DE SEGURIDAD*\n\nEl usuario @${callerJid.split('@')[0]} ha sido expulsado automáticamente tras haber iniciado una llamada o videollamada grupal.`,
    mentions: [callerJid]
  });
};

const handlePrivateCall = async (sock, call) => {
  const user = await findUser(sock, jidNormalizedUser(call.from));
  user.stats ||= {};
  const warns = user.stats.callWarns || 0;

  if (warns >= 1) {
    user.stats.callWarns = 0;
    await saveStats(user);
    await sock.sendMessage(call.from, {
      text: `🚫 *BANEADO / BLOQUEADO*\n\nHas sido bloqueado de forma automática por realizar llamadas y videollamadas directas de forma reiterada al bot.`
    });
    await sock.profile.block(call.from);
    return;
  }

  user.stats.callWarns = warns + 1;
  await saveStats(user);
  await sock.sendMessage(call.from, {
    text: `⚠️ *ADVERTENCIA DE SEGURIDAD*\n\nLas llamadas y videollamadas directas al bot no están permitidas.\nSi vuelves a llamar una sola vez más, el sistema bloqueará tu número de forma automática y permanente.`
  });
};

export const createCallGuard = (sock) => async (event) => {
  const call = Array.isArray(event) ? event[0] : event;
  if (!call || call.status !== 'offer' || call.offline) return;
  if (sock.isSubBot && !isSubBotAnticallEnabled(sock.subbotNumber)) return;

  try {
    await sock.rejectCall(call.id, call.from);
    const isGroup = Boolean(call.isGroup || call.groupJid || call.from?.endsWith('@g.us'));
    if (isGroup) await handleGroupCall(sock, call);
    else await handlePrivateCall(sock, call);
  } catch (error) {
    console.error('[call] Error:', error);
  }
};
