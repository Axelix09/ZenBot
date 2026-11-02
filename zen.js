import 'dotenv/config';
import { cleanOrphanTmp } from './lib/runtime/tmpdir.js';
import pino from 'pino';
import { start, clientProfiles, promptPhone } from 'zyrix';
import { box, colors } from './lib/runtime/console-ui.js';
import { printBanner } from './lib/runtime/banner.js';
import { setupSocket } from './lib/runtime/socket-setup.js';
import { autoStartSubBots } from './lib/services/subbots.js';
import { connectDB } from './lib/database/db.js';
import { clearCatalogImageCache } from './lib/messaging/catalog.js';
import { Soul } from './soul.js';
import { ZenConfig } from './zen.config.js';

const { reset, magenta, cyan } = colors;

const SESSION_DIR = 'ZenSessions/main';
const MAINTENANCE_INTERVAL_MS = 300000;

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason?.stack || reason);
});

process.on('uncaughtException', (error) => {
  console.error('[uncaughtException]', error?.stack || error);
});

const startMaintenance = () => {
  const timer = setInterval(() => {
    try {
      clearCatalogImageCache();
      if (global.gc) global.gc();
    } catch (error) {
      console.error('[maintenance] Error en limpieza:', error);
    }
  }, MAINTENANCE_INTERVAL_MS);
  timer.unref?.();
};

const resolvePhone = async () => {
  const configured = String(ZenConfig.botPhoneNumber || '').replace(/\D/g, '');

  if (configured) {
    box('VINCULACIÓN AUTOMÁTICA', ['Usando el número configurado 😎', `${cyan}${configured}${reset}`]);
    return configured;
  }

  box('VINCULACIÓN POR CÓDIGO', [
    'Para generar tu código de emparejamiento,',
    'ingresá tu número con código de país 😊',
    '',
    `Ejemplo: ${magenta}5491122334455${reset}`
  ]);

  return promptPhone(`  ${magenta}✦${cyan} NÚMERO ${reset}─── `, { invalid: 'Ese número no vale 🤨 Probá de nuevo.' });
};

let announced = false;

const launcherEvents = {
  'pairing-code': (code, formatted) => {
    box('CÓDIGO DE EMPAREJAMIENTO', ['', `${' '.repeat(14)}${cyan}${formatted}${reset}`, '', 'Válido por 2 minutos, ¡apurate! 😅']);
  },

  open: () => {
    if (announced) {
      console.log('[SESION] Conexión restablecida 😌');
      return;
    }
    announced = true;
    console.clear();
    box('CONEXIÓN EXITOSA', [`${cyan}${ZenConfig.botName}${reset} ya quedó enlazado de forma`, 'segura con los servidores de WhatsApp 😎']);
    autoStartSubBots().catch((error) => console.error('[subbots] Error al iniciar:', error));
  },

  status: ({ state, reason, name, why }) => {
    if (state === 'reconnecting') console.log(`[SESION] Reconectando (${name ?? reason ?? 'sin motivo'})... 😅`);
    if (state === 'relaunching') box('REINICIANDO VINCULACIÓN', [`Motivo: ${why}`, 'La sesión local se reinicia sola, tranqui 😌']);
  },

  issue: ({ type, count, name, code, error }) => {
    if (type === 'sender-key-miss') return console.warn(`[zyrix] ${count} mensajes de grupo sin sender key en 10s`);
    const detail = name || code || error?.message || '';
    if (/sender key id distinto|mensaje duplicado o viejo|Key used already or never filled/i.test(detail)) return;
    console.warn(`[zyrix:${type}] ${detail}`);
  },

  fatal: ({ reason, error }) => {
    box('CONEXIÓN NO RECUPERABLE', [`Motivo: ${reason}`, error?.message || 'Revisá la sesión y volvé a iniciar 😢']);
    process.exit(1);
  }
};

async function main() {
  cleanOrphanTmp();
  await printBanner();
  await connectDB();
  await Soul.loadCommands();
  startMaintenance();

  await start({
    session: SESSION_DIR,
    phoneNumber: resolvePhone,
    signals: true,
    setup: setupSocket,
    on: launcherEvents,
    logger: pino({ level: 'silent' }),
    browser: clientProfiles.ubuntu('Chrome'),
    syncFullHistory: false,
    markOnlineOnConnect: false,
    queryTimeoutMs: 20000
  });
}

main().catch((error) => {
  console.error('[zen] Error fatal:', error?.stack || error);
  process.exit(1);
});
