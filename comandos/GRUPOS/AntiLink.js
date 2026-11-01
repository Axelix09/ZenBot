import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

const LINK_TYPES = {
  whatsapp: {
    id: 'whatsapp',
    name: 'WhatsApp',
    emoji: '💬',
    regex: /(?:https?:\/\/)?(?:www\.)?(?:chat\.whatsapp\.com|wa\.me)\/(?:invite\/)?([0-9A-Za-z]{20,24})/i,
    description: 'Enlaces de invitación a grupos de WhatsApp'
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    emoji: '📸',
    regex: /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:p|reel|stories|tv)\/[A-Za-z0-9_-]+/i,
    description: 'Publicaciones, reels o historias de Instagram'
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    emoji: '📘',
    regex: /(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.com)\/(?:[A-Za-z0-9.]+)\/(?:posts|photos|videos|reel)\/[0-9]+/i,
    description: 'Publicaciones, fotos o videos de Facebook'
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    emoji: '▶️',
    regex: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|shorts\/|embed\/|v\/|)([A-Za-z0-9_-]{11})/i,
    description: 'Videos o shorts de YouTube'
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    emoji: '🎵',
    regex: /(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com|vm\.tiktok\.com)\/@[A-Za-z0-9_.]+\/(?:video|photo)\/[0-9]+/i,
    description: 'Videos o fotos de TikTok'
  },
  x: {
    id: 'x',
    name: 'X / Twitter',
    emoji: '🐦',
    regex: /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/[A-Za-z0-9_]+\/status\/[0-9]+/i,
    description: 'Publicaciones de X (Twitter)'
  },
  telegram: {
    id: 'telegram',
    name: 'Telegram',
    emoji: '✈️',
    regex: /(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\/(?:joinchat\/)?[A-Za-z0-9_-]+/i,
    description: 'Enlaces de invitación a grupos o canales de Telegram'
  },
  discord: {
    id: 'discord',
    name: 'Discord',
    emoji: '🎮',
    regex: /(?:https?:\/\/)?(?:www\.)?(?:discord\.(?:com|gg))\/invite\/[A-Za-z0-9_-]+/i,
    description: 'Enlaces de invitación a servidores de Discord'
  },
  onlyfans: {
    id: 'onlyfans',
    name: 'OnlyFans',
    emoji: '🔞',
    regex: /(?:https?:\/\/)?(?:www\.)?onlyfans\.com\/[A-Za-z0-9_]+/i,
    description: 'Perfiles o publicaciones de OnlyFans'
  },
  linktree: {
    id: 'linktree',
    name: 'LinkTree',
    emoji: '🌳',
    regex: /(?:https?:\/\/)?(?:www\.)?linktr\.ee\/[A-Za-z0-9_-]+/i,
    description: 'Enlaces de LinkTree con múltiples redes'
  },
  url_shortener: {
    id: 'url_shortener',
    name: 'Acortadores URL',
    emoji: '🔗',
    regex: /(?:https?:\/\/)?(?:bit\.ly|tinyurl\.com|goo\.gl|ow\.ly|is\.gd|buff\.ly|shorturl\.at|rb\.gy|shorte\.st|tiny\.cc|clck\.ru|cutt\.ly|rebrand\.ly|short\.link|t2mio|v.gd|surl\.li|mzl\.la|lnkd\.in|urls\.fr|adf\.ly|shink\.in|mcaf\.ee|migre\.me|qr\.ae|snipurl\.com|xrl\.us|yep\.it|zpr\.io)/i,
    description: 'Acortadores de enlaces (bit.ly, tinyurl, etc.)'
  },
  dominio_generico: {
    id: 'dominio_generico',
    name: 'Dominio Genérico',
    emoji: '🌐',
    regex: /(?:https?:\/\/)?(?:www\.)?[A-Za-z0-9-]+\.(?:com|net|org|info|biz|io|co|us|uk|es|ar|mx|cl|pe|br|ec|ve|co|xyz|online|site|tech|shop|store|app|club|world|life|work|live|news|media|digital|design|studio|space|cloud|host|network|services|solutions|systems|technology)/i,
    description: 'Dominios genéricos (.com, .net, .org, etc.)'
  }
};

function getLinkConfig(linkId) {
  return LINK_TYPES[linkId] || null;
}

function isLinkBlocked(group, url) {
  const active = group.antilink_active || [];
  if (!active.length) return false;

  for (const linkId of active) {
    const config = getLinkConfig(linkId);
    if (config && config.regex.test(url)) {
      return linkId;
    }
  }
  return false;
}

