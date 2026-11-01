import { ZenCommand } from '../../lib/core/factory.js';
import { UserModel } from '../../lib/database/adapter.js';
import { ZenConfig } from '../../zen.config.js';
import sharp from 'sharp';
import { renderHtmlCard, cardAsset } from '../../lib/cards/htmlCard.js';

const GENEROS = { H: 'Hombre', M: 'Mujer', O: 'Otro' };
const GENDER_LABEL = { H: '♂ Hombre', M: '♀ Mujer', O: '⚧ Otro' };

const REWARD_ZENCOINS = 1500;
const REWARD_KOGEN = 5;

const exactMatches = ['pene', 'ano', 'orto', 'culo', 'teta', 'paja', 'hdp', 'puto', 'puta', 'perra', 'porno', 'sexo'];
const partialMatches = [
  'pendejo', 'pendeja', 'zorra', 'mamon', 'mamona', 'cabron', 'cabrona',
  'estupido', 'estupida', 'maricon', 'bastardo', 'imbecil', 'idiota',
  'forro', 'forra', 'tarado', 'tarada', 'boludo', 'boluda', 'pelotudo',
  'pelotuda', 'hijodeputa', 'hijo de puta', 'culiado', 'culiada',
  'vagina', 'verga', 'pija', 'poronga', 'pingo', 'chota', 'choto',
  'semen', 'esperma', 'pajero', 'pajera', 'chupala', 'chupapijas',
  'chupavergas', 'chupamelapija', 'mamalo', 'mamar', 'pedofilo', 'violador'
];

