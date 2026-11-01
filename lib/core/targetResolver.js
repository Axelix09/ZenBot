import { UserModel } from '../database/adapter.js';
import { isPublicUserId, normalizePublicUserId } from '../database/publicId.js';

export async function resolveTargetJid(ctx, rawJid) {
  if (isPublicUserId(rawJid)) {
    const user = await UserModel.findOne({ userId: normalizePublicUserId(rawJid), registered: true });
    return user?.id || null;
  }
  const raw = String(rawJid || '').trim();
  if (/^\d{8,}$/.test(raw)) {
    const resolved = ctx?.resolveTargetJid?.(raw);
    const mapped = resolved?.includes('@') ? resolved : `${raw}@s.whatsapp.net`;
    const mappedUser = await findRegisteredUser(ctx, mapped);
    if (mappedUser) return mappedUser.id;
    const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const numericJid = new RegExp(`^${escaped}(?::\\d+)?@(s\\.whatsapp\\.net|c\\.us|hosted|lid|hosted\\.lid)$`, 'i');
    const registered = await UserModel.findOne({ id: numericJid, registered: true });
    if (registered) return registered.id;
    const existing = await UserModel.findOne({ id: numericJid });
    if (existing) return existing.id;
    return mapped;
  }
  return ctx?.resolveTargetJid?.(rawJid) || rawJid || null;
}

export function extractRawTarget(ctx) {
  return ctx.mentions?.[0] || ctx.quotedParticipant || ctx.args?.find((arg) => isPublicUserId(arg)) || null;
}

export async function findRegisteredUser(ctx, jid) {
  if (!jid) return null;
  if (isPublicUserId(jid)) {
    try {
      return await UserModel.findOne({ userId: normalizePublicUserId(jid), registered: true });
    } catch (_) {
      return null;
    }
  }
  try {
    const user = await ctx?.getUserById?.(jid);
    return user?.registered ? user : null;
  } catch (_) {
    return null;
  }
}

export async function peekRelationTargets(senderJid, sock) {
  const targets = new Set();
  try {
    let data = null;
    const aliases = new Set([senderJid]);
    try {
      for (const alias of sock?.getJidAliases?.(senderJid) || []) aliases.add(alias);
      const resolved = sock?.resolveJid?.(senderJid);
      if (resolved) aliases.add(resolved);
    } catch (_) {}
    for (const alias of aliases) {
      data = await UserModel.findOne({ id: alias });
      if (data) break;
    }
    if (data) {
      if (data.marriedWith) targets.add(data.marriedWith);
      if (data.proposal?.from) targets.add(data.proposal.from);
    }
  } catch (_) {}

  return Array.from(targets);
}
