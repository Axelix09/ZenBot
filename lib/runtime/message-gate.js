import { trackActivity } from '../database/db.js';
import { Soul } from '../../soul.js';
import { ZenConfig } from '../../zen.config.js';
import { shouldSubBotIgnoreGroupMessage } from './subbot-policy.js';

const MAX_MESSAGE_AGE_SECONDS = 120;
const PROCESSED_MESSAGE_TTL_MS = 10 * 60 * 1000;
const processedMessages = new Map();

const getMessageKey = (msg) => [
  msg.key.remoteJid || '',
  msg.key.participant || msg.key.participantAlt || '',
  msg.key.id || ''
].join(':');

const alreadyProcessed = (msg) => {
  const key = getMessageKey(msg);
  if (!key || key.endsWith('::')) return false;
  if (processedMessages.has(key)) return true;

  processedMessages.set(key, Date.now());
  const timer = setTimeout(() => processedMessages.delete(key), PROCESSED_MESSAGE_TTL_MS);
  timer.unref?.();
  return false;
};

const toNumber = (timestamp) => (typeof timestamp === 'object' && timestamp !== null ? Number(timestamp.toString()) : Number(timestamp));

const isStale = (msg) => {
  if (!msg.messageTimestamp) return false;
  return Math.floor(Date.now() / 1000) - toNumber(msg.messageTimestamp) > MAX_MESSAGE_AGE_SECONDS;
};

const isPrimaryControlMessage = (sock, msg) => {
  try {
    const body = sock.parseMessage(msg)?.text || '';
    const command = body.trim().slice(ZenConfig.prefix.length).split(/\s+/)[0].toLowerCase();
    return body.startsWith(ZenConfig.prefix) && ['setprimary', 'primary', 'primario'].includes(command);
  } catch {
    return false;
  }
};

const isCommandMessage = (sock, msg) => {
  try {
    const body = sock.parseMessage(msg)?.text || '';
    return body.trim().startsWith(ZenConfig.prefix);
  } catch {
    return false;
  }
};

export const createMessageGate = (sock, { allowFromMe = false } = {}) => async (event) => {
  const msg = event;
  if (!msg?.key) return;
  if (!msg.message) return;
  if (msg.key.fromMe) {
    if (!allowFromMe && !ZenConfig.publicBotMode) return;
    if (sock.sentCache?.get(msg.key.id)) return;
  }

  if (alreadyProcessed(msg)) return;

  if (isStale(msg)) {
    if (process.env.DEBUG) console.log('[soul] Mensaje ignorado por antigüedad');
    return;
  }

  if (!isPrimaryControlMessage(sock, msg) && await shouldSubBotIgnoreGroupMessage(sock, msg.key.remoteJid)) {
    if (process.env.DEBUG) console.log('[subbot-policy] Mensaje ignorado: el bot principal está en el grupo');
    return;
  }

  if (isCommandMessage(sock, msg)) {
    try {
      await sock.readMessages([msg.key]);
    } catch (error) {
      if (process.env.DEBUG) console.debug('[readMessages] Error:', error);
    }
  }

  try {
    await trackActivity(sock, msg);
  } catch (error) {
    console.error('[trackActivity] Error:', error);
  }

  try {
    await Soul.handleMessage(sock, msg);
  } catch (error) {
    console.error('[handleMessage] Error:', error);
  }
};
