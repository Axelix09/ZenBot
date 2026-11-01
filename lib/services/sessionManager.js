import { isMongoConnected } from '../database/adapter.js';
import { GameSession } from '../database/session.js';

const localMemorySessions = new Map();

export async function getGameSession(userId, type) {
  if (isMongoConnected()) {
    const session = await GameSession.findOne({ userId, type });
    return session ? session.data : null;
  }
  return localMemorySessions.get(`${type}_${userId}`) || null;
}

export async function saveGameSession(userId, type, sessionData) {
  if (isMongoConnected()) {
    await GameSession.updateOne(
      { userId, type },
      { $set: { data: sessionData, createdAt: new Date() } },
      { upsert: true }
    );
  } else {
    localMemorySessions.set(`${type}_${userId}`, sessionData);
  }
}

export async function deleteGameSession(userId, type) {
  if (isMongoConnected()) {
    await GameSession.deleteOne({ userId, type });
  } else {
    localMemorySessions.delete(`${type}_${userId}`);
  }
}