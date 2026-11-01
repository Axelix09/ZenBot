import axios from 'axios';
import { ZenCommand } from '../../lib/core/factory.js';
import { Soul } from '../../soul.js';
import { ZenConfig } from '../../zen.config.js';
import { STREAK_ACTIVATION_DAYS } from '../../lib/database/userCore.js';
import { getEngineName } from '../../lib/database/db.js';
import { getMenuQuoted } from '../../lib/messaging/fakeQuoted.js';

const DEAD_TTL_MS = 10 * 60 * 1000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 8;
const FETCH_TIMEOUT_MS = 8000;
const MAX_BYTES = 8 * 1024 * 1024;
const BATCH_SIZE = 3;
const dead = new Map();
const cache = new Map();

const isImageBuffer = (buf) => {
  if (!buf || buf.length < 512) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return true;
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return true;
  return false;
};

const shuffle = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const readCache = (url) => {
  const hit = cache.get(url);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    cache.delete(url);
    return null;
  }
  return hit.buffer;
};

const writeCache = (url, buffer) => {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(url, { buffer, expires: Date.now() + CACHE_TTL_MS });
};

const isDead = (url) => {
  const until = dead.get(url);
  if (!until) return false;
  if (until < Date.now()) {
    dead.delete(url);
    return false;
  }
  return true;
};

async function loadImage(url) {
  const cached = readCache(url);
  if (cached) return { url, buffer: cached };
  try {
    const { data } = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: FETCH_TIMEOUT_MS,
      maxContentLength: MAX_BYTES,
      maxRedirects: 5
    });
    const buffer = Buffer.from(data);
    if (!isImageBuffer(buffer)) throw new Error('no es una imagen válida');
    writeCache(url, buffer);
    return { url, buffer };
  } catch (error) {
    dead.set(url, Date.now() + DEAD_TTL_MS);
    throw error;
  }
}

async function pickWorkingImage(urls = []) {
  const candidates = shuffle(urls.filter((url) => typeof url === 'string' && url));
  let pool = candidates.filter((url) => !isDead(url));
  if (!pool.length) {
    dead.clear();
    pool = candidates;
  }

  for (let i = 0; i < pool.length; i += BATCH_SIZE) {
    const batch = pool.slice(i, i + BATCH_SIZE);
    try {
      const winner = await Promise.any(batch.map(loadImage));
      return winner.buffer;
    } catch {}
  }
  return undefined;
}

const READ_MORE = String.fromCharCode(8206).repeat(4000);

const IMAGENES = [
  'https://i.ibb.co/ZzDLjShT/6-Pdo7j-Jq-fond-decran-Gojo-Sotaru-49.jpg',
  'https://i.ibb.co/gstbvMx/wp11845569.jpg',
  'https://i.ibb.co/TB83V4cy/thumbbig-1334857.jpg',
  'https://i.ibb.co/VWS1C2Jj/gojo-satoru-holding-his-face-iyrluirbzvncz77a.jpg',
  'https://i.ibb.co/whMxn3nF/Rty-Ri9-Rc-fond-decran-Gojo-Sotaru-63.jpg',
  'https://i.ibb.co/fdbrgzL0/15227.png',
  'https://i.ibb.co/k2SG88q1/8x-Ot-Gb6d-fond-decran-Gojo-Sotaru-10.jpg',
  'https://i.ibb.co/yBM2Wtpb/blue-pantone-gojo-satoru-h0033v4edcsam2oh.jpg',
  'https://i.ibb.co/mC7YVhFB/wp12768651.png',
  'https://i.ibb.co/Tqt5zJH4/i5r8-Yxs-X-fond-decran-Gojo-Sotaru-86.jpg',
  'https://i.ibb.co/7tBQ76xm/8atm-A40e-fond-decran-Gojo-Sotaru-61.jpg',
  'https://i.ibb.co/3H4LG6M/J89n-Ccx9-fond-decran-Gojo-Sotaru-60.jpg',
  'https://i.ibb.co/cKVSfbhm/9r0c-T9-TF-fond-decran-Gojo-Sotaru-36.jpg',
  'https://i.ibb.co/PvvRJ4Mz/RUAC325575-CQ7-ABKCXBSKR3-Q5-Q.jpg',
  'https://i.ibb.co/5D2Jb6G/170112-anime-gojo-satoru-satoru-gojo-jujutsu-kaisen-arte-animado-x750.jpg',
  'https://i.ibb.co/0pjjK2Bn/IMG-20260512-WA0010.jpg',
  'https://i.ibb.co/V052PRsB/IMG-20260512-WA0005.jpg',
  'https://i.ibb.co/v6KG7n4X/IMG-20260512-WA0001.jpg',
  'https://i.ibb.co/zhcv1W2Q/IMG-20260512-WA0004.jpg',
  'https://i.ibb.co/hFVLh9f1/IMG-20260512-WA0003.jpg'
];

