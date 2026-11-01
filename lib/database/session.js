import mongoose from 'mongoose';

const GameSessionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  type: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, expires: 900 }
});

export const GameSession = mongoose.models.GameSession || mongoose.model('GameSession', GameSessionSchema);