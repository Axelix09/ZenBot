import fs from 'node:fs';
import path from 'node:path';

const BASE_DIR = path.resolve('ZenSessions', 'subbots');

const cleanNumber = (value) => String(value || '').split('@')[0].split(':')[0].replace(/\D/g, '');
const anticallFile = (numero) => path.join(BASE_DIR, cleanNumber(numero), '.anticall');

export const isSubBotAnticallEnabled = (numero) => {
  const clean = cleanNumber(numero);
  return Boolean(clean) && fs.existsSync(anticallFile(clean));
};

export const setSubBotAnticall = (numero, enabled) => {
  const clean = cleanNumber(numero);
  if (!clean) return false;
  const file = anticallFile(clean);
  if (enabled) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'true');
  } else {
    fs.rmSync(file, { force: true });
  }
  return true;
};
