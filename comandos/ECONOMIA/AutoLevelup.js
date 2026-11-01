import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';

export default new ZenCommand('autolevelup')
  .addAlias('levelnotif', 'notiflevel', 'desactivarnivel')
  .setCooldown(3)
  .setCategory('economia')
  .requireRegistration()
  .setUsage('on|off')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();

    if (user.loans?.blockedPermanently) {
      await ctx.react('🚫');
      return ctx.reply(
        V.blocked.permanent(user)
      );
    }

    if (user.loans?.isBlocked && !user.loans?.isPromised) {
      await ctx.react('🔒');
      return ctx.reply(
        V.blocked.debt(user)
      );
    }

    const [modo] = ctx.args;
    const prefix = ZenConfig.prefix;

    if (!user.config) user.config = {};

    if (!modo) {
      const estado = user.config.levelNotifications !== false ? '✅ Activado' : '❌ Desactivado';
      return ctx.reply(
        `『 📢 』 *NOTIFICACIONES DE NIVEL*\n\n` +
        `✦ *Estado:* ${estado}\n` +
        `✦ *Uso:* ${prefix}autolevelup on/off\n\n` +
        `> _Cuando está activado, recibirás un mensaje al subir de nivel 😌_\n` +
        `> _Cuando está desactivado, no recibirás notificaciones de nivel._`
      );
    }

    const sub = modo.toLowerCase();

    if (sub === 'on' || sub === 'activar') {
      user.config.levelNotifications = true;
      if (typeof user.markModified === 'function') user.markModified('config');
      await user.save();
      await ctx.react('✅');
      return ctx.reply(
        `『 ✅ 』 *NOTIFICACIONES ACTIVADAS*\n\n` +
        `> Recibirás mensajes cuando subas de nivel 😎`
      );
    }

    if (sub === 'off' || sub === 'desactivar') {
      user.config.levelNotifications = false;
      if (typeof user.markModified === 'function') user.markModified('config');
      await user.save();
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *NOTIFICACIONES DESACTIVADAS*\n\n` +
        `> Ya no recibirás mensajes al subir de nivel 😉\n` +
        `> Para volver a activarlas: *${prefix}autolevelup on*`
      );
    }

    await ctx.react('⚠️');
    return ctx.reply(
      `『 ⚠️ 』 *OPCIÓN INVÁLIDA*\n\n` +
      `> Eso no me cierra 😵‍💫\n> Usá: *${prefix}autolevelup on* o *${prefix}autolevelup off*`
    );
  });