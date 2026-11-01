import { ZenConfig } from '../../zen.config.js';
import { GroupModel } from '../database/adapter.js';
import { activeSubBotNumbers } from './subbot-registry.js';

const GROUP_CACHE_TTL_MS = 10_000;
const cacheBySocket = new WeakMap();
const groupVersions = new Map();

const digits = (value) => String(value || '').split('@')[0].split(':')[0].replace(/\D/g, '');
const mainNumber = () => digits(ZenConfig.botPhoneNumber);

const participantCandidates = (participant) => [
  participant?.phoneNumber,
  participant?.jid,
  participant?.id,
  participant?.lid,
].filter(Boolean);

const participantNumbers = (metadata) => new Set(
  (metadata?.participants || []).flatMap(participantCandidates).map(digits).filter(Boolean)
);

const groupContainsMainBot = (numbers) => numbers.has(mainNumber());

const getGroupState = async (sock, chat) => {
  let groupCache = cacheBySocket.get(sock);
  if (!groupCache) {
    groupCache = new Map();
    cacheBySocket.set(sock, groupCache);
  }

  const version = groupVersions.get(chat) || 0;
  const cached = groupCache.get(chat);
  if (cached && cached.expiresAt > Date.now() && cached.version === version) return cached;

  try {
    const [metadata, group] = await Promise.all([
      sock.groupMetadata(chat),
      GroupModel.findOne({ id: chat })
    ]);
    const state = {
      numbers: participantNumbers(metadata),
      primaryBot: digits(group?.primaryBot) || null,
      version,
      expiresAt: Date.now() + GROUP_CACHE_TTL_MS
    };
    groupCache.set(chat, state);
    return state;
  } catch (error) {
    if (process.env.DEBUG) console.debug('[subbot-policy] No se pudo consultar el estado del grupo:', error?.message || error);
    return { numbers: new Set(), primaryBot: null, version, expiresAt: Date.now() + 1000 };
  }
};

export const shouldIgnoreBotMessage = async (sock, chat) => {
  if (!chat?.endsWith('@g.us')) return false;

  const state = await getGroupState(sock, chat);
  const main = mainNumber();
  const current = sock.isSubBot ? digits(sock.subbotNumber) : main;
  const activeInGroup = activeSubBotNumbers()
    .filter((numero) => state.numbers.has(numero))
    .sort();
  const fallback = activeInGroup[0] || null;

  if (state.primaryBot) {
    return current !== state.primaryBot;
  }

  if (!sock.isSubBot) return false;
  if (groupContainsMainBot(state.numbers)) return true;

  return fallback ? current !== fallback : false;
};

export const shouldSubBotIgnoreGroupMessage = shouldIgnoreBotMessage;

export const invalidateSubBotGroupPolicy = (sock, chat) => {
  if (!chat) return;
  groupVersions.set(chat, (groupVersions.get(chat) || 0) + 1);
  if (sock) cacheBySocket.get(sock)?.delete(chat);
};

export const invalidateAllSubBotGroupPolicies = (chat) => {
  if (!chat) return;
  groupVersions.set(chat, (groupVersions.get(chat) || 0) + 1);
};

export const normalizeBotNumber = digits;
export const configuredMainNumber = mainNumber;
export { activeSubBotNumbers };
