import fs from 'fs';
import { join } from 'path';

const GLOBAL_TMP = join(process.cwd(), 'tmp');
fs.mkdirSync(GLOBAL_TMP, { recursive: true });
process.env.TMPDIR = GLOBAL_TMP;
process.env.TEMP = GLOBAL_TMP;
process.env.TMP = GLOBAL_TMP;

export const ZenConfig = {
  prefix: '.',
  botName: 'ZenBot',
  ownerName: 'Axelix09',
  ownerInstagram: 'axelix09',
  ownerNumbers: String(process.env.OWNER_NUMBERS || '').split(',').map((number) => number.replace(/\D/g, '')).filter(Boolean),
  botPhoneNumber: String(process.env.BOT_PHONE_NUMBER || '').replace(/\D/g, ''),
  publicBotMode: true,
  newsletterJid: '120363403631501323@newsletter',
  newsletterName: 'Canal ZenBot ✦',
  channelUrl: 'https://whatsapp.com/channel/0029Vb6OR9O2v1IvoXO5oT2c',
  
  subbotLimit: 15,

  economy: {
    xpMin: 15,
    xpMax: 30
  },

  nsfwEnabled: true,
  devMode: true,

  currencies: {
    zencoins: { name: 'ZenCoins', emoji: '⌬' },
    kogen: { name: 'Kōgen', emoji: '✦' },
    lux: { name: 'Lux', emoji: '✵' }
  },

  emojis: {
    success: '✨',
    error: '⚠️',
    loading: '⏳',
    levelUp: '👑',
    lock: '🔒',
    group: '👥',
    private: '💬',
    admin: '🛡️',
    botAdmin: '🤖',
    nsfw: '🔞',
    register: '📜',
    welcome: '✨'
  }
};