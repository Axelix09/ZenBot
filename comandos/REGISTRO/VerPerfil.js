import { ZenCommand } from '../../lib/core/factory.js';
import { STREAK_ACTIVATION_DAYS } from '../../lib/database/userCore.js';
import { WEAPONS } from '../../lib/game/weapons.js';
import { PICKAXES } from '../../lib/game/pickaxes.js';
import { resolveTargetJid, findRegisteredUser } from '../../lib/core/targetResolver.js';
import { ZenConfig } from '../../zen.config.js';
import { getTitleById } from '../../lib/game/titles.js';
import sharp from 'sharp';
import axios from 'axios';
import { renderHtmlCard, cardAsset } from '../../lib/cards/htmlCard.js';

const GENEROS = { H: 'Hombre', M: 'Mujer', O: 'Otro' };
const DEFAULT_AVATAR = 'https://i.ibb.co/5QDyqvj/file-000000004c14720e98c391afa72db307.png';

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

function formatNumber(num) {
  return Number(num || 0).toLocaleString('es-AR');
}

async function getCircularAvatar(url, size = 150) {
  let imgBuffer;
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 4000 });
    imgBuffer = Buffer.from(res.data);
  } catch {
    const res = await axios.get(DEFAULT_AVATAR, { responseType: 'arraybuffer', timeout: 4000 });
    imgBuffer = Buffer.from(res.data);
  }

  const circleMask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`
  );

  return sharp(imgBuffer)
    .resize(size, size, { fit: 'cover' })
    .composite([{ input: circleMask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

async function generateProfileImage(user, avatarUrl, partnerName, titleName) {
  const width = 920;
  const height = 510;

  const name = escapeXml((user.name || 'Sin Nombre').slice(0, 20));
  const role = escapeXml(user.role || 'Iniciado V');
  const level = user.level || 1;
  const xp = user.xp || 0;
  const nextXP = level * 150;
  const xpPercent = Math.min(100, Math.max(0, Math.round((xp / nextXP) * 100)));
  const barWidth = Math.max(14, Math.round((640 * xpPercent) / 100));

  const coins = formatNumber(user.zencoins);
  const kogen = formatNumber(user.kogen);
  const lux = formatNumber(user.lux);

  const titleBadge = titleName ? escapeXml(titleName) : 'SIN TITULO';
  const partnerBadge = partnerName ? escapeXml(partnerName.slice(0, 16).toUpperCase()) : 'SOLTERO/A';
  const streak = user.streak || 0;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="barGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#8b5cf6" />
          <stop offset="100%" stop-color="#06b6d4" />
        </linearGradient>
      </defs>

      <rect width="${width}" height="${height}" rx="26" fill="#0b0f19"/>
      <rect x="3" y="3" width="${width - 6}" height="${height - 6}" rx="23" fill="none" stroke="#1e293b" stroke-width="2"/>

      <circle cx="120" cy="130" r="82" fill="none" stroke="#8b5cf6" stroke-width="3"/>

      <text x="235" y="98" font-family="DejaVu Sans, Arial, sans-serif" font-size="34" font-weight="bold" fill="#f8fafc">${name}</text>
      
      <rect x="235" y="118" width="180" height="30" rx="15" fill="#1e1b4b" stroke="#8b5cf6" stroke-width="1.5"/>
      <text x="325" y="138" font-family="DejaVu Sans, Arial, sans-serif" font-size="12" font-weight="bold" fill="#c084fc" text-anchor="middle">${role.toUpperCase()}</text>

      <rect x="425" y="118" width="210" height="30" rx="15" fill="#082f49" stroke="#06b6d4" stroke-width="1.5"/>
      <text x="530" y="138" font-family="DejaVu Sans, Arial, sans-serif" font-size="12" font-weight="bold" fill="#38bdf8" text-anchor="middle">${titleBadge}</text>

      <text x="235" y="193" font-family="DejaVu Sans, Arial, sans-serif" font-size="15" font-weight="bold" fill="#94a3b8">NIVEL ${level}</text>
      <text x="875" y="193" font-family="DejaVu Sans, Arial, sans-serif" font-size="14" font-weight="bold" fill="#64748b" text-anchor="end">${xp} / ${nextXP} XP [${xpPercent}%]</text>

      <rect x="235" y="208" width="640" height="16" rx="8" fill="#1e293b"/>
      <rect x="235" y="208" width="${barWidth}" height="16" rx="8" fill="url(#barGrad)"/>

      <rect x="40" y="275" width="260" height="95" rx="16" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
      <text x="65" y="312" font-family="DejaVu Sans, Arial, sans-serif" font-size="12" font-weight="bold" fill="#64748b">${ZenConfig.currencies.zencoins.name.toUpperCase()}</text>
      <text x="65" y="348" font-family="DejaVu Sans, Arial, sans-serif" font-size="24" font-weight="bold" fill="#fbbf24">${coins}</text>

      <rect x="330" y="275" width="260" height="95" rx="16" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
      <text x="355" y="312" font-family="DejaVu Sans, Arial, sans-serif" font-size="12" font-weight="bold" fill="#64748b">${ZenConfig.currencies.kogen.name.toUpperCase()}</text>
      <text x="355" y="348" font-family="DejaVu Sans, Arial, sans-serif" font-size="24" font-weight="bold" fill="#a855f7">${kogen}</text>

      <rect x="620" y="275" width="260" height="95" rx="16" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
      <text x="645" y="312" font-family="DejaVu Sans, Arial, sans-serif" font-size="12" font-weight="bold" fill="#64748b">${ZenConfig.currencies.lux.name.toUpperCase()}</text>
      <text x="645" y="348" font-family="DejaVu Sans, Arial, sans-serif" font-size="24" font-weight="bold" fill="#38bdf8">${lux}</text>

      <rect x="40" y="395" width="405" height="75" rx="15" fill="#0f172a" stroke="#1e293b" stroke-width="1.5"/>
      <text x="65" y="425" font-family="DejaVu Sans, Arial, sans-serif" font-size="11" font-weight="bold" fill="#64748b">ESTADO DE PAREJA</text>
      <text x="65" y="450" font-family="DejaVu Sans, Arial, sans-serif" font-size="17" font-weight="bold" fill="#f43f5e">${partnerBadge}</text>

      <rect x="475" y="395" width="405" height="75" rx="15" fill="#0f172a" stroke="#1e293b" stroke-width="1.5"/>
      <text x="500" y="425" font-family="DejaVu Sans, Arial, sans-serif" font-size="11" font-weight="bold" fill="#64748b">RACHA DIARIA</text>
      <text x="500" y="450" font-family="DejaVu Sans, Arial, sans-serif" font-size="17" font-weight="bold" fill="#fb923c">${streak} DIAS ACTIVOS</text>
    </svg>
  `;

  const avatarBuf = await getCircularAvatar(avatarUrl, 150);

  return sharp(Buffer.from(svg))
    .composite([{ input: avatarBuf, top: 55, left: 45 }])
    .png()
    .toBuffer();
}

