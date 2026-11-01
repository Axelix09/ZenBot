import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { GENDERS, SEEKING_OPTIONS, DEFAULT_AVATAR } from '../../lib/database/zenmatch-data.js';
import { getDefaultAgeRange, buscarSiguientePerfil } from '../../lib/database/zenmatch-helpers.js';

export default new ZenCommand('zenmatch')
  .addAlias('match', 'tinder', 'citas', 'matchexplorar')
  .setCooldown(3)
  .setCategory('Social')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const prefix = ZenConfig.prefix;
    const zm = user.zenmatch || {};

    if (!zm.active) {
      await ctx.react('❤️');
      return ctx.reply(
        `『 ❤️ 』 *BIENVENIDO A ZENMATCH*\n\n` +
        `> ¡Conecta con personas afines directamente en WhatsApp! 😌\n\n` +
        `✦ *Uso para registrarte:*\n` +
        `  • *${prefix}matchcrear <Edad>, <M/F/O>, <Busco M/F/BOTH>, <Nombre>*\n\n` +
        `> _Ejemplo: ${prefix}matchcrear 21, M, F, Alex_`
      );
    }

    const [sub] = ctx.args;

    if (!sub || sub.toLowerCase() === 'panel') {
      await ctx.react('❤️');

      const likesCount = (zm.likesReceived || []).length;
      const requestsCount = (zm.chatRequests || []).length;
      const matchesCount = (zm.matches || []).length;
      const myTags = (zm.tags || []).join(' ') || 'Sin etiquetas';
      const defaultAge = getDefaultAgeRange(zm.age);
      const filters = zm.filters || defaultAge;

      const panelText =
        `『 ❤️ 』 *PANEL DE ZENMATCH — ${zm.name.toUpperCase()}* ${zm.verified ? '✔️' : ''}\n\n` +
        `✦ *Perfil:* ${GENDERS[zm.gender] || '—'} (${zm.age} años)\n` +
        `✦ *Busco:* ${SEEKING_OPTIONS[zm.seeking] || '—'}\n` +
        `✦ *Filtro edad:* ${filters.minAge} - ${filters.maxAge} años\n` +
        `✦ *Etiquetas:* ${myTags}\n\n` +
        `✦ *ESTADÍSTICAS Y NOTIFICACIONES*\n` +
        `  • ❤️ Me gusta recibidos: *${likesCount}*\n` +
        `  • 📩 Solicitudes de chat: *${requestsCount}*\n` +
        `  • 🔥 Matches logrados: *${matchesCount}*\n\n` +
        `✦ *COMANDOS Y BÚSQUEDA*\n` +
        `  • *${prefix}match explorar* ➜ Ver candidatos\n` +
        `  • *${prefix}matchfiltro #etiqueta* ➜ Filtrar por gusto\n` +
        `  • *${prefix}matchperfil* ➜ Editar tu perfil / foto`;

      const buttons = [{
        type: 'quick_reply',
        text: '🔥 EXPLORAR PERFILES',
        id: `${prefix}matchexplorar`
      }, {
        type: 'quick_reply',
        text: '📩 SOLICITUDES',
        id: `${prefix}matchsolicitudes`
      }];

      return ctx.sock.sendButtons(ctx.chat, {
        text: panelText,
        footer: ZenConfig.botName,
        image: zm.photo || DEFAULT_AVATAR,
        buttons
      });
    }

    if (sub.toLowerCase() === 'explorar' || sub.toLowerCase() === 'descubrir' || ctx.commandName === 'matchexplorar') {
      return buscarSiguientePerfil(ctx, user);
    }
  });