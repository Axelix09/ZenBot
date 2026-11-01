import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import pino from 'pino';
import { createLauncher, clientProfiles } from 'zyrix';
import { setupSocket } from '../runtime/socket-setup.js';
import { registerSubBot, unregisterSubBot } from '../runtime/subbot-registry.js';
import { ZenConfig } from '../../zen.config.js';

const BASE_DIR = path.resolve('ZenSessions', 'subbots');
const PAIRING_TIMEOUT_MS = 150000;
const START_GAP_MS = 2000;
const RESTART_DELAY_MS = 30000;
const MAX_RESTARTS = 3;
const MIN_FREE_MEMORY_MB = 250;
const DEAD_REASONS = new Set(['loggedOut', 'badSession', 'forbidden', 'multideviceMismatch', 'invalid-phone', 'auth-error']);
const NO_RESTART_REASONS = new Set(['connectionReplaced', 'too-many-relaunches']);

const entries = new Map();
const restarts = new Map();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

fs.mkdirSync(BASE_DIR, { recursive: true });

export const digits = (value) => String(value || '').split('@')[0].split(':')[0].replace(/\D/g, '');
export const requesterNumber = (ctx) => (ctx.sender?.endsWith('@s.whatsapp.net') ? digits(ctx.sender) : '');
export const isMainOwner = (number) => ZenConfig.ownerNumbers.some((owner) => digits(owner) === number);
export const getLimit = () => Math.max(1, parseInt(ZenConfig.subbotLimit, 10) || 15);
export const mainNumber = () => digits(ZenConfig.botPhoneNumber);

const sessionDir = (numero) => path.join(BASE_DIR, numero);
const pausedFile = (numero) => path.join(sessionDir(numero), '.paused');
const removeDir = (numero) => fs.rmSync(sessionDir(numero), { recursive: true, force: true });

const readCreds = (numero) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(sessionDir(numero), 'state.json'), 'utf8')).creds || null;
  } catch {
    return null;
  }
};

export const hasSession = (numero) => Boolean(readCreds(numero)?.registered);
export const isPaused = (numero) => fs.existsSync(pausedFile(numero));
export const isRunning = (numero) => entries.has(numero);
export const listRunning = () => [...entries.keys()];
export const countRunning = () => entries.size;

const hasEnoughMemory = () => (os.freemem() / (1024 * 1024)) >= MIN_FREE_MEMORY_MB;

const notify = (entry, name, ...args) => {
  Promise.resolve()
    .then(() => entry.hooks[name]?.(...args))
    .catch(() => {});
};

const clearPairingTimer = (entry) => {
  if (entry.timer) clearTimeout(entry.timer);
  entry.timer = null;
};

const sendWelcome = async (entry) => {
  try {
    await entry.sock.sendMessage(`${entry.numero}@s.whatsapp.net`, {
      text: `『 ✅ 』 *SUB-BOT ACTIVO*\n\n> ¡Tu sesión se inició bien! 🥳\n> Tu número ahora funciona como *${ZenConfig.botName}* 😎\n> Usá *${ZenConfig.prefix}menu* para ver los comandos 😉`
    });
  } catch {}
};

const expire = async (entry) => {
  if (entries.get(entry.numero) !== entry || !entry.fresh) return;
  entries.delete(entry.numero);
  unregisterSubBot(entry.numero);
  await entry.launcher.stop().catch(() => {});
  removeDir(entry.numero);
  notify(entry, 'onExpire');
};

const handleOpen = (entry) => {
  clearPairingTimer(entry);
  restarts.delete(entry.numero);
  if (entry.fresh) {
    entry.fresh = false;
    console.log(`[subbots] Vinculado +${entry.numero} 😎`);
    sendWelcome(entry);
  }
  if (!entry.announced) {
    entry.announced = true;
    notify(entry, 'onOpen');
  }
};

