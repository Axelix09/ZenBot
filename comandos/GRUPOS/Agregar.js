import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';

function extractDigits(str = '') {
  return String(str || '').split('@')[0].split(':')[0].replace(/\D/g, '');
}

export default new ZenCommand('add')
  .addAlias('agregar', 'añadir')
  .setCooldown(10)
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .requireBotAdmin()
  .setUsage('<número o mención>')
  .onExecute(async (ctx) => {
    try {
      const rawTarget = ctx.mentions?.[0] || ctx.quotedParticipant;
      let rawInput = ctx.args[0] ? ctx.args[0].replace(/[^0-9]/g, '') : '';

      let targetDigits = rawInput;
      if (!targetDigits && rawTarget) {
        const resolvedTarget = ctx.resolveTargetJid(rawTarget);
        targetDigits = /@(s\.whatsapp\.net|c\.us|hosted)$/i.test(resolvedTarget || '')
          ? extractDigits(resolvedTarget)
          : (String(rawTarget).endsWith('@lid') ? '' : extractDigits(rawTarget));
      }

      if (!targetDigits && !rawTarget) {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *NÚMERO REQUERIDO*\n\n` +
          `> Eso no me cierra 😵‍💫\n> Escribí el número con código de país o menciona a un usuario:\n` +
          `> *${ZenConfig.prefix}${ctx.commandName} 5491122334455* 🧐`
        );
      }

      if (targetDigits.startsWith('54') && targetDigits[2] !== '9') {
        targetDigits = '549' + targetDigits.slice(2);
      }
      if (targetDigits.startsWith('52') && targetDigits[2] !== '1') {
        targetDigits = '521' + targetDigits.slice(2);
      }


      let meta;
      try {
        meta = await ctx.sock.groupMetadata(ctx.chat);
      } catch {
        return ctx.reply(`『 ⚠️ 』 *ERROR DE RED*\n\n> No pude obtener la información del grupo 😢`);
      }

      const participants = meta?.participants || [];
      const targetAliases = new Set([rawTarget, rawTarget && ctx.resolveTargetJid(rawTarget)].filter(Boolean));
      try {
        for (const alias of ctx.sock.getJidAliases?.(rawTarget) || []) targetAliases.add(alias);
      } catch {}
      const targetIsLid = String(rawTarget || '').endsWith('@lid');

      const isAlreadyMember = participants.some((p) => {
        const pId = p.id || '';
        const pLid = p.lid || '';
        const pPhone = p.phoneNumber ? extractDigits(p.phoneNumber) : '';
        const pPhoneJid = pPhone ? `${pPhone}@s.whatsapp.net` : '';
        const participantJids = [pId, pLid, pPhoneJid].filter(Boolean);
        if (participantJids.some((jid) => targetAliases.has(jid) || [...targetAliases].some((target) => ctx.hasSameJidAlias(jid, target)))) return true;

        const pIdIsPhone = /@(s\.whatsapp\.net|c\.us|hosted)$/i.test(pId);
        return !targetIsLid && Boolean(targetDigits) && (
          pPhone === targetDigits || (pIdIsPhone && extractDigits(pId) === targetDigits)
        );
      });

      if (isAlreadyMember) {
        await ctx.react('ℹ️');
        const memberJid = rawTarget?.includes('@') ? rawTarget : `${targetDigits}@s.whatsapp.net`;
        const memberLabel = targetDigits || extractDigits(rawTarget) || 'usuario';
        return ctx.reply(`『 ℹ️ 』 *YA ES MIEMBRO*\n\n> El usuario @${memberLabel} ya está dentro del grupo 🤨`, {
          mentions: [memberJid]
        });
      }

      if (!targetDigits) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *NÚMERO NO DISPONIBLE*\n\n> WhatsApp entregó un ID privado (LID) sin su alias telefónico. Usá el número con código de país para agregar a esa persona 🥲`);
      }

      const botIsAdmin = await ctx.isBotAdmin();
      if (!botIsAdmin) {
        await ctx.react('⚠️');
        return ctx.reply(V.perm.botAdmin('agregar miembros'));
      }

      await ctx.react('⌛');

      const onWa = await ctx.sock.profile.exists(targetDigits).catch(() => []);
      if (!onWa || onWa.length === 0 || !onWa[0]?.exists) {
        await ctx.react('❌');
        return ctx.reply(`『 ⚠️ 』 *NÚMERO NO REGISTRADO*\n\n> El número *+${targetDigits}* no tiene cuenta de WhatsApp activa 🫤`);
      }

      const canonicalJid = onWa[0].jid;

      try {
        const response = await ctx.sock.groups.add(ctx.chat, [canonicalJid]);
        const result = Array.isArray(response) ? response[0] : response;
        const status = String(result?.status || '200');


        if (status === '200') {
          await ctx.react('🪂');
          return ctx.reply(
            `『 🪂 』 *USUARIO AGREGADO*\n\n` +
            `> @${targetDigits} fue incorporado al grupo por @${ctx.sender.split('@')[0]} 😌`,
            { mentions: [canonicalJid, ctx.sender] }
          );
        }

        if (status === '403') {
          await ctx.react('🔒');
          let inviteCode;
          try {
            inviteCode = await ctx.sock.groups.inviteCode(ctx.chat);
          } catch (_) {}

          if (inviteCode) {
            const inviteUrl = `https://chat.whatsapp.com/${inviteCode}`;
            await ctx.sock.sendMessage(canonicalJid, {
              text: `『 📩 』 *INVITACIÓN DE GRUPO*\n\nHola, un administrador intentó agregarte al grupo *${meta.subject}*, pero tu privacidad no lo permite.\nPuedes unirte mediante este enlace:\n${inviteUrl}`
            }).catch(() => {});

            return ctx.reply(
              `『 🔒 』 *PRIVACIDAD DEL USUARIO*\n\n` +
              `> @${targetDigits} no permite que lo agreguen directamente a grupos 🙂\n` +
              `> Se le envió un enlace de invitación a su chat privado.`,
              { mentions: [canonicalJid] }
            );
          }

          return ctx.reply(
            `『 🔒 』 *PRIVACIDAD DEL USUARIO*\n\n` +
            `> @${targetDigits} tiene la privacidad activada y no puede ser añadido directamente 🙂`,
            { mentions: [canonicalJid] }
          );
        }

        if (status === '408') {
          return ctx.reply(`『 ⚠️ 』 *SALIDA RECIENTE*\n\n> El usuario @${targetDigits} abandonó el grupo recientemente. Debe unirse por enlace 😉`);
        }

        if (status === '409') {
          return ctx.reply(`『 ℹ️ 』 *YA ES MIEMBRO*\n\n> El usuario ya pertenece al grupo 🤨`);
        }

        return ctx.reply(`『 ⚠️ 』 *ESTADO DE AGREGADO*\n\n> WhatsApp devolvió el código: ${status} 😌`);

      } catch (err) {
        console.error('[add] Error al agregar:', err);
        return ctx.reply(`『 ❌ 』 *ERROR AL AGREGAR*\n\n> WhatsApp no permitió añadir a este usuario 😢`);
      }

    } catch (error) {
      console.error('[add] Error general:', error);
      return ctx.reply(`『 ⚠️ 』 *ERROR INESPERADO*\n\n> Ocurrió un fallo al procesar la solicitud 🥱`);
    }
  });
