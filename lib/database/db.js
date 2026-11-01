import { UserModel, connectDatabase, getEngineName } from './adapter.js';
import { jidNormalizedUser } from 'zyrix';

export async function trackActivity(sock, msg) {
  const remoteJid = msg.key.remoteJid;
  if (!remoteJid || !remoteJid.endsWith('@g.us')) return;

  const candidates = msg.key.fromMe
    ? [sock.user?.id, sock.user?.lid]
    : [msg.key.participantAlt, msg.key.remoteJidAlt, msg.key.participant];
  let sender = '';
  for (const candidate of candidates.filter(Boolean)) {
    const resolved = sock.resolveJid?.(candidate) || candidate;
    sender ||= resolved;
    if (resolved.endsWith('@s.whatsapp.net')) {
      sender = resolved;
      break;
    }
  }

  if (!sender) return;
  let normalizedSender;
  try {
    normalizedSender = jidNormalizedUser(sender);
    for (const alias of sock.getJidAliases?.(sender) || []) {
      const existing = await UserModel.findOne({ id: jidNormalizedUser(alias) });
      if (existing) {
        normalizedSender = existing.id;
        break;
      }
    }
  } catch {
    normalizedSender = sender;
  }
  const chatKey = remoteJid.replace(/\./g, '_');

  try {
    await UserModel.updateOne(
      { id: normalizedSender },
      { $inc: { [`stats.messagesByGroup.${chatKey}`]: 1 } },
      { upsert: true }
    );
  } catch (error) {
    console.error('[trackActivity] Error:', error);
  }
}

export async function connectDB() {
  await connectDatabase();
}

export { getEngineName };
