import { jidNormalizedUser, jidDecode } from 'zyrix';
import { ZenConfig } from '../../zen.config.js';
import { Renderer } from './renderer.js';
import { UserModel, GroupModel } from '../database/adapter.js';
import { extractRawTarget, peekRelationTargets, resolveTargetJid as resolveStoredTargetJid } from './targetResolver.js';
import { getTitleById } from '../game/titles.js';
import { downloadBuffer } from '../media/buffer.js';
import { isPublicUserId, normalizePublicUserId } from '../database/publicId.js';

const resolvedJidCache = new Map();

setInterval(() => {
  resolvedJidCache.clear();
}, 300000).unref?.();

const decodeJid = (jid) => {
  if (!jid) return jid;
  if (/:\d+@/gi.test(jid)) {
    const d = jidDecode(jid);
    return d?.user && d?.server ? `${d.user}@${d.server}` : jid;
  }
  return jid;
};

const cleanJid = (jid) => jidNormalizedUser(decodeJid(jid || ''));

const getJidAliases = (sock, jid) => {
  const aliases = new Set();
  const add = (value) => {
    if (!value) return;
    try { aliases.add(cleanJid(value)); } catch {}
  };
  add(jid);
  try {
    for (const alias of sock.getJidAliases?.(jid) || []) add(alias);
  } catch {}
  try { add(sock.resolveJid?.(jid)); } catch {}
  return [...aliases];
};

const isPhoneJid = (jid) => /@(s\.whatsapp\.net|c\.us|hosted)$/i.test(jid || '');

