import { attachMessageDelivery } from 'zyrix';
import { createCallGuard } from './call-guard.js';
import { createMessageGate } from './message-gate.js';
import { createGroupEvents } from './group-events.js';

const PRESENCE_INTERVAL_MS = 30000;

export const setupSocket = (sock, options = {}) => {
  attachMessageDelivery(sock);

  const onCall = createCallGuard(sock);
  const onMessage = createMessageGate(sock, options);
  const groupEvents = createGroupEvents(sock);
  sock.on('call', onCall);
  sock.on('messages.upsert', onMessage);
  sock.on('group-participants.update', groupEvents.onParticipants);
  sock.on('groups.update', groupEvents.onUpdate);

  const presence = setInterval(() => {
    if (!sock.isOpen) return;
    Promise.resolve()
      .then(() => sock.sendPresenceUpdate('available'))
      .catch(() => {});
  }, PRESENCE_INTERVAL_MS);
  presence.unref?.();

  return () => {
    clearInterval(presence);
    sock.off('call', onCall);
    sock.off('messages.upsert', onMessage);
    sock.off('group-participants.update', groupEvents.onParticipants);
    sock.off('groups.update', groupEvents.onUpdate);
  };
};
