import { ZenCommand } from '../../lib/core/factory.js';

const READ_MORE = String.fromCharCode(8206).repeat(4000);

function formatDisplayNumber(p) {
  if (p.phoneNumber) {
    return String(p.phoneNumber).replace(/\D/g, '');
  }
  if (p.id?.endsWith('@s.whatsapp.net')) {
    return p.id.split('@')[0].replace(/\D/g, '');
  }
  return p.id?.split('@')[0] || 'usuario';
}

export default new ZenCommand('tagall')
  .addAlias('todos', 'invocar', 'mencionartodos', 'avisar')
  .setCooldown(10)
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .setUsage('[mensaje o responder a un mensaje]')
  .onExecute(async (ctx) => {
    await ctx.react('📢');

    let meta;
    try {
      meta = await ctx.sock.groupMetadata(ctx.chat);
    } catch {
      return ctx.reply(`『 ⚠️ 』 *ERROR DE RED*\n\n> No pude obtener la información del grupo 😤`);
    }

    const participants = meta?.participants || [];
    if (!participants.length) {
      return ctx.reply(`『 ⚠️ 』 No encontré miembros en el grupo 😕`);
    }

    const botJid = ctx.sock.user.id.split('@')[0].split(':')[0] + '@s.whatsapp.net';
    const botLid = ctx.sock.user.lid ? ctx.sock.user.lid.split('@')[0] : '';

    const members = participants.filter((p) => {
      const pId = p.id || '';
      return pId !== botJid && !pId.includes(botJid.split('@')[0]) && (!botLid || !p.lid?.includes(botLid));
    });

    const quotedMsg = ctx.rawMsg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    let customText = ctx.args.join(' ').trim();

    if (!customText && quotedMsg) {
      customText =
        quotedMsg.conversation ||
        quotedMsg.extendedTextMessage?.text ||
        quotedMsg.imageMessage?.caption ||
        quotedMsg.videoMessage?.caption ||
        '';
    }

    if (!customText) {
      customText = 'Atención a todos los miembros del grupo.';
    }

    const admins = [];
    const regulars = [];

    members.forEach((p) => {
      const isAdmin = p.admin === 'admin' || p.admin === 'superadmin';
      if (isAdmin) admins.push(p);
      else regulars.push(p);
    });

    const groupName = meta.subject || 'Grupo';
    const totalMembers = participants.length;
    const senderNum = ctx.sender.split('@')[0].replace(/\D/g, '');

    const lines = [
      `╭─ · · ✦『 *CONVOCATORIA GENERAL* 』✦ · ·`,
      `│`,
      `│ 👥 *Grupo :* ${groupName}`,
      `│ 📊 *Miembros :* ${totalMembers} (${admins.length} admins)`,
      `│ ✍️ *Por :* @${senderNum}`,
      `│`,
      `╰────────────────────────────── · · ✦`,
      ``,
      `📢 *MENSAJE DEL ADMINISTRADOR:*`,
      `> ${customText.replace(/\n/g, '\n> ')}`,
      ``,
      `> _Toca en "Leer más" para ver la lista completa de invocación_`,
      READ_MORE,
      ``,
      `👑 *ADMINISTRADORES:*`
    ];

    admins.forEach((p) => {
      const num = formatDisplayNumber(p);
      lines.push(`  • @${num}`);
    });

    lines.push(``);
    lines.push(`✧ *MIEMBROS:*`);

    regulars.forEach((p) => {
      const num = formatDisplayNumber(p);
      lines.push(`  • @${num}`);
    });

    const mentions = members.map((p) => p.id);
    mentions.push(ctx.sender);

    return ctx.sock.sendMessage(
      ctx.chat,
      {
        text: lines.join('\n'),
        mentions
      },
      { quoted: ctx.rawMsg }
    );
  });