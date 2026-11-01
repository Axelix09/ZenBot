import { ZenCommand } from '../../lib/core/factory.js';
import { UserModel } from '../../lib/database/adapter.js';

export default new ZenCommand('infogrupo')
  .addAlias('groupinfo', 'ginfo', 'grupoinfo')
  .setCooldown(5)
  .setCategory('group')
  .requireGroup()
  .onExecute(async (ctx) => {
    await ctx.react('📋');
    let meta;
    try { meta = await ctx.sock.groupMetadata(ctx.chat); } catch { return ctx.reply(`『 ⚠️ 』 *ERROR DE RED*\n\n> No pude cargar el registro del grupo 😵`); }

    const botJid = ctx.sock.user.id.split('@')[0].split(':')[0] + '@s.whatsapp.net';
    const participants = meta.participants || [];
    const admins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
    const bots = participants.filter(p => p.id.split('@')[0].split(':')[0] + '@s.whatsapp.net' === botJid);

    const createdAt = meta.creation
      ? new Date(meta.creation * 1000).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '---';

    let inviteCode = null;
    const botAdmin = participants.find(p => p.id === botJid)?.admin;
    if (botAdmin === 'admin' || botAdmin === 'superadmin') {
      inviteCode = await ctx.sock.groups.inviteCode(ctx.chat).catch(() => null);
    }

    const chatKey = ctx.chat.replace(/\./g, '_');
    const rawUsers = await UserModel.find({ [`stats.messagesByGroup.${chatKey}`]: { $gt: 0 } });

    const activityList = rawUsers
      .map(u => u.stats?.messagesByGroup?.[chatKey] || 0)
      .filter(m => m > 0);

    const totalMsgs = activityList.reduce((acc, curr) => acc + curr, 0);

    const restrict = meta.restrict ? '🔒 Solo Admins' : '🌐 Todos';
    const announce = meta.announce ? '🔒 Solo Admins' : '🌐 Todos';
    const nsfwLabel = (await ctx.getGroup()).nsfw ? '✅ Habilitado' : '❌ Desactivado';

    const cleanInfo = [
      `『 📋 』 *INFORMACIÓN DEL GRUPO*`,
      ``,
      `✦ *DATOS GENERALES*`,
      `  • *Nombre:* ${meta.subject || '---'}`,
      `  • *ID:* ${ctx.chat}`,
      `  • *Creado:* ${createdAt}`,
      inviteCode ? `  • *Enlace:* https://chat.whatsapp.com/${inviteCode}` : null,
      ``,
      `✦ *MIEMBROS*`,
      `  • *Total:* ${participants.length}`,
      `  • *Administradores:* ${admins.length}`,
      `  • *Bots:* ${bots.length}`,
      ``,
      `✦ *CONFIGURACIÓN*`,
      `  • *Editar información:* ${restrict}`,
      `  • *Enviar mensajes:* ${announce}`,
      `  • *NSFW (+18):* ${nsfwLabel}`,
      ``,
      `✦ *ACTIVIDAD*`,
      `  • *Mensajes registrados:* ${totalMsgs}`,
      `  • *Miembros activos:* ${activityList.length}`
    ].filter(Boolean);

    const pfp = await ctx.sock.profile.pictureUrl(ctx.chat, 'image').catch(() => null);

    if (pfp) {
      return ctx.sock.sendMessage(ctx.chat, { image: { url: pfp }, caption: cleanInfo.join('\n') }, { quoted: ctx.rawMsg });
    }
    return ctx.reply(cleanInfo.join('\n'));
  });