export function formatLinkList(group, commandName = 'antilink') {
  const active = group.antilink_active || [];
  const allLinks = Object.values(LINK_TYPES);

  let txt = `『 🔗 』 *CONFIGURACIÓN ANTI-LINK*\n\n`;
  txt += `✦ *Total activos:* ${active.length}/${allLinks.length}\n\n`;

  const categories = {};
  for (const link of allLinks) {
    const cat = link.id === 'whatsapp' || link.id === 'telegram' || link.id === 'discord' ? 'Mensajería' :
                link.id === 'instagram' || link.id === 'facebook' || link.id === 'tiktok' || link.id === 'x' ? 'Redes Sociales' :
                link.id === 'youtube' || link.id === 'onlyfans' ? 'Contenido' :
                'Utilidades';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push({
      ...link,
      active: active.includes(link.id)
    });
  }

  for (const [cat, links] of Object.entries(categories)) {
    const catActive = links.filter(l => l.active).length;
    txt += `✦ *${cat}:* ${catActive}/${links.length} activos\n`;
    for (const link of links) {
      const status = link.active ? '✅' : '⬜';
      txt += `  ${status} ${link.emoji} ${link.name}\n`;
    }
    txt += '\n';
  }

  txt += `\n💡 *Comandos:*\n`;
  txt += `  • ${ZenConfig.prefix}${commandName} toggle [id] ➜ Activar/desactivar\n`;
  txt += `  • ${ZenConfig.prefix}${commandName} on ➜ Activar todos\n`;
  txt += `  • ${ZenConfig.prefix}${commandName} off ➜ Desactivar todos\n`;
  txt += `  • ${ZenConfig.prefix}${commandName} list ➜ Ver lista detallada\n\n`;
  txt += `> _IDs: ${Object.keys(LINK_TYPES).join(', ')}_`;

  return txt;
}

const SELECTOR_GROUPS = [
  {
    title: 'Mensajería y redes',
    filters: ['whatsapp', 'telegram', 'discord', 'instagram', 'facebook', 'tiktok', 'x']
  },
  {
    title: 'Contenido y utilidades',
    filters: ['youtube', 'onlyfans', 'linktree', 'url_shortener', 'dominio_generico']
  }
];

function buildSelectorButtons(group, commandName) {
  const active = group.antilink_active || [];
  const prefix = ZenConfig.prefix;
  const buttons = SELECTOR_GROUPS.map((selectorGroup, index) => ({
    type: 'single_select',
    text: `Elegir filtros (${index + 1}/2)`,
    title: selectorGroup.title,
    sections: [{
      title: selectorGroup.title,
      rows: selectorGroup.filters.map((id) => {
        const link = LINK_TYPES[id];
        const enabled = active.includes(id);
        const description = `${enabled ? '✅ Activo' : '⬜ Inactivo'} · ${link.description}`;
        return {
          id: `${prefix}${commandName} toggle ${id}`,
          title: `${link.emoji} ${link.name}`,
          description: Array.from(description).slice(0, 72).join('')
        };
      })
    }]
  }));

  buttons.push({
    type: 'quick_reply',
    text: '✅ Activar todo',
    id: `${prefix}${commandName} on`
  });
  return buttons;
}

async function sendLinkSelector(ctx, group, commandName = ctx.commandName, notice = '') {
  const summary = formatLinkList(group, commandName);
  const commandsIndex = summary.indexOf('\n\n💡 *Comandos:*');
  const idsIndex = summary.indexOf('\n> _IDs:');
  const list = commandsIndex >= 0 ? summary.slice(0, commandsIndex) : (idsIndex >= 0 ? summary.slice(0, idsIndex) : summary);
  const text = [
    notice ? `『 🔗 』 *${notice}*` : '',
    list,
    '> Elegí qué filtro querés activar o desactivar. Cada opción explica qué enlaces detecta 😄',
    '> También podés pulsar *✅ Activar todo*.'
  ].filter(Boolean).join('\n\n');

  return ctx.sock.sendButtons(ctx.chat, {
    text,
    footer: ZenConfig.botName,
    buttons: buildSelectorButtons(group, commandName)
  });
}

const getRealMessage = (message) => {
  if (!message) return null;
  let m = message;
  if (m.ephemeralMessage) m = m.ephemeralMessage.message || m.ephemeralMessage;
  if (m.viewOnceMessage) m = m.viewOnceMessage.message || m.viewOnceMessage;
  if (m.viewOnceMessageV2) m = m.viewOnceMessageV2.message || m.viewOnceMessageV2;
  if (m.documentWithCaptionMessage) m = m.documentWithCaptionMessage.message || m.documentWithCaptionMessage;
  return m;
};