const handleFatal = (entry, { reason }) => {
  clearPairingTimer(entry);
  if (entries.get(entry.numero) === entry) entries.delete(entry.numero);
  unregisterSubBot(entry.numero);

  if (DEAD_REASONS.has(reason) || !hasSession(entry.numero)) {
    removeDir(entry.numero);
    console.warn(`[subbots] Sesión eliminada +${entry.numero} (${reason})`);
    notify(entry, 'onClosed', reason);
    return;
  }

  if (NO_RESTART_REASONS.has(reason) || isPaused(entry.numero)) return;

  const tries = (restarts.get(entry.numero) || 0) + 1;
  if (tries > MAX_RESTARTS) return;
  restarts.set(entry.numero, tries);

  const timer = setTimeout(() => {
    if (!entries.has(entry.numero) && hasSession(entry.numero) && !isPaused(entry.numero) && hasEnoughMemory()) {
      startSubBot(entry.numero);
    }
  }, RESTART_DELAY_MS);
  timer.unref?.();
};

export const startSubBot = (numero, hooks = {}) => {
  if (entries.has(numero)) return entries.get(numero);

  if (entries.size >= getLimit()) {
    console.warn(`[subbots] Límite de ${getLimit()} alcanzado. Rechazando +${numero}`);
    return null;
  }

  if (!hasEnoughMemory()) {
    console.warn(`[subbots] Memoria RAM insuficiente para iniciar +${numero}`);
    return null;
  }

  fs.mkdirSync(sessionDir(numero), { recursive: true });
  fs.rmSync(pausedFile(numero), { force: true });

  const entry = { numero, hooks, launcher: null, sock: null, timer: null, fresh: !hasSession(numero), announced: false };

  entry.launcher = createLauncher({
    session: sessionDir(numero),
    phoneNumber: numero,
    signals: false,
    exit: false,
    printCode: false,
    autoReset: false,
    logger: pino({ level: 'silent' }),
    browser: clientProfiles.ubuntu('Chrome'),
    syncFullHistory: false,
    markOnlineOnConnect: false,
    queryTimeoutMs: 20000,
    setup: (sock) => {
      sock.isSubBot = true;
      sock.subbotNumber = numero;
      entry.sock = sock;
      return setupSocket(sock, { allowFromMe: true });
    },
    on: {
      'pairing-code': (code, formatted) => {
        if (!entry.timer) entry.timer = setTimeout(() => void expire(entry), PAIRING_TIMEOUT_MS);
        notify(entry, 'onCode', formatted);
      },
      open: () => handleOpen(entry),
      fatal: (info) => handleFatal(entry, info),
      issue: ({ type, name, code, error }) => {
        if (process.env.DEBUG) console.warn(`[subbots:${numero}:${type}] ${name || code || error?.message || ''}`);
      }
    }
  });

  entries.set(numero, entry);
  registerSubBot(numero);
  entry.launcher.start().catch(() => {});
  return entry;
};

export const pauseSubBot = async (numero) => {
  const entry = entries.get(numero);
  entries.delete(numero);
  unregisterSubBot(numero);
  if (fs.existsSync(sessionDir(numero))) fs.writeFileSync(pausedFile(numero), 'true');
  if (!entry) return;
  clearPairingTimer(entry);
  await entry.launcher.stop().catch(() => {});
};

export const pauseAllSubBots = async () => {
  const numeros = [...entries.keys()];
  for (const numero of numeros) await pauseSubBot(numero);
  return numeros.length;
};

export const deleteSubBot = async (numero) => {
  const entry = entries.get(numero);
  entries.delete(numero);
  unregisterSubBot(numero);
  if (entry) {
    clearPairingTimer(entry);
    await entry.launcher.logout().catch(() => {});
  }
  removeDir(numero);
};

export const autoStartSubBots = async () => {
  const names = fs.readdirSync(BASE_DIR, { withFileTypes: true })
    .filter((item) => item.isDirectory() && /^\d{8,15}$/.test(item.name))
    .map((item) => item.name);

  for (const numero of names) {
    if (!hasSession(numero) && !isPaused(numero)) removeDir(numero);
  }

  const eligible = names.filter((numero) => hasSession(numero) && !isPaused(numero)).slice(0, getLimit());
  if (!eligible.length) return;

  console.log(`[subbots] Iniciando ${eligible.length} sub-bot(s)... 😌`);
  for (const numero of eligible) {
    if (!hasEnoughMemory()) {
      console.warn('[subbots] Abortando inicio de subbots restantes por falta de memoria RAM.');
      break;
    }
    startSubBot(numero);
    await sleep(START_GAP_MS);
  }
};