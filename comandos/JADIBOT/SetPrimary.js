import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import {
  activeSubBotNumbers,
  invalidateAllSubBotGroupPolicies,
  normalizeBotNumber,
  configuredMainNumber
} from '../../lib/runtime/subbot-policy.js';
import { isRunning, isMainOwner, requesterNumber } from '../../lib/services/subbots.js';

const usage = (prefix) =>
  `『 ⚙️ 』 *USO*\n\n> ${prefix}setprimary main 🙂\n> ${prefix}setprimary <número-del-sub-bot>\n> ${prefix}setprimary reset\n> También podés responder o mencionar al bot objetivo.`;

const sameJid = (first, second) => String(first || '').toLowerCase().replace(/:\d+(?=@)/, '')
  === String(second || '').toLowerCase().replace(/:\d+(?=@)/, '');

const isAddressedToSocket = async (ctx) => {
  const addressed = [...new Set([
    ...(ctx.mentions || []),
    ctx.quotedParticipant
  ].filter(Boolean))];
  if (!addressed.length) return false;

  const currentNumber = normalizeBotNumber(ctx.sock.isSubBot
    ? ctx.sock.subbotNumber
    : configuredMainNumber());
  const ownIds = [ctx.sock.user?.id, ctx.sock.user?.lid, `${currentNumber}@s.whatsapp.net`]
    .filter(Boolean);

  for (const candidate of addressed) {
    if (ownIds.some((own) => sameJid(candidate, own))) return true;
    if (normalizeBotNumber(candidate) === currentNumber) return true;
    for (const own of ownIds) {
      try {
        if ((ctx.sock.getJidAliases?.(candidate) || []).some((alias) => sameJid(alias, own))) return true;
      } catch {}
    }
  }
  return false;
};

const isControllerSocket = (ctx, target) => {
  if (target === configuredMainNumber()) return !ctx.sock.isSubBot;
  if (!ctx.sock.isSubBot) return false;
  return normalizeBotNumber(ctx.sock.subbotNumber) === target;
};

export default new ZenCommand('setprimary')
  .addAlias('primary', 'primario')
  .setCooldown(3)
  .setCategory('jadibot')
  .requireGroup()
  .setUsage('main | número | reset')
  .onExecute(async (ctx) => {
    const prefix = ZenConfig.prefix;
    const requested = String(ctx.args[0] || '').toLowerCase();
    const main = configuredMainNumber();
    const addressedToCurrent = await isAddressedToSocket(ctx);
    const target = ['main', 'principal'].includes(requested)
      ? main
      : normalizeBotNumber(requested) || (addressedToCurrent
        ? normalizeBotNumber(ctx.sock.isSubBot ? ctx.sock.subbotNumber : main)
        : '');
    const isReset = ['reset', 'off', 'none', 'ninguno'].includes(requested);
    const controller = isReset
      ? (!ctx.sock.isSubBot || activeSubBotNumbers().sort()[0] === normalizeBotNumber(ctx.sock.subbotNumber))
      : isControllerSocket(ctx, target);

    if (!controller) return;

    if (!(await ctx.isSenderAdmin()) && !isMainOwner(requesterNumber(ctx))) {
      return ctx.reply(V.perm.admin('cambiar el bot primario'));
    }

    const group = await ctx.getGroup();
    if (!group) return ctx.reply('『 ⚠️ 』 No pude cargar la configuración de este grupo.');

    if (isReset) {
      group.primaryBot = null;
      await group.save();
      invalidateAllSubBotGroupPolicies(ctx.chat);
      return ctx.reply(
        `『 🔄 』 *PRIMARIO ELIMINADO*\n\n` +
        `> Este cambio solo afecta a este grupo 😌\n` +
        `> ${main ? 'El bot principal volverá a responder si está presente.' : 'Se elegirá un sub-bot activo.'}`
      );
    }

    if (!target || !/^\d{8,15}$/.test(target)) return ctx.reply(usage(prefix));
    if (target !== main && !isRunning(target)) {
      return ctx.reply(`『 ⚠️ 』 *SUB-BOT NO DISPONIBLE*\n\n> La sesión +${target} no está activa 🫤`);
    }

    group.primaryBot = target;
    await group.save();
    invalidateAllSubBotGroupPolicies(ctx.chat);
    const label = target === main ? 'bot principal' : `sub-bot +${target}`;
    return ctx.reply(
      `『 ⭐ 』 *PRIMARIO ASIGNADO*\n\n` +
      `> ${label} será el único que responderá en este grupo 🙂\n` +
      `> Los demás bots permanecerán silenciosos.\n` +
      `> _Los otros grupos no cambian._`
    );
  });
