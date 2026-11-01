import { Soul } from '../../soul.js';
import { invalidateSubBotGroupPolicy } from './subbot-policy.js';

const MAX_EVENT_AGE_SECONDS = 120;

const isStale = (event) => {
  if (event.offline) return true;
  if (!event.timestamp) return false;
  return Math.floor(Date.now() / 1000) - Number(event.timestamp) > MAX_EVENT_AGE_SECONDS;
};

export const createGroupEvents = (sock) => {
  const onParticipants = (event) => {
    if (!event?.id || isStale(event)) return;
    invalidateSubBotGroupPolicy(sock, event.id);
    Soul.handleGroupEvent(sock, {
      kind: 'participants',
      chat: event.id,
      author: event.author,
      authorAlt: event.authorPn,
      action: event.action,
      participants: event.participantsInfo || (event.participants || []).map((id) => ({ id }))
    });
  };

  const onUpdate = (updates) => {
    for (const update of Array.isArray(updates) ? updates : [updates]) {
      if (!update?.id || isStale(update)) continue;
      invalidateSubBotGroupPolicy(sock, update.id);
      const { id, author, authorPn, ...changes } = update;
      Soul.handleGroupEvent(sock, { kind: 'update', chat: id, author, authorAlt: authorPn, ...changes });
    }
  };

  return { onParticipants, onUpdate };
};
