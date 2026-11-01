import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { UserModel } from '../../lib/database/adapter.js';

const MEDALS = ['🥇', '🥈', '🥉'];

function cleanNumber(jid) {
  if (!jid) return '???';
  const num = jid.split('@')[0].replace(/[^0-9]/g, '');
  return num || '???';
}

function getLevel(count) {
  if (count >= 10000) return '👑 Leyenda';
  if (count >= 5000) return '🎯 Experto';
  if (count >= 2000) return '🚀 Activo';
  if (count >= 1000) return '📊 Regular';
  if (count >= 500) return '📝 Ocasional';
  if (count >= 100) return '🌱 Novato';
  return '💤 Inactivo';
}

function getBotJid(sock) {
  const botId = sock.user.id;
  if (typeof botId === 'string') {
    return botId.split('@')[0].split(':')[0] + '@s.whatsapp.net';
  }
  return botId;
}

async function getActivityData(ctx) {
  const botJid = getBotJid(ctx.sock);

  let meta;
  try { meta = await ctx.sock.groupMetadata(ctx.chat); } catch { return null; }
  const participants = meta.participants || [];

  const chatKey = ctx.chat.replace(/\./g, '_');
  const rawUsers = await UserModel.find({ [`stats.messagesByGroup.${chatKey}`]: { $gt: 0 } });

  const activityMap = {};
  rawUsers.forEach(u => {
    const msgs = u.stats?.messagesByGroup?.[chatKey] || 0;
    if (msgs > 0 && u.id !== botJid) {
      activityMap[u.id || u.jid] = {
        jid: u.id || u.jid,
        name: u.name || 'Sin Nombre',
        count: msgs
      };
    }
  });

  return { participants, activityMap, botJid };
}