export default new ZenCommand('verperfil')
  .addAlias('perfil', 'profile', 'vp')
  .setCooldown(5)
  .setCategory('Perfil')
  .requireRegistration()
  .setUsage('[@usuario|Z-XXXXXXXX]')
  .onExecute(async (ctx) => {
    await ctx.react('👤');

    const mentioned = ctx.mentions?.[0];
    const rawTarget = mentioned || ctx.quotedParticipant || ctx.args?.find((arg) => /^Z-[A-F0-9]{8}$/i.test(arg)) || ctx.sender;
    const targetJid = await resolveTargetJid(ctx, rawTarget);

    let targetUser = null;
    if (!mentioned && !ctx.quotedParticipant && !ctx.args?.some((arg) => /^Z-[A-F0-9]{8}$/i.test(arg))) {
      targetUser = await ctx.getUser();
    } else {
      targetUser = await findRegisteredUser(ctx, targetJid);
      if (!targetUser) {
        targetUser = await ctx.getUserById(targetJid);
      }
    }

    const pushName = targetUser?.name || targetJid.split('@')[0];

    if (!targetUser || !targetUser.registered) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *USUARIO NO REGISTRADO*\n\n` +
        `> *${pushName}* no posee un registro activo en el bot 🤔\n` +
        `> Usá *${ZenConfig.prefix}registro Nombre, Edad, H/M/O* para unirte.`
      );
    }

    let pfpUrl = DEFAULT_AVATAR;
    try {
      pfpUrl = await ctx.sock.profile.pictureUrl(targetJid, 'image');
    } catch (_) {}

    const targetPartnerName = targetUser.marriedWith
      ? (await ctx.getUserById(targetUser.marriedWith))?.name
      : null;

    const activeTitle = targetUser.activeTitle ? getTitleById(targetUser.activeTitle) : null;
    const titleName = activeTitle ? `${activeTitle.emoji} ${activeTitle.name}` : null;

    const weapon = WEAPONS[targetUser.currentWeapon] || WEAPONS.lanza_rustica;
    const pickaxe = PICKAXES[targetUser.currentPickaxe] || PICKAXES.pico_madera;
    const nextLevelXP = (targetUser.level || 1) * 150;
    const daysMarried = targetUser.marriedSince ? Math.floor((Date.now() - targetUser.marriedSince) / 86400000) : 0;

    const caption = [
      `『 👤 』 *PERFIL DE ${targetUser.name.toUpperCase()}*`,
      ``,
      `✦ *INFORMACIÓN BÁSICA*`,
      `  • ID      : ${targetUser.userId || 'Pendiente'}`,
      `  • Nombre  : ${targetUser.name}${targetUser.nickname ? ` (${targetUser.nickname})` : ''}`,
      `  • Edad    : ${targetUser.age ? `${targetUser.age} años` : 'No especificada'}`,
      `  • Género  : ${GENEROS[targetUser.gender] || 'No especificado'}`,
      `  • Biografía: _${targetUser.bio || 'Sin biografía.'}_`,
      ...(targetUser.location ? [`  • País    : ${targetUser.location}`] : []),
      ...(titleName ? [`  • Título  : ${titleName}`] : []),
      ``,
      `✦ *EQUIPAMIENTO & PROGRESO*`,
      `  • Nivel   : ${targetUser.level || 1} [ ${targetUser.xp || 0} / ${nextLevelXP} XP ]`,
      `  • Rango   : ${targetUser.role || 'Iniciado V'}`,
      `  • Arma    : 🏹 ${weapon.name} (Nvl. ${targetUser.weaponLevel || 1})`,
      `  • Pico    : ⛏️ ${pickaxe.name} (Nvl. ${targetUser.pickaxeLevel || 1})`,
      ``,
      `✦ *FINANZAS*`,
      `  • ${ZenConfig.currencies.zencoins.emoji} ${ZenConfig.currencies.zencoins.name} : ${formatNumber(targetUser.zencoins)}`,
      `  • ${ZenConfig.currencies.kogen.emoji} ${ZenConfig.currencies.kogen.name}    : ${formatNumber(targetUser.kogen)}`,
      `  • ${ZenConfig.currencies.lux.emoji} ${ZenConfig.currencies.lux.name}      : ${formatNumber(targetUser.lux)}`,
      ``,
      `✦ *ESTADO SOCIAL*`,
      `  • Racha   : 🔥 ${targetUser.streak || 0} días seguidos (Máx: ${targetUser.maxStreak || 0})`,
      targetUser.marriedWith
        ? `  • Pareja  : 💍 ${targetPartnerName || 'Alguien'} (${daysMarried} días)`
        : `  • Pareja  : Soltero/a`,
      `  • Comandos usados: ${targetUser.stats?.commandsUsed || 0}`
    ].join('\n');

    try {
      const cardBuffer = await renderHtmlCard({
        eyebrow: `${ZenConfig.botName.toUpperCase()} · PERFIL`,
        title: targetUser.name,
        subtitle: `${targetUser.userId || 'legacy'} · ${targetUser.role || 'Iniciado V'} · ${targetUser.level || 1} nivel`,
        accent: '#8b5cf6',
        accent2: '#06b6d4',
        art: cardAsset('rpg-hunter.png'),
        stats: [
          { label: 'Nivel', value: String(targetUser.level || 1), note: `${targetUser.xp || 0} XP` },
          { label: 'Zencoins', value: `${formatNumber(targetUser.zencoins)}`, note: 'saldo' },
          { label: 'Racha', value: `${targetUser.streak || 0} días`, note: `máx. ${targetUser.maxStreak || 0}` }
        ],
        rows: [
          { label: 'Género', value: GENEROS[targetUser.gender] || 'No especificado' },
          { label: 'Título', value: titleName || 'Sin título' },
          { label: 'Arma', value: WEAPONS[targetUser.currentWeapon]?.name || 'Lanza rústica' },
          { label: 'Pico', value: PICKAXES[targetUser.currentPickaxe]?.name || 'Pico de madera' }
        ],
        caption: targetPartnerName ? `Pareja: ${targetPartnerName}` : 'Explorador independiente'
      });

      return ctx.sock.sendMessage(ctx.chat, {
        image: cardBuffer,
        caption,
        mentions: [targetJid]
      }, { quoted: ctx.rawMsg });

    } catch (error) {
      console.error('[verperfil] Falló la tarjeta HTML o su envío; intentando el PNG de respaldo:', error?.stack || error);
      try {
        const fallbackBuffer = await generateProfileImage(targetUser, pfpUrl, targetPartnerName, titleName);
        return await ctx.sock.sendMessage(ctx.chat, {
          image: fallbackBuffer,
          caption,
          mentions: [targetJid]
        }, { quoted: ctx.rawMsg });
      } catch (fallbackError) {
        console.error('[verperfil] Falló también el envío PNG de respaldo:', fallbackError?.stack || fallbackError);
        return ctx.reply(caption);
      }
    }
  });