const CATEGORIA_INFO = {
  rpg:          { nombre: '⚔️ RPG Y AVENTURA', emoji: '⚔️' },
  eco:          { nombre: '💰 ECONOMÍA', emoji: '💰' },
  granja:       { nombre: '🌾 GRANJA / CULTIVOS', emoji: '🌾' },
  juegos:       { nombre: '🎮 MINIJUEGOS', emoji: '🎮' },
  ia:           { nombre: '🤖 INTELIGENCIA ARTIFICIAL', emoji: '🤖' },
  tools:        { nombre: '🔧 HERRAMIENTAS', emoji: '🔧' },
  anime:        { nombre: '🎌 ANIME / OTAKU', emoji: '🎌' },
  imagenes:     { nombre: '🖼️ IMÁGENES', emoji: '🖼️' },
  descargas:    { nombre: '📥 DESCARGAS', emoji: '📥' },
  busquedas:    { nombre: '🔍 BÚSQUEDAS', emoji: '🔍' },
  convertidores:{ nombre: '🔄 CONVERTIDORES', emoji: '🔄' },
  social:       { nombre: '❤️ SOCIAL Y CITAS', emoji: '❤️' },
  group:        { nombre: '👥 GESTIÓN DE GRUPOS', emoji: '👥' },
  registro:     { nombre: '👤 REGISTRO', emoji: '👤' },
  info:         { nombre: 'ℹ️ INFORMACIÓN', emoji: 'ℹ️' },
  owner:        { nombre: '👑 OWNER / DUEÑO', emoji: '👑' },
  nsfw:         { nombre: '🔞 CONTENIDO +18', emoji: '🔞' },
  jadibot:      { nombre: '🤖 SUB-BOTS', emoji: '🤖' },
  otros:        { nombre: '📦 OTROS COMANDOS', emoji: '📦' }
};

const getGreetingText = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'BUENOS DÍAS';
  if (hour >= 12 && hour < 20) return 'BUENAS TARDES';
  return 'BUENAS NOCHES';
};

const formatUptime = () => {
  const seconds = process.uptime();
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  parts.push(`${h}h`);
  parts.push(`${m}m`);

  return parts.join(' ');
};

const normalizeCategory = (catName) => {
  const normalized = (catName || '').toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (CATEGORIA_INFO[normalized]) return normalized;

  const manualMap = {
    'general': 'info',
    'informacion': 'info',
    'info': 'info',
    'economia': 'eco',
    'eco': 'eco',
    'perfil': 'registro',
    'registro': 'registro',
    'social': 'social',
    'citas': 'social',
    'owner': 'owner',
    'dev': 'owner',
    'group': 'group',
    'grupos': 'group',
    'juegos': 'juegos',
    'games': 'juegos',
    'rpg': 'rpg',
    'aventura': 'rpg',
    'caza': 'rpg',
    'mineria': 'rpg',
    'pesca': 'rpg',
    'granja': 'granja',
    'descargas': 'descargas',
    'download': 'descargas',
    'tools': 'tools',
    'herramientas': 'tools',
    'ia': 'ia',
    'ai': 'ia',
    'anime': 'anime',
    'nsfw': 'nsfw'
  };

  return manualMap[normalized] || 'otros';
};

const formatCommandLine = (prefix, cmd) => {
  const usage = cmd.usage ? ` ${cmd.usage}` : '';
  return `${prefix}${cmd.name}${usage}`;
};

function getCategoriesMap(groupDb) {
  const categories = {};
  Soul.commands.forEach((cmd) => {
    if (cmd.hidden) return;

    const key = normalizeCategory(cmd.categoryName);
    if (groupDb?.disabledCategories?.includes(key)) return;
    if (groupDb?.disabledCmds?.includes(cmd.name)) return;

    if (!categories[key]) {
      categories[key] = [];
    }

    if (cmd.name === 'reaccion' && cmd.aliases?.length) {
      cmd.aliases.forEach(alias => {
        if (groupDb?.disabledCmds?.includes(alias)) return;
        categories[key].push({ name: alias, usage: cmd.usage });
      });
    } else {
      categories[key].push(cmd);
    }
  });
  return categories;
}