function escapeXml(unsafe) {
  return String(unsafe || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

function generateRegisterCard(name, age, genderLabel, isFirstTime) {
  const safeName = escapeXml(name.slice(0, 20));
  const safeGender = escapeXml(genderLabel);
  const rewardText = isFirstTime ? `+${REWARD_ZENCOINS} ${ZenConfig.currencies.zencoins.name.toUpperCase()}  |  +${REWARD_KOGEN} ${ZenConfig.currencies.kogen.name.toUpperCase()}` : 'REINGRESO AL SISTEMA';

  const svg = `
    <svg width="860" height="400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#090d16" />
          <stop offset="100%" stop-color="#0e1726" />
        </linearGradient>
        <linearGradient id="accentLine" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#8b5cf6" />
          <stop offset="50%" stop-color="#06b6d4" />
          <stop offset="100%" stop-color="#3b82f6" />
        </linearGradient>
      </defs>

      <rect width="860" height="400" rx="26" fill="url(#cardBg)"/>
      <rect x="3" y="3" width="854" height="394" rx="23" fill="none" stroke="#1e293b" stroke-width="2"/>
      <rect x="40" y="30" width="780" height="4" rx="2" fill="url(#accentLine)"/>

      <rect x="40" y="55" width="130" height="26" rx="13" fill="#1e1b4b" stroke="#8b5cf6" stroke-width="1"/>
      <text x="105" y="72" font-family="DejaVu Sans, Arial, sans-serif" font-size="11" font-weight="bold" fill="#c084fc" text-anchor="middle">NUEVO USUARIO</text>

      <text x="40" y="125" font-family="DejaVu Sans, Arial, sans-serif" font-size="34" font-weight="bold" fill="#f8fafc">${safeName}</text>
      <text x="40" y="152" font-family="DejaVu Sans, Arial, sans-serif" font-size="14" fill="#64748b">Registro completado en la red oficial de ${ZenConfig.botName}</text>

      <rect x="40" y="185" width="240" height="85" rx="16" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
      <text x="65" y="218" font-family="DejaVu Sans, Arial, sans-serif" font-size="12" font-weight="bold" fill="#64748b">EDAD REGISTRADA</text>
      <text x="65" y="250" font-family="DejaVu Sans, Arial, sans-serif" font-size="22" font-weight="bold" fill="#f8fafc">${age} ANIOS</text>

      <rect x="310" y="185" width="240" height="85" rx="16" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
      <text x="335" y="218" font-family="DejaVu Sans, Arial, sans-serif" font-size="12" font-weight="bold" fill="#64748b">GENERO</text>
      <text x="335" y="250" font-family="DejaVu Sans, Arial, sans-serif" font-size="22" font-weight="bold" fill="#38bdf8">${safeGender.toUpperCase()}</text>

      <rect x="580" y="185" width="240" height="85" rx="16" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
      <text x="605" y="218" font-family="DejaVu Sans, Arial, sans-serif" font-size="12" font-weight="bold" fill="#64748b">RANGO ASIGNADO</text>
      <text x="605" y="250" font-family="DejaVu Sans, Arial, sans-serif" font-size="20" font-weight="bold" fill="#a855f7">INICIADO V</text>

      <rect x="40" y="295" width="780" height="65" rx="16" fill="#111827" stroke="#374151" stroke-width="1.5"/>
      <text x="65" y="325" font-family="DejaVu Sans, Arial, sans-serif" font-size="11" font-weight="bold" fill="#9ca3af">BONIFICACION DE ENTRADA</text>
      <text x="65" y="347" font-family="DejaVu Sans, Arial, sans-serif" font-size="16" font-weight="bold" fill="#fbbf24">${rewardText}</text>
    </svg>
  `;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

const sanitizeInput = (text) => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[\\/*?:"<>|`~]/g, '')
    .trim();
};

const containsInsult = (text) => {
  const cleanText = (text || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const words = cleanText.split(/[\s_\-\d]+/);

  const hasExact = words.some(word => exactMatches.includes(word));
  if (hasExact) return true;

  const hasPartial = partialMatches.some(insulto => cleanText.includes(insulto));
  if (hasPartial) return true;

  return false;
};

const GUIDE_WORDS = new Set(['ayuda', 'help', 'como', 'cómo', 'formato']);

const normalizeGender = (value = '') => {
  const normalized = String(value).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return ({
    h: 'H', hombre: 'H', masculino: 'H',
    m: 'M', mujer: 'M', femenino: 'M',
    o: 'O', otro: 'O', 'no binario': 'O', nobinario: 'O'
  })[normalized] || null;
};

export function parseRegistrationInput(args = []) {
  const input = Array.isArray(args) ? args.join(' ').trim() : String(args || '').trim();
  if (!input) return null;

  let parts;
  if (input.includes(',')) {
    parts = input.split(',').map((part) => part.trim()).filter(Boolean);
  } else if (input.includes('.')) {
    parts = input.split('.').map((part) => part.trim()).filter(Boolean);
  } else {
    const match = input.match(/^(.+?)\s+(\d{1,2})\s+(.+)$/u);
    parts = match ? [match[1].trim(), match[2], match[3].trim()] : [];
  }

  if (parts.length !== 3) return null;
  const [name, ageRaw, genderRaw] = parts;
  const age = Number(ageRaw);
  const gender = normalizeGender(genderRaw);
  if (!name || !Number.isInteger(age) || !gender) return null;
  return { name, age, gender };
}

const registrationGuide = (prefix, reason = '') => [
  `『 🤖 』 *ASISTENTE DE REGISTRO DE ZENBOT*`,
  ``,
  reason ? `⚠️ ${reason}\n` : '',
  `Para crear tu cuenta envía tus datos en uno de estos formatos:`,
  ``,
  `1. *${prefix}registro Nombre, Edad, Género*`,
  `2. *${prefix}registro Nombre.Edad.Género*`,
  `3. *${prefix}registro Nombre Edad Género*`,
  ``,
  `*Ejemplos:*`,
  `• ${prefix}registro Axel, 21, H`,
  `• ${prefix}registro Axel.21.H`,
  `• ${prefix}registro Axel 21 H`,
  ``,
  `*Género:* H = Hombre · M = Mujer · O = Otro`,
  `También puedes escribir Hombre, Mujer u Otro.`,
  `*La edad debe estar entre 8 y 99 años.*`
].filter(Boolean).join('\n');

export default new ZenCommand('registro')
  .addAlias('register', 'reg')
  .setCooldown(5)
  .setCategory('registro')
  .setUsage('<nombre, edad, género> | <nombre.edad.género> | <nombre edad género>')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const [subcmd] = ctx.args;

    if (!subcmd || GUIDE_WORDS.has(subcmd.toLowerCase())) {
      await ctx.react(user.registered ? '👤' : '📜');
      if (user.registered) {
        return ctx.reply(
          `『 ✨ 』 *CUENTA YA ACTIVA*\n\n` +
          `> Ya estás registrado/a como *${user.name}* 😅\n` +
          `> Tu ID público es: *${user.userId}*\n` +
          `> Usá *${ZenConfig.prefix}perfil* para ver tus estadísticas.`
        );
      }
      return ctx.reply(registrationGuide(ZenConfig.prefix));
    }

    const sub = subcmd.toLowerCase();

    if (sub === 'borrar') {
      if (!user.registered) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *SIN REGISTRO*\n\n> No tenés ninguna cuenta activa en este momento 🫤`);
      }
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *¿ELIMINAR CUENTA DE ${user.name.toUpperCase()}?*\n\n` +
        `> *Se perderán todos los datos irreversiblemente:* 🙂\n` +
        `  • Nivel actual: ${user.level}\n` +
        `  • Rango: ${user.role}\n` +
        `  • Monedas: ${ZenConfig.currencies.zencoins.emoji} ${user.zencoins} | ${ZenConfig.currencies.kogen.emoji} ${user.kogen}\n` +
        `  • Matrimonios y títulos desbloqueados\n\n` +
        `> _Escribe *${ZenConfig.prefix}${ctx.commandName} confirmar* para proceder._`
      );
    }

    if (sub === 'confirmar') {
      if (!user.registered) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *SIN REGISTRO*\n\n> No tenés ninguna cuenta activa para borrar 🫤`);
      }

      user.registered = false;
      user.hadRegistered = true;
      user.name = 'Sin Nombre';
      user.zencoins = 0;
      user.kogen = 0;
      user.xp = 0;
      user.level = 1;
      user.role = '🌱 Iniciado V';
      user.marriedWith = null;
      user.marriedSince = null;
      user.titles = [];
      user.activeTitle = null;

      await user.save();
      await ctx.react('✨');
      return ctx.reply(`『 ✨ 』 *CUENTA ELIMINADA*\n\n> Tu perfil fue reseteado desde cero 😉`);
    }

    if (user.registered) {
      await ctx.react('👤');
      return ctx.reply(
        `『 ✨ 』 *CUENTA YA ACTIVA*\n\n` +
        `> Ya te encuentras registrado/a como *${user.name}* 😅\n` +
        `> Tu ID público es: *${user.userId}*`
      );
    }

    const parsed = parseRegistrationInput(ctx.args);
    if (!parsed) {
      await ctx.react('⚠️');
      return ctx.reply(registrationGuide(ZenConfig.prefix, 'No pude interpretar tus datos.'));
    }

    const name = sanitizeInput(parsed.name);
    const age = parsed.age;

    if (!name || name.length < 2 || name.length > 30) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *NOMBRE INVÁLIDO*\n\n> Debe contener entre 2 y 30 letras 🤔`);
    }

    if (containsInsult(name)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *CONTENIDO NO PERMITIDO*\n\n> El nombre contiene términos no permitidos 🫢`);
    }

    const nameExists = await UserModel.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') }, registered: true, id: { $ne: user.id } });

    if (nameExists) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *NOMBRE EN USO*\n\n> Ya existe un usuario registrado con ese nombre 🙂`);
    }

    if (!Number.isInteger(age) || age < 8 || age > 99) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *EDAD INVÁLIDA*\n\n> Ingresá una edad válida entre 8 y 99 😵‍💫`);
    }

    const genderKey = parsed.gender;
    if (!GENEROS[genderKey]) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *GÉNERO INVÁLIDO*\n\n> Revisá cómo lo escribiste 🧐\n\n> Revisá cómo lo escribiste 🧐\n> Usá: *H* (Hombre), *M* (Mujer) u *O* (Otro).`);
    }

    const isPrimera = !user.hadRegistered;

    user.name = name;
    user.age = age;
    user.gender = genderKey;
    user.registered = true;
    user.hadRegistered = true;
    user.xp = 0;
    user.level = 1;
    user.role = '🌱 Iniciado V';

    if (isPrimera) {
      user.zencoins = (user.zencoins || 0) + REWARD_ZENCOINS;
      user.kogen = (user.kogen || 0) + REWARD_KOGEN;
      if (!user.inventory) user.inventory = {};
      user.inventory.bait_lombriz = (user.inventory.bait_lombriz || 0) + 5;
      user.inventory.bait_senuelo = (user.inventory.bait_senuelo || 0) + 2;
    }

    await user.save();
    await ctx.react('✨');

    const caption = [
      `『 ✨ 』 *¡REGISTRO COMPLETADO!*`,
      ``,
      `✦ *INFORMACIÓN PERSONAL*`,
      `  • ID      : ${user.userId}`,
      `  • Nombre : ${name}`,
      `  • Edad   : ${age} años`,
      `  • Género : ${GENDER_LABEL[genderKey]}`,
      `  • Rango  : 🌱 Iniciado V (Nivel 1)`,
      ``,
      `✦ *BENEFICIOS ENTREGADOS*`,
      isPrimera
        ? `  • +${REWARD_ZENCOINS} ${ZenConfig.currencies.zencoins.name} ${ZenConfig.currencies.zencoins.emoji}\n  • +${REWARD_KOGEN} ${ZenConfig.currencies.kogen.name} ${ZenConfig.currencies.kogen.emoji}\n  • Kit de Pesca: 5 Lombrices 🪱 + 2 Señuelos 🐠`
        : `  • Cuenta reincorporada al sistema (sin bonus de inicio).`,
      ``,
      `💡 _Escribe *${ZenConfig.prefix}menu* para ver la lista de comandos disponibles._`
    ].join('\n');

    try {
      const cardBuffer = await renderHtmlCard({
        eyebrow: `${ZenConfig.botName.toUpperCase()} · REGISTRO`,
        title: `Bienvenido, ${name}`,
        subtitle: `Tu cuenta está activa · ID público ${user.userId}`,
        accent: '#8b5cf6',
        accent2: '#22d3ee',
        art: cardAsset('rpg-hunter.png'),
        stats: [
          { label: 'Edad', value: `${age} años`, note: 'dato registrado' },
          { label: 'Género', value: GENDER_LABEL[genderKey], note: 'perfil' },
          { label: 'Rango', value: 'Iniciado V', note: 'nivel 1' }
        ],
        rows: [
          { label: 'ID público', value: user.userId },
          { label: 'Bonificación', value: isPrimera ? `+${REWARD_ZENCOINS} ZC` : 'Reingreso' }
        ],
        caption: `Usa ${ZenConfig.prefix}menu para comenzar`
      });
      return ctx.sock.sendMessage(ctx.chat, {
        image: cardBuffer,
        caption
      }, { quoted: ctx.rawMsg });
    } catch (error) {
      console.error('[registro] Falló la tarjeta HTML o su envío; intentando el PNG de respaldo:', error?.stack || error);
      try {
        const fallbackBuffer = await generateRegisterCard(name, age, GENDER_LABEL[genderKey], isPrimera);
        return await ctx.sock.sendMessage(ctx.chat, {
          image: fallbackBuffer,
          caption
        }, { quoted: ctx.rawMsg });
      } catch (fallbackError) {
        console.error('[registro] Falló también el envío PNG de respaldo:', fallbackError?.stack || fallbackError);
        return ctx.reply(caption);
      }
    }
  });