const resolveSenderJid = (sock, candidates) => {
  let fallback = null;
  for (const candidate of candidates.filter(Boolean)) {
    let normalized;
    try {
      normalized = cleanJid(candidate);
    } catch {
      continue;
    }
    let resolved = normalized;
    try {
      resolved = cleanJid(sock.resolveJid?.(normalized) || normalized);
    } catch {}
    fallback ||= resolved;
    if (resolved.endsWith('@s.whatsapp.net')) return resolved;
  }
  return fallback || cleanJid(candidates.find(Boolean) || '');
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const unwrapMessage = (message) => {
  let current = message;
  for (let i = 0; i < 5 && current; i++) {
    const wrapper = ['ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension', 'documentWithCaptionMessage']
      .find((key) => current[key]?.message);
    if (!wrapper) return current;
    current = current[wrapper].message;
  }
  return current || {};
};

const getContextInfo = (message) => {
  const body = unwrapMessage(message);
  return Object.values(body).find((value) => value && typeof value === 'object' && value.contextInfo)?.contextInfo || {};
};

const typingDelay = (text) => {
  const base = Math.min(text.length * 1.5, 400);
  const jitter = Math.floor(Math.random() * 100);
  return Math.max(100, base + jitter);
};

export class CommandContext {
  constructor(sock, msg, args, commandName) {
    this.sock = sock;
    this.rawMsg = msg;
    this.args = args;
    this.commandName = commandName;
    this.chat = msg.key.remoteJid;
    this.isGroup = this.chat.endsWith('@g.us');
    
    const senderCandidates = msg.key.fromMe
      ? [sock.user?.id, sock.user?.lid]
      : (this.isGroup
        ? [msg.key.participantAlt, msg.key.remoteJidAlt, msg.key.participant, msg.participant]
        : [msg.key.remoteJidAlt, msg.key.remoteJid]);
    this.sender = resolveSenderJid(sock, senderCandidates);
    this.senderCandidates = [...new Set(senderCandidates.filter(Boolean).map((candidate) => {
      try { return cleanJid(candidate); } catch { return null; }
    }).filter(Boolean))];

    const contextInfo = getContextInfo(msg.message);

    const rawMentions = Array.isArray(contextInfo.mentionedJid) ? contextInfo.mentionedJid : [];
    this.mentions = rawMentions.map((jid) => jidNormalizedUser(decodeJid(jid)));

    this.quotedParticipant = contextInfo.participant
      ? jidNormalizedUser(decodeJid(contextInfo.participant))
      : null;
    this._typedOnce = false;
    this._adminCache = null;
  }

  async reply(text, options = {}) {
    const { quoted, mentions, contextInfo: extraContextInfo, ...restOptions } = options;

    const contextInfo = {
      isForwarded: true,
      forwardingScore: 1,
      forwardedNewsletterMessageInfo: {
        newsletterJid: ZenConfig.newsletterJid,
        serverMessageId: 1,
        newsletterName: ZenConfig.newsletterName
      },
      ...extraContextInfo
    };

    if (!this._typedOnce) {
      this._typedOnce = true;
      try {
        await this.sock.sendPresenceUpdate('composing', this.chat);
        await sleep(typingDelay(text));
        await this.sock.sendPresenceUpdate('paused', this.chat);
      } catch (error) {
        if (process.env.DEBUG) console.debug('[reply] Error en typing:', error);
      }
    }

    return this.sock.sendMessage(this.chat, {
      text,
      mentions: mentions || [this.sender],
      contextInfo,
      ...restOptions
    }, { quoted: quoted || this.rawMsg });
  }

  getQuoted() {
    const contextInfo = getContextInfo(this.rawMsg.message);
    if (!contextInfo.quotedMessage || !contextInfo.stanzaId) return null;
    return {
      key: {
        remoteJid: this.chat,
        id: contextInfo.stanzaId,
        fromMe: false,
        participant: contextInfo.participant
      },
      message: contextInfo.quotedMessage
    };
  }

  async download({ quoted = false } = {}) {
    return this.sock.downloadMedia(quoted ? (this.getQuoted()?.message || this.rawMsg.message) : this.rawMsg.message);
  }

  downloadBuffer(input, options) {
    return downloadBuffer(input, options);
  }

  async draw(title, rows = [], footer = null, options = {}) {
    const { theme, ...replyOptions } = options;
    const output = Renderer.drawInterface(title, rows, footer, theme);
    return this.reply(output, replyOptions);
  }

  async react(emoji) {
    try {
      const key = this.rawMsg?.key;
      if (!key?.id || !key.remoteJid || typeof key.fromMe !== 'boolean') {
        throw new TypeError('el mensaje no contiene una key válida para reaccionar');
      }
      return await this.sock.sendReaction(this.chat, key, emoji);
    } catch (error) {
      console.warn('[react] No se pudo enviar la reacción:', error?.message || error);
      return null;
    }
  }

  async isSenderAdmin() {
    if (!this.isGroup) return false;
    if (this._adminCache !== null) return this._adminCache;

    try {
      this._adminCache = false;
      for (const candidate of [this.sender, ...(this.senderCandidates || [])]) {
        if (await this.sock.isGroupAdmin(this.chat, candidate)) {
          this._adminCache = true;
          break;
        }
      }
    } catch (error) {
      console.error('[isSenderAdmin] Error:', error);
      this._adminCache = false;
    }
    return this._adminCache;
  }

  async isBotAdmin() {
    if (!this.isGroup) return false;
    try {
      const me = this.sock.user;
      for (const candidate of [me?.lid, me?.id].filter(Boolean)) {
        if (await this.sock.isGroupAdmin(this.chat, candidate)) return true;
      }
      return false;
    } catch (error) {
      console.error('[isBotAdmin] Error:', error);
      return false;
    }
  }

  async getUser() {
    if (this._selfUser) return this._selfUser;
    const candidates = [this.sender, ...(this.senderCandidates || [])];
    let fallback = null;
    for (const candidate of [...new Set(candidates.filter(Boolean))]) {
      const found = await this.getUserById(candidate, this.rawMsg.pushName);
      if (found?.registered) {
        this._selfUser = found;
        return found;
      }
      fallback ||= found;
    }
    this._selfUser = fallback || await this.getUserById(this.sender, this.rawMsg.pushName);
    return this._selfUser;
  }

  async getUserById(jid, fallbackName = 'Sin Nombre') {
    const rawValue = String(jid || '').trim();
    const cachedJid = resolvedJidCache.get(rawValue);
    if (cachedJid) {
      const cachedDoc = await UserModel.findOne({ id: cachedJid });
      if (cachedDoc) return cachedDoc;
    }

    try {
      if (isPublicUserId(rawValue)) {
        const publicUser = await UserModel.findOne({ userId: normalizePublicUserId(rawValue) });
        if (publicUser) {
          resolvedJidCache.set(rawValue, publicUser.id);
          return publicUser;
        }
      }
      const normalizedJid = jidNormalizedUser(jid);
      for (const alias of getJidAliases(this.sock, normalizedJid)) {
        const exact = await UserModel.findOne({ id: alias });
        if (exact) {
          resolvedJidCache.set(rawValue, exact.id);
          return exact;
        }
      }

      if (isPhoneJid(normalizedJid)) {
        const phone = normalizedJid.split('@')[0].replace(/:\d+$/, '').replace(/\D/g, '');
        if (phone.length >= 8) {
          const escaped = phone.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const legacy = await UserModel.findOne({
            id: new RegExp(`^${escaped}(?::\\d+)?@(s\\.whatsapp\\.net|c\\.us|hosted)$`, 'i')
          });
          if (legacy) {
            resolvedJidCache.set(rawValue, legacy.id);
            return legacy;
          }
        }
      }
      return new UserModel({ id: normalizedJid, name: fallbackName });
    } catch (error) {
      console.error('[getUserById] Error:', error);
      return new UserModel({ id: rawValue, name: fallbackName });
    }
  }

  async getGroup() {
    if (!this.isGroup) return null;
    if (this._groupDb) return this._selfGroup;

    try {
      let dbGroup = await GroupModel.findOne({ id: this.chat });
      if (!dbGroup) {
        dbGroup = new GroupModel({ id: this.chat });
      }
      this._selfGroup = dbGroup;
    } catch (error) {
      console.error('[getGroup] Error:', error);
      this._selfGroup = new GroupModel({ id: this.chat });
    }

    this._groupDb = true;
    return this._selfGroup;
  }

  resolveTargetJid(rawJid) {
    if (!rawJid) return null;
    try {
      return this.sock.resolveJid?.(rawJid) || cleanJid(rawJid);
    } catch (_) {
      return cleanJid(rawJid);
    }
  }

  async isSameUser(firstJid, secondJid) {
    if (!firstJid || !secondJid) return false;
    if (String(firstJid) === String(secondJid)) return true;
    if (this.hasSameJidAlias(firstJid, secondJid)) return true;
    try {
      const [firstUser, secondUser] = await Promise.all([
        this.getUserById(firstJid),
        this.getUserById(secondJid)
      ]);
      return Boolean(firstUser?.registered && secondUser?.registered && firstUser.id === secondUser.id);
    } catch {
      return false;
    }
  }

  hasSameJidAlias(firstJid, secondJid) {
    const secondAliases = new Set(getJidAliases(this.sock, secondJid));
    return getJidAliases(this.sock, firstJid).some((alias) => secondAliases.has(alias));
  }

  async resolveMentionTarget() {
    const raw = extractRawTarget(this);
    if (!raw) return null;
    return resolveStoredTargetJid(this, raw);
  }

  async getImplicitRelationTargets() {
    return peekRelationTargets(this.sender, this.sock);
  }

  async getActiveTitle() {
    const user = await this.getUser();
    if (!user.activeTitle) return null;
    return getTitleById(user.activeTitle);
  }
}