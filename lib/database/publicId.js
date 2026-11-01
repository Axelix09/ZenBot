import { createHash } from 'node:crypto';

export function makePublicUserId(identity = '') {
  const source = String(identity || 'anonymous').trim().toLowerCase();
  const digest = createHash('sha256').update(source).digest('hex').slice(0, 8).toUpperCase();
  return `Z-${digest}`;
}

export function isPublicUserId(value = '') {
  return /^Z-[A-F0-9]{8}$/i.test(String(value).trim());
}

export function normalizePublicUserId(value = '') {
  return String(value).trim().toUpperCase();
}
