import { UserModel, connectDatabase, getEngineName } from './adapter.js';
import { jidNormalizedUser } from 'zyrix';

const ACTIVITY_FLUSH_MS = 1000;
const pendingActivity = new Map();
let flushTimer = null;
let flushPromise = null;

function scheduleActivityFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushActivity();
  }, ACTIVITY_FLUSH_MS);
  flushTimer.unref?.();
}

export async function flushActivity() {
  if (flushPromise) return flushPromise;
  if (!pendingActivity.size) return;

  const batch = new Map(pendingActivity);
  pendingActivity.clear();

  flushPromise = Promise.allSettled(
    [...batch.entries()].map(async ([key, count]) => {
      const separator = key.indexOf('::');
      const normalizedSender = key.slice(0, separator);
      const chatKey = key.slice(separator + 2);
      await UserModel.updateOne(
        { id: normalizedSender },
        { $inc: { [`stats.messagesByGroup.${chatKey}`]: count } },
        { upsert: true }
      );
    })
  ).then((results) => {
    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('[trackActivity] Error:', result.reason);
      }
    }
  }).finally(() => {
    flushPromise = null;
    if (pendingActivity.size) scheduleActivityFlush();
  });

  return flushPromise;
}

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
  const key = `${normalizedSender}::${chatKey}`;
  pendingActivity.set(key, (pendingActivity.get(key) || 0) + 1);
  scheduleActivityFlush();
}

export async function connectDB() {
  await connectDatabase();
}

export { getEngineName };