export default new ZenCommand('antilink')
  .addAlias('antienlace')
  .setCooldown(3)
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .setUsage('[selector|on|off|toggle <id>|list]')
  .onExecute(async (ctx) => {
    const [modo, target] = ctx.args;
    const group = await ctx.getGroup();

    if (!group.antilink_active) group.antilink_active = [];

    if (!modo) {
      await ctx.react('🔗');
      return sendLinkSelector(ctx, group, ctx.commandName);
    }

    const sub = modo.toLowerCase();

    if (sub === 'list' || sub === 'lista') {
      await ctx.react('📋');
      const active = group.antilink_active || [];
      let txt = `『 📋 』 *LISTA COMPLETA DE LINKS*\n\n`;
      txt += `✦ *Total activos:* ${active.length}/${Object.keys(LINK_TYPES).length}\n\n`;

      for (const [id, link] of Object.entries(LINK_TYPES)) {
        const status = active.includes(id) ? '✅ ACTIVO' : '⬜ INACTIVO';
        txt += `  ${link.emoji} *${link.name}* [${id}]\n     ${status}\n     _${link.description}_\n\n`;
      }

      txt += `\n💡 Usa *${ZenConfig.prefix}${ctx.commandName} toggle [id]* para activar/desactivar individualmente`;
      return ctx.reply(txt);
    }

    if (sub === 'toggle' && target) {
      const link = getLinkConfig(target.toLowerCase());
      if (!link) {
        await ctx.react('⚠️');
        const available = Object.values(LINK_TYPES).map(l => `• ${l.emoji} ${l.name} [${l.id}]`).join('\n');
        return ctx.reply(
          `『 ⚠️ 』 *LINK NO ENCONTRADO*\n\n` +
          `> Busqué y nada 🥲\n> No existe: *${target}*\n\n` +
          `✦ *Tipos disponibles:*\n${available}`
        );
      }

      const index = group.antilink_active.indexOf(link.id);
      if (index === -1) {
        group.antilink_active.push(link.id);
      } else {
        group.antilink_active.splice(index, 1);
      }

      if (typeof group.markModified === 'function') {
        group.markModified('antilink_active');
      }

      await group.save();
      await ctx.react('✅');

      const status = group.antilink_active.includes(link.id) ? 'ACTIVADO' : 'DESACTIVADO';
      return sendLinkSelector(ctx, group, ctx.commandName, `${link.emoji} ${link.name} ${status}`);
    }

    if (sub === 'on' || sub === 'activar') {
      group.antilink_active = Object.keys(LINK_TYPES);
      if (typeof group.markModified === 'function') {
        group.markModified('antilink_active');
      }
      await group.save();
      await ctx.react('✅');
      return sendLinkSelector(ctx, group, ctx.commandName, 'TODOS LOS FILTROS ACTIVADOS');
    }

    if (sub === 'off' || sub === 'desactivar') {
      group.antilink_active = [];
      if (typeof group.markModified === 'function') {
        group.markModified('antilink_active');
      }
      await group.save();
      await ctx.react('✅');
      return sendLinkSelector(ctx, group, ctx.commandName, 'TODOS LOS FILTROS DESACTIVADOS');
    }

    await ctx.react('⚠️');
    return ctx.reply(
      `『 ⚠️ 』 *COMANDO NO RECONOCIDO*\n\n` +
      `✦ *Uso:*\n` +
      `  • ${ZenConfig.prefix}${ctx.commandName} ➜ Ver estado\n` +
      `  • ${ZenConfig.prefix}${ctx.commandName} list ➜ Lista completa\n` +
      `  • ${ZenConfig.prefix}${ctx.commandName} toggle [id] ➜ Activar/desactivar\n` +
      `  • ${ZenConfig.prefix}${ctx.commandName} on ➜ Activar todos\n` +
      `  • ${ZenConfig.prefix}${ctx.commandName} off ➜ Desactivar todos\n\n` +
      `> _IDs: ${Object.keys(LINK_TYPES).join(', ')}_`
    );
  });

export const antiLinkListener = {
  async before(msg, sock, ctx) {
    if (!ctx.isGroup || ctx.rawMsg.key.fromMe) return;
    const groupDb = await ctx.getGroup();
    if (!groupDb || !groupDb.antilink_active?.length) return;

    const realMessage = getRealMessage(msg.message);
    if (!realMessage) return;

    const mtype = Object.keys(realMessage)[0] || '';
    const text = realMessage.conversation || 
                 realMessage.extendedTextMessage?.text || 
                 realMessage[mtype]?.caption || '';

    if (!text) return;

    const blockedLink = isLinkBlocked(groupDb, text);
    if (!blockedLink) return;

    const linkConfig = getLinkConfig(blockedLink);
    if (!linkConfig) return;

    const ownerJids = ZenConfig.ownerNumbers.map(n => n.replace(/[^0-9]/g, '') + '@s.whatsapp.net');
    const isOwner = ownerJids.includes(ctx.sender);
    const isAdmin = await ctx.isSenderAdmin();
    if (isAdmin || isOwner) return;

    const isBotAdmin = await ctx.isBotAdmin();
    if (!isBotAdmin) return;

    const senderNum = ctx.sender.split('@')[0];

    try {
      await sock.sendMessage(ctx.chat, { delete: ctx.rawMsg.key });
      await sock.sendMessage(ctx.chat, {
        text: `『 🔗 』 *ENLACE PROHIBIDO*\n\n> @${senderNum} envió un enlace de *${linkConfig.emoji} ${linkConfig.name}* 😬\n> Este tipo de enlace no está permitido en el grupo.`,
        mentions: [ctx.sender]
      });
      await sock.groups.kick(ctx.chat, [ctx.sender]);
    } catch {}
  }
};
