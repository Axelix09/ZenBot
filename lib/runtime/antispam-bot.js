const spamTracker = new Map();
export const SPAM_LIMIT = 10;
const SPAM_WARN_AT = 7;
const SPAM_WINDOW = 60000;
const MUTE_DURATION = 300000;
const CLEANUP_INTERVAL = 120000;

setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of spamTracker.entries()) {
    if (!data.muted && now - data.firstHit > SPAM_WINDOW) {
      spamTracker.delete(userId);
    } else if (data.muted && now >= data.muteUntil) {
      spamTracker.delete(userId);
    }
  }
}, CLEANUP_INTERVAL).unref?.();

export function checkSpam(userId) {
  const now = Date.now();
  const data = spamTracker.get(userId);

  if (!data) {
    spamTracker.set(userId, { count: 1, firstHit: now, muted: false, muteUntil: 0, warned: false });
    return { allowed: true, count: 1, muted: false, warn: false };
  }

  if (data.muted && now < data.muteUntil) {
    return { allowed: false, count: data.count, muted: true, remaining: Math.ceil((data.muteUntil - now) / 1000) };
  }

  if (data.muted && now >= data.muteUntil) {
    data.muted = false;
    data.count = 0;
    data.firstHit = now;
    data.warned = false;
  }

  if (now - data.firstHit > SPAM_WINDOW) {
    data.count = 1;
    data.firstHit = now;
    data.warned = false;
  } else {
    data.count++;
  }

  if (data.count > SPAM_LIMIT) {
    data.muted = true;
    data.muteUntil = now + MUTE_DURATION;
    spamTracker.set(userId, data);
    return { allowed: false, count: data.count, muted: true, remaining: Math.ceil(MUTE_DURATION / 1000) };
  }

  if (data.count >= SPAM_WARN_AT && !data.warned) {
    data.warned = true;
    spamTracker.set(userId, data);
    return { allowed: true, count: data.count, muted: false, warn: true };
  }

  spamTracker.set(userId, data);
  return { allowed: true, count: data.count, muted: false, warn: false };
}