const notificationSettings = new Map();

export function setGroupNotifications(groupId, enabled) {
  notificationSettings.set(groupId, enabled);
}

export function areNotificationsEnabled(groupId) {
  return notificationSettings.get(groupId) === true;
}

export function toggleGroupNotifications(groupId) {
  const current = areNotificationsEnabled(groupId);
  notificationSettings.set(groupId, !current);
  return !current;
}

export function getGroupNotificationsStatus(groupId) {
  return areNotificationsEnabled(groupId);
}

export async function sendAdminNotification(sock, groupId, admins, message, mentions = []) {
  if (!admins || admins.length === 0) return;
  const adminIds = admins.map(a => a.id);
  await sock.sendMessage(groupId, {
    text: message,
    mentions: adminIds
  });
}