export default new ZenCommand('actividad')
  .addAlias('activos', 'activity', 'rank', 'inactivos', 'inactive', 'nulos')
  .setCooldown(5)
  .setCategory('group')
  .requireGroup()
  .setUsage('[reset|límite <número>]')
  .onExecute(async (ctx) => {
    await ctx.react('📊');
    const sub = ctx.args[0]?.toLowerCase();
    const command = ctx.commandName.toLowerCase();

    const data = await getActivityData(ctx);
    if (!data) return ctx.reply(`『 ⚠️ 』 *ERROR DE CARGA*\n\n> No pude cargar los datos del grupo 😵`);
    
    const { participants, activityMap, botJid } = data;

    if (sub === 'reset') {
      const isAdmin = await ctx.isSenderAdmin();
      if (!isAdmin) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *ACCESO DENEGADO*\n\n> Para hacer esto necesitás ser admin 🫢`);
      }

      const keyField = `stats.messagesByGroup.${ctx.chat.replace(/\./g, '_')}`;
      await UserModel.updateMany({}, { $unset: { [keyField]: '' } });

      await ctx.react('♻️');
      return ctx.reply(`『 ♻️ 』 *CONTADOR RESTABLECIDO*\n\n> El registro de actividad del grupo fue reiniciado 😉`);
    }

    if (command === 'activos' || command === 'activity' || command === 'rank') {
      const activityList = Object.values(activityMap).sort((a, b) => b.count - a.count).slice(0, 20);

      if (!activityList.length) {
        return ctx.reply(
          `『 📊 』 *SIN ACTIVIDAD*\n\n` +
          `> No hay actividad registrada en este grupo aún 😕`
        );
      }

      const totalMsgs = Object.values(activityMap).reduce((acc, curr) => acc + curr.count, 0);

      let txt = `『 📊 』 *MIEMBROS ACTIVOS*\n\n`;
      txt += `✦ *Total mensajes:* ${totalMsgs}\n`;
      txt += `✦ *Miembros activos:* ${Object.keys(activityMap).length}\n\n`;

      const mentions = [];
      activityList.forEach((u, i) => {
        const medal = MEDALS[i] || `${i + 1}.`;
        const level = getLevel(u.count);
        const num = cleanNumber(u.jid);
        mentions.push(u.jid);
        txt += `  ${medal} *${u.name}*\n`;
        txt += `     @${num}  ·  ${u.count} msgs  ${level}\n\n`;
      });

      const avg = Math.round(totalMsgs / Object.keys(activityMap).length);
      txt += `✦ *ESTADÍSTICAS*\n`;
      txt += `  • Total: ${totalMsgs} mensajes\n`;
      txt += `  • Activos: ${Object.keys(activityMap).length} miembros\n`;
      txt += `  • Promedio: ${avg} msgs por miembro\n`;
      txt += `  • Líder: ${activityList[0]?.name || 'N/A'} (${activityList[0]?.count || 0} msgs)`;

      return ctx.reply(txt, { mentions });
    }

    if (command === 'inactivos' || command === 'inactive' || command === 'nulos') {
      const limitArg = parseInt(ctx.args[0], 10);
      const threshold = !isNaN(limitArg) && limitArg >= 0 ? limitArg : 0;

      const inactivos = participants
        .filter(p => {
          if (p.id === botJid) return false;
          const userData = activityMap[p.id];
          const msgs = userData ? userData.count : 0;
          return msgs <= threshold;
        })
        .map(p => {
          const userData = activityMap[p.id];
          return { 
            jid: p.id, 
            count: userData ? userData.count : 0,
            name: userData?.name || p.pushName || 'Sin Nombre'
          };
        })
        .sort((a, b) => a.count - b.count)
        .slice(0, 20);

      if (!inactivos.length) {
        return ctx.reply(
          `『 ✅ 』 *SIN INACTIVOS*\n\n` +
          `> No encontré miembros con menos de *${threshold}* mensajes 🤔`
        );
      }

      let txt = `『 💤 』 *MIEMBROS INACTIVOS*\n\n`;
      txt += `✦ *Umbral:* ${threshold} mensajes\n`;
      txt += `✦ *Encontrados:* ${inactivos.length} miembros\n\n`;

      const mentions = [];
      inactivos.forEach((p, i) => {
        const num = cleanNumber(p.jid);
        mentions.push(p.jid);
        txt += `  ${i + 1}. ${p.name}\n`;
        txt += `     @${num}  ·  ${p.count} msgs  ${getLevel(p.count)}\n\n`;
      });

      return ctx.reply(txt, { mentions });
    }

    const activityList = Object.values(activityMap).sort((a, b) => b.count - a.count).slice(0, 10);

    if (!activityList.length) {
      return ctx.reply(
        `『 📊 』 *SIN ACTIVIDAD*\n\n` +
        `> No hay actividad registrada en este grupo aún 😕`
      );
    }

    const totalMsgs = Object.values(activityMap).reduce((acc, curr) => acc + curr.count, 0);
    const totalInactivos = participants.filter(p => {
      if (p.id === botJid) return false;
      const userData = activityMap[p.id];
      return !userData || userData.count === 0;
    }).length;

    let txt = `『 📊 』 *RESUMEN DE ACTIVIDAD*\n\n`;
    txt += `✦ *Total mensajes:* ${totalMsgs}\n`;
    txt += `✦ *Miembros totales:* ${participants.length}\n`;
    txt += `✦ *Activos:* ${Object.keys(activityMap).length} miembros\n`;
    txt += `✦ *Inactivos (0 msgs):* ${totalInactivos} miembros\n\n`;
    txt += `🏆 *Top 10 activos:*\n\n`;

    const mentions = [];
    activityList.forEach((u, i) => {
      const medal = MEDALS[i] || `${i + 1}.`;
      const num = cleanNumber(u.jid);
      mentions.push(u.jid);
      txt += `  ${medal} *${u.name}*\n`;
      txt += `     @${num}  ·  ${u.count} msgs\n\n`;
    });

    txt += `💡 *Comandos:*\n`;
    txt += `  • ${ZenConfig.prefix}${ctx.commandName}  ➜ Ranking completo\n`;
    txt += `  • ${ZenConfig.prefix}inactivos [umbral] ➜ Ver inactivos\n`;
    txt += `  • ${ZenConfig.prefix}${ctx.commandName} reset ➜ Reiniciar contador (admin)`;

    return ctx.reply(txt, { mentions });
  });