function getCategoryList() {
  const categories = getCategoriesMap(null);
  return Object.keys(categories).sort();
}

async function getFullMenuText(ctx) {
  const user = await ctx.getUser();
  const groupDb = await ctx.getGroup();
  const dbEngine = getEngineName();
  const categories = getCategoriesMap(groupDb);
  const totalCmds = Object.values(categories).reduce((acc, cmds) => acc + cmds.length, 0);
  const uptime = formatUptime();
  const senderNum = ctx.sender.split('@')[0].replace(/\D/g, '');
  const greetingText = getGreetingText();

  const nextLevelXP = (user.level || 1) * 150;
  const streak = user.streak || 0;

  const lines = [
    `˚₊‧꒰ @${senderNum} 🌱 ꒱ ‧₊˚`,
    `ᓚ₍⑅^..^₎ ${greetingText} ♡`,
    ``,
    `—͟͞͞ ✮❭❱ USUARIO`,
    `☾₊ ⊹ Nivel ${user.level || 1}`,
    `☾₊ ⊹ ${user.role || 'Iniciado V'}`,
    `☾₊ ⊹ ${user.xp || 0}/${nextLevelXP} XP`,
    `☾₊ ⊹ ${streak} días`,
    `❁˖⁺‧₊˚❁˚₊‧⁺˖˖⁺‧₊˚❁˚₊‧⁺˖˖⁺‧₊˚❁˚₊‧⁺˖❁`,
    `—͟͞͞ ✮❭❱ SISTEMA`,
    `☾₊ ⊹ ${totalCmds} Comandos`,
    `☾₊ ⊹ ${dbEngine}`,
    `☾₊ ⊹ ${uptime}`,
    `❁˖⁺‧₊˚❁˚₊‧⁺˖˖⁺‧₊˚❁˚₊‧⁺˖˖⁺‧₊˚❁˚₊‧⁺˖❁`
  ];

  return lines.join('\n');
}

async function getCompleteCommandsText(ctx) {
  const user = await ctx.getUser();
  const groupDb = await ctx.getGroup();
  const categories = getCategoriesMap(groupDb);
  const prefix = ZenConfig.prefix;

  const lines = [
    `·͙*̩̩͙˚̩̥̩̥*̩̩̥͙ 　 𝐙𝐄𝐍𝐁𝐎𝐓 • 𝐌𝐄𝐍Ú 𝐂𝐎𝐌𝐏𝐋𝐄𝐓𝐎 　 *̩̩̥͙˚̩̥̩̥*̩̩͙‧͙`,
    `> Lista general de comandos activos`,
    READ_MORE,
    ``
  ];

  const catKeys = Object.keys(categories).sort();
  catKeys.forEach((key) => {
    const info = CATEGORIA_INFO[key] || { nombre: key.toUpperCase(), emoji: '📦' };
    const cmdCount = categories[key].length;
    lines.push(`୨୧ ─── 『 ${info.nombre} 』 ─── ୨୧  [${cmdCount}]`);
    categories[key].forEach((cmd) => {
      lines.push(`  ⋆｡˚ \`${formatCommandLine(prefix, cmd)}\``);
    });
    lines.push(``);
  });

  lines.push(`*+:｡.｡ 　 ｡.｡:+*`);

  return lines.join('\n');
}

async function drawCategoryMenu(ctx, key) {
  const groupDb = await ctx.getGroup();
  if (groupDb?.disabledCategories?.includes(key)) return;

  const info = CATEGORIA_INFO[key] || { nombre: key.toUpperCase(), emoji: '📦' };
  await ctx.react(info.emoji);

  const categories = getCategoriesMap(groupDb);
  const cmds = categories[key];

  if (!cmds || !cmds.length) {
    return ctx.reply(`⚠️ Uy, no hay comandos registrados en *${info.nombre}* 🥲`);
  }

  const prefix = ZenConfig.prefix;
  const user = await ctx.getUser();
  const pushName = ctx.rawMsg.pushName || user.name || 'Usuario';
  const menuQuoted = getMenuQuoted(ctx.sender, pushName);

  const lines = [
    `*+:｡.｡ ˚ ༘♡ ·˚꒰ ${info.nombre} ꒱ ₊˚ˑ ｡.｡:+*`,
    ``,
    `₍ᐢ..ᐢ₎ Comandos en sección: *${cmds.length}*`,
    `˗ˏˋ ✦ ˎˊ˗ Prefijo asignado: \`[ ${prefix} ]\``,
    ``,
    `─━━━⊱ ❀ ⊰━━━─`,
    ``,
    `✦ *COMANDOS DISPONIBLES:*`,
    ``
  ];

  cmds.forEach((cmd) => {
    lines.push(`  ⋆｡˚ ☁︎ \`${formatCommandLine(prefix, cmd)}\``);
  });

  lines.push(``);
  lines.push(`─━━━⊱ ❀ ⊰━━━─`);
  lines.push(`_Presiona abajo para volver al menú principal._`);

  const randomImage = await pickWorkingImage(IMAGENES);
  const menuText = lines.join('\n');

  await ctx.sock.sendButtons(ctx.chat, {
    text: menuText,
    footer: ZenConfig.botName,
    image: randomImage,
    quoted: menuQuoted,
    buttons: [
      {
        type: 'quick_reply',
        text: 'Regresar al menú',
        id: `${prefix}menu`
      },
      {
        type: 'cta_url',
        text: 'Canal oficial',
        url: ZenConfig.channelUrl
      }
    ]
  });
}

async function sendMenuWithPicker(ctx) {
  const prefix = ZenConfig.prefix;
  const groupDb = await ctx.getGroup();
  const categories = getCategoriesMap(groupDb);
  const user = await ctx.getUser();
  const pushName = ctx.rawMsg.pushName || user.name || 'Usuario';
  const menuQuoted = getMenuQuoted(ctx.sender, pushName);
  const fullMenuText = await getFullMenuText(ctx);

  const categoryRows = Object.keys(categories)
    .filter((key) => categories[key].length > 0 && !groupDb?.disabledCategories?.includes(key))
    .map((key) => {
      const info = CATEGORIA_INFO[key] || { nombre: key.toUpperCase(), emoji: '📦' };
      const cmdCount = categories[key].length;
      return {
        id: `${prefix}menu ${key}`,
        title: info.nombre,
        description: `${cmdCount} comandos disponibles`
      };
    });

  const randomImage = await pickWorkingImage(IMAGENES);

  const buttons = [
    {
      type: 'single_select',
      title: 'Menú categorías',
      sections: [
        {
          title: 'Seleccionar categoría',
          rows: categoryRows
        }
      ]
    },
    {
      type: 'quick_reply',
      text: 'Abrir menú completo',
      id: `${prefix}menu all`
    },
    {
      type: 'cta_url',
      text: 'Canal oficial',
      url: ZenConfig.channelUrl
    }
  ];

  const messageParamsJson = JSON.stringify({
    bottom_sheet: {
      in_thread_buttons_limit: 0,
      list_title: 'Categorías',
      button_title: 'Abrir menú'
    }
  });
  await ctx.sock.sendButtons(ctx.chat, {
    text: fullMenuText,
    footer: ZenConfig.botName,
    image: randomImage,
    quoted: menuQuoted,
    buttons,
    messageParamsJson
  });
}

export default new ZenCommand('menu')
  .addAlias('help', 'comandos')
  .setCooldown(5)
  .setCategory('General')
  .onExecute(async (ctx) => {
    await ctx.react('✨');

    const [sub] = ctx.args;
    const key = sub?.toLowerCase();

    if (!key) {
      return sendMenuWithPicker(ctx);
    }

    if (key === 'all' || key === 'completo' || key === 'full') {
      const user = await ctx.getUser();
      const pushName = ctx.rawMsg.pushName || user.name || 'Usuario';
      const menuQuoted = getMenuQuoted(ctx.sender, pushName);
      const completeText = await getCompleteCommandsText(ctx);
      const randomImage = await pickWorkingImage(IMAGENES);

      return ctx.sock.sendButtons(ctx.chat, {
        text: completeText,
        footer: ZenConfig.botName,
        image: randomImage,
        quoted: menuQuoted,
        buttons: [
          {
            type: 'quick_reply',
            text: 'Regresar al menú',
            id: `${ZenConfig.prefix}menu`
          },
          {
            type: 'cta_url',
            text: 'Canal oficial',
            url: ZenConfig.channelUrl
          }
        ]
      });
    }

    const normalized = normalizeCategory(key);
    if (CATEGORIA_INFO[normalized]) {
      return drawCategoryMenu(ctx, normalized);
    }

    return sendMenuWithPicker(ctx);
  });
