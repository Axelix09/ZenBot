import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { 
  setGroupNotifications, 
  areNotificationsEnabled, 
  toggleGroupNotifications 
} from '../../lib/messaging/group-notifications.js';

export default new ZenCommand('adminnotif')
  .addAlias('notifadmin', 'notificaciones', 'anotif')
  .setCooldown(3)
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .setUsage('on|off')
  .onExecute(async (ctx) => {
    const [modo] = ctx.args;
    const groupId = ctx.chat;
    const prefix = ZenConfig.prefix;

    if (!modo) {
      const estado = areNotificationsEnabled(groupId) ? '✅ Activado' : '❌ Desactivado';
      return ctx.reply(
        `『 📢 』 *NOTIFICACIONES PARA ADMINS*\n\n` +
        `✦ *Estado:* ${estado}\n` +
        `✦ *Uso:* ${prefix}adminnotif on/off\n\n` +
        `> _Cuando está activado, los admins reciben alertas de cambios en el grupo 😌_\n` +
        `> _Ejemplo: grupo abierto/cerrado, welcome activado/desactivado, etc._`
      );
    }

    const sub = modo.toLowerCase();

    if (sub === 'on' || sub === 'activar') {
      setGroupNotifications(groupId, true);
      await ctx.react('✅');
      return ctx.reply(
        `『 ✅ 』 *NOTIFICACIONES ACTIVADAS*\n\n` +
        `> Los administradores recibirán alertas cuando se realicen cambios importantes en el grupo 😄`
      );
    }

    if (sub === 'off' || sub === 'desactivar') {
      setGroupNotifications(groupId, false);
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *NOTIFICACIONES DESACTIVADAS*\n\n` +
        `> Los administradores ya no recibirán notificaciones de cambios en el grupo 😉`
      );
    }

    await ctx.react('⚠️');
    return ctx.reply(
      `『 ⚠️ 』 *OPCIÓN INVÁLIDA*\n\n` +
      `> Eso no me cierra 😵‍💫\n> Usá: *${prefix}adminnotif on* o *${prefix}adminnotif off*`
    );
  });