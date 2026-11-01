import { ZenCommand } from '../../lib/core/factory.js';

export default new ZenCommand('despromover')
  .addAlias('demote', 'deadmin')
  .setCooldown(3)
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .requireBotAdmin()
  .setUsage('@usuario')
  .onExecute(async (ctx) => {
    const targetJid = await ctx.resolveMentionTarget();
    if (!targetJid) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *USUARIO REQUERIDO*\n\n` +
        `> Mencioná al usuario que deseas des-promover 🤨`
      );
    }

    let meta;
    try { meta = await ctx.sock.groupMetadata(ctx.chat); } catch { return ctx.reply(`『 ⚠️ 』 *ERROR DE RED*\n\n> No pude cargar el registro del grupo 😤`); }
    const participants = meta.participants || [];
    const p = participants.find(part => part.id === targetJid);

    if (p?.admin === 'superadmin' || p?.isCommunityAdmin) {
      await ctx.react('👑');
      return ctx.reply(`『 ⚠️ 』 *CREADOR PROTEGIDO*\n\n> No puedo des-promover al creador del grupo 😄`);
    }

    await ctx.sock.groups.demote(ctx.chat, [targetJid]);
    await ctx.react('⬇️');
    return ctx.reply(
      `『 ⬇️ 』 *ADMINISTRADOR REVOCADO*\n\n` +
      `> @${targetJid.split('@')[0]} ya no es administrador 😌`,
      { mentions: [targetJid] }
    );
  });