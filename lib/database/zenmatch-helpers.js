import axios from 'axios';
import { GENDERS, DEFAULT_AVATAR } from './zenmatch-data.js';
import { ZenConfig } from '../../zen.config.js';
import { UserModel } from './adapter.js';
import { makePublicUserId } from './publicId.js';

export async function containsJidIdentity(ctx, list = [], jid) {
  for (const value of list || []) {
    if (await ctx.isSameUser(value, jid)) return true;
  }
  return false;
}

export async function pushUniqueJid(ctx, list = [], jid) {
  if (!(await containsJidIdentity(ctx, list, jid))) list.push(jid);
  return list;
}

export async function removeJidIdentity(ctx, list = [], jid) {
  const keep = [];
  for (const value of list || []) {
    if (!(await ctx.isSameUser(value, jid))) keep.push(value);
  }
  return keep;
}

export function calculateCompatibility(tagsA = [], tagsB = [], hobbiesA = '', hobbiesB = '') {
  const sharedTags = tagsA.filter(t => tagsB.includes(t));
  let score = 40 + (sharedTags.length * 15);

  const hA = (hobbiesA || '').toLowerCase();
  const hB = (hobbiesB || '').toLowerCase();
  
  if (hA && hB) {
    const wordsA = hA.split(' ');
    const sharedWords = wordsA.filter(w => w.length > 3 && hB.includes(w));
    score += sharedWords.length * 10;
  }

  return Math.min(99, Math.max(35, score));
}

export function formatProgressBar(percentage) {
  const filled = Math.round((percentage / 100) * 10);
  const empty = 10 - filled;
  return `[${'💖'.repeat(filled)}${'🖤'.repeat(empty)}] ${percentage}%`;
}

export function getDefaultAgeRange(userAge) {
  const age = Number(userAge) || 20;
  let min = Math.max(18, age - 4);
  let max = Math.min(99, age + 5);

  if (age <= 22) {
    min = 18;
    max = 25;
  }

  return {
    min,
    max,
    minAge: min,
    maxAge: max
  };
}

export async function checkNsfwImage(imageUrl) {
  try {
    const { data } = await axios.get(`https://zone.api.br/api/nsfwcheck?url=${encodeURIComponent(imageUrl)}`, { timeout: 10000 });
    
    if (data && data.status && data.result) {
      const label = (data.result.labelName || '').toLowerCase();
      const confidence = data.result.confidence || 0;

      if (['porn', 'hentai', 'sexy'].includes(label) && confidence > 0.55) {
        return {
          safe: false,
          label: data.result.labelName,
          confidence: Math.round(confidence * 100)
        };
      }
    }
    return { safe: true };
  } catch {
    return { safe: true };
  }
}

export async function buscarSiguientePerfil(ctx, currentUser) {
  const prefix = ZenConfig.prefix;
  const zm = currentUser.zenmatch || {};
  const myJid = ctx.sender;
  const defaultAge = getDefaultAgeRange(zm.age);
  const filters = zm.filters || defaultAge;

  const minAgeLimit = filters.minAge || filters.min || defaultAge.min;
  const maxAgeLimit = filters.maxAge || filters.max || defaultAge.max;

  const passed = zm.passed || [];
  const likesSent = zm.likesSent || [];
  const matches = zm.matches || [];

  const excludedAliases = new Set();
  for (const jid of [myJid, currentUser.id, ...passed, ...likesSent, ...matches]) {
    excludedAliases.add(jid);
    try {
      for (const alias of ctx.sock.getJidAliases?.(jid) || []) excludedAliases.add(alias);
      const resolved = ctx.resolveTargetJid(jid);
      if (resolved) excludedAliases.add(resolved);
    } catch {}
  }

  const rawCandidates = await UserModel.find({
    'zenmatch.active': true,
    registered: true
  });

  const candidates = rawCandidates.filter(u => {
    const aliases = new Set([u.id]);
    try {
      for (const alias of ctx.sock.getJidAliases?.(u.id) || []) aliases.add(alias);
      const resolved = ctx.resolveTargetJid(u.id);
      if (resolved) aliases.add(resolved);
    } catch {}
    if ([...aliases].some((alias) => excludedAliases.has(alias))) return false;
    const czm = u.zenmatch || {};

    if ((czm.reportsCount || 0) >= 3) return false;

    if (czm.age < minAgeLimit || czm.age > maxAgeLimit) return false;

    if (zm.seeking !== 'BOTH') {
      if (zm.seeking === 'M' && czm.gender !== 'M') return false;
      if (zm.seeking === 'F' && czm.gender !== 'F') return false;
    }

    if (czm.seeking !== 'BOTH') {
      if (czm.seeking === 'M' && zm.gender !== 'M') return false;
      if (czm.seeking === 'F' && zm.gender !== 'F') return false;
    }

    if (filters.requiredTag) {
      const cTags = czm.tags || [];
      if (!cTags.includes(filters.requiredTag)) return false;
    }

    return true;
  });

  if (candidates.length === 0) {
    await ctx.react('🔍');
    return ctx.reply(
      `『 🔍 』 *SIN MÁS PERFILES*\n\n` +
      `> No hay candidatos disponibles en tu rango de edad (${minAgeLimit}-${maxAgeLimit} años).\n` +
      `> Puedes ampliar tu búsqueda con *${prefix}matchfiltro edad 18-35*.`
    );
  }

  const candidate = candidates[Math.floor(Math.random() * candidates.length)];
  const czm = candidate.zenmatch;

  const targetRef = candidate.userId || makePublicUserId(candidate.id);
  const candidateTags = (czm.tags || []).join(' ') || 'Sin etiquetas';

  const compatibility = calculateCompatibility(zm.tags, czm.tags, zm.hobbies, czm.hobbies);
  const compatBar = formatProgressBar(compatibility);

  const cardText =
    `『 ❤️ 』 *ZENMATCH — DESCUBRIR* ${czm.verified ? '✔️' : ''}\n\n` +
    `✦ *Nombre:* ${czm.name} (${czm.age} años)\n` +
    `✦ *Género:* ${GENDERS[czm.gender] || '—'}\n` +
    `✦ *Compatibilidad:* ${compatBar}\n` +
    `✦ *País:* ${czm.nationality || '—'}\n` +
    `✦ *Hobbies:* ${czm.hobbies || '—'}\n` +
    `✦ *Etiquetas:* ${candidateTags}\n\n` +
    `📖 _"${czm.bio || 'Sin biografía'}"_`;

  const buttons = [
    { type: 'quick_reply', text: '❤️ ME GUSTA', id: `${prefix}matchlike ${targetRef}` },
    { type: 'quick_reply', text: '⭐ SUPER LIKE (5 ✦)', id: `${prefix}matchsuper ${targetRef}` },
    { type: 'quick_reply', text: '⏭️ SIGUIENTE', id: `${prefix}matchskip ${targetRef}` }
  ];

  await ctx.react('🔥');
  return ctx.sock.sendButtons(ctx.chat, {
    text: cardText,
    footer: ZenConfig.botName,
    image: czm.photo || DEFAULT_AVATAR,
    buttons
  });
}