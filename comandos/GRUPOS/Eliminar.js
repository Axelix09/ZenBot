import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';

function extractDigits(str = '') {
  return String(str || '').split('@')[0].split(':')[0].replace(/\D/g, '');
}

export default new ZenCommand('ban')
  .addAlias('kick', 'echar', 'expulsar')
  .setCooldown(5)
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .requireBotAdmin()
  .setUsage('@usuario')
  .onExecute(async (ctx) => {
    try {
      const rawTarget = ctx.mentions?.[0] || ctx.quotedParticipant;
      let targetJid = await ctx.resolveMentionTarget();
      if (!targetJid) targetJid = rawTarget;

      if (!targetJid) {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *USUARIO REQUERIDO*\n\n` +
          `> Mencioná a un usuario (@usuario) o responde a su mensaje para expulsarlo 🤔`
        );
      }

      let meta;
      try {
        meta = await ctx.sock.groupMetadata(ctx.chat);
      } catch {
        return ctx.reply(`『 ⚠️ 』 *ERROR DE RED*\n\n> No pude obtener la lista de miembros del grupo 😵`);
      }

      const participants = meta?.participants || [];
      const targetDigits = extractDigits(targetJid);
      const rawDigits = extractDigits(rawTarget);

      const participant = participants.find((p) => {
        const pId = p.id || '';
        const pLid = p.lid || '';
        const pPhone = p.phoneNumber ? extractDigits(p.phoneNumber) : '';
        const phoneJid = pPhone ? `${pPhone}@s.whatsapp.net` : '';
        if ([pId, pLid, phoneJid].filter(Boolean).some((jid) =>
          jid === targetJid || jid === rawTarget || ctx.hasSameJidAlias(jid, targetJid)
        )) return true;

        const targetIsPhone = /@(s\.whatsapp\.net|c\.us|hosted)$/i.test(targetJid || '');
        const pIdIsPhone = /@(s\.whatsapp\.net|c\.us|hosted)$/i.test(pId);
        return targetIsPhone && (
          (pPhone && extractDigits(targetJid) === pPhone) ||
          (pIdIsPhone && extractDigits(targetJid) === extractDigits(pId))
        );
      });

      if (!participant) {
        await ctx.react('⚠️');
        const displayNum = targetDigits || rawDigits || targetJid.split('@')[0];
        return ctx.reply(`『 ⚠️ 』 *NO ES MIEMBRO*\n\n> @${displayNum} no pertenece a este grupo 🥲`, {
          mentions: [targetJid, rawTarget].filter(Boolean)
        });
      }

      const canonicalJid = participant.id;
      const canonicalDigits = extractDigits(canonicalJid);
      const phoneDigits = participant.phoneNumber ? extractDigits(participant.phoneNumber) : '';
      const isBot = await ctx.isSameUser(canonicalJid, ctx.sock.user.id) ||
        (participant.lid && await ctx.isSameUser(participant.lid, ctx.sock.user.lid || ctx.sock.user.id));

      if (isBot) {
        await ctx.react('🤖');
        return ctx.reply(`『 ⚠️ 』 *AUTO-EXPULSIÓN*\n\n> No puedo expulsarme a mí mismo 🙂`);
      }

      const ownerNumbers = (ZenConfig.ownerNumbers || []).map(extractDigits);
      const targetIsPhone = /@(s\.whatsapp\.net|c\.us|hosted)$/i.test(targetJid || '');
      const participantIdIsPhone = /@(s\.whatsapp\.net|c\.us|hosted)$/i.test(canonicalJid || '');
      const knownPhoneDigits = [
        phoneDigits,
        participantIdIsPhone ? canonicalDigits : '',
        targetIsPhone ? targetDigits : '',
        /@(s\.whatsapp\.net|c\.us|hosted)$/i.test(rawTarget || '') ? rawDigits : ''
      ].filter(Boolean);
      if (knownPhoneDigits.some((digits) => ownerNumbers.includes(digits))) {
        await ctx.react('👑');
        return ctx.reply(`『 ⚠️ 』 *PROPIETARIO PROTEGIDO*\n\n> No puedo expulsar al desarrollador/dueño 😄`);
      }

      const isTargetAdmin = participant.admin === 'admin' || participant.admin === 'superadmin';
      if (isTargetAdmin) {
        await ctx.react('🛡️');
        return ctx.reply(`『 ⚠️ 』 *ADMINISTRADOR PROTEGIDO*\n\n> No puedo expulsar a otro administrador 😌`);
      }

      const botIsAdmin = await ctx.isBotAdmin();
      if (!botIsAdmin) {
        await ctx.react('⚠️');
        return ctx.reply(V.perm.botAdmin('expulsar'));
      }

      await ctx.react('⌛');

      try {
        await ctx.sock.groups.kick(ctx.chat, [canonicalJid]);
      } catch (err) {
        try {
          if (rawTarget && rawTarget !== canonicalJid) {
            await ctx.sock.groups.kick(ctx.chat, [rawTarget]);
          } else if (targetJid && targetJid !== canonicalJid) {
            await ctx.sock.groups.kick(ctx.chat, [targetJid]);
          } else {
            throw err;
          }
        } catch (retryErr) {
          const errorMsg = retryErr?.message || err?.message || 'Error desconocido';
          console.error('[ban] Error al expulsar:', errorMsg);

          if (errorMsg.includes('not-authorized') || errorMsg.includes('403')) {
            return ctx.reply(`『 ⚠️ 』 *PERMISOS INSUFICIENTES*\n\n> No tengo permisos suficientes para expulsar a este usuario 🫣`);
          }
          return ctx.reply(`『 ❌ 』 *ERROR AL EXPULSAR*\n\n> WhatsApp rechazó la solicitud de expulsión 😤`);
        }
      }

      await ctx.react('🥾');

      const displayUser = phoneDigits || targetDigits || canonicalDigits;

      return ctx.reply(
        `『 🥾 』 *USUARIO EXPULSADO*\n\n` +
        `> @${displayUser} fue eliminado del grupo 🙂\n` +
        `> Acción ejecutada por @${ctx.sender.split('@')[0]}.`,
        { mentions: [canonicalJid, targetJid, rawTarget, ctx.sender].filter(Boolean) }
      );

    } catch (error) {
      console.error('[ban] Error general:', error);
      return ctx.reply(`『 ⚠️ 』 *ERROR INESPERADO*\n\n> Probá de nuevo en unos momentos 🙃`);
    }
  });