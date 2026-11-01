import { performance } from 'perf_hooks';
import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { UserModel, getEngineName } from '../../lib/database/adapter.js';
import { Soul } from '../../soul.js';
import os from 'os';
import { renderHtmlCard } from '../../lib/cards/htmlCard.js';

const formatUptime = (uptimeSeconds) => {
  const days = Math.floor(uptimeSeconds / 86400);
  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = Math.floor(uptimeSeconds % 60);
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

const formatNumber = (n) => (n || 0).toLocaleString('es-AR');

const countJoinedGroups = async (sock) => {
  try {
    const joined = await sock.groups.all();
    return Object.keys(joined || {}).length;
  } catch {
    return null;
  }
};

function generatePingDashboard(latency, mem, uptime, totalUsers, totalGroups, totalCmds, engine, sys) {
  const latColor = latency < 150 ? '#22c55e' : latency < 400 ? '#eab308' : '#ef4444';
  const latNote = latency < 150 ? 'excelente' : latency < 400 ? 'aceptable' : 'alta';

  return renderHtmlCard({
    eyebrow: `${ZenConfig.botName} · ESTADO`,
    title: 'Telemetría del bot',
    subtitle: `Rendimiento en tiempo real y conectividad de ${ZenConfig.botName}`,
    accent: latColor,
    accent2: '#38bdf8',
    stats: [
      { label: 'Latencia real', value: `${latency} ms`, note: latNote },
      { label: 'Memoria heap', value: `${mem.heapUsed} MB`, note: `de ${mem.heapTotal} MB` },
      { label: 'Tiempo activo', value: uptime, note: 'sin reiniciar' },
      { label: 'Usuarios', value: totalUsers, note: 'registrados' }
    ],
    rows: [
      { label: 'Grupos conectados', value: totalGroups },
      { label: 'Comandos activos', value: String(totalCmds) },
      { label: 'Base de datos', value: engine },
      { label: 'Procesador', value: `${sys.cpus} ${sys.cpus === 1 ? 'núcleo' : 'núcleos'}` },
      { label: 'RAM libre', value: `${sys.freeMem} / ${sys.totalMem} GB` },
      { label: 'Node.js', value: process.version },
      { label: 'Plataforma', value: `${sys.platform} ${sys.arch}` },
      { label: 'Desarrollador', value: ZenConfig.ownerName }
    ],
    caption: `Usá ${ZenConfig.prefix}menu para ver los comandos 😉`
  });
}

export default new ZenCommand('ping')
  .addAlias('pulso', 'estado')
  .setCooldown(5)
  .setCategory('tools')
  .onExecute(async (ctx) => {
    const start = performance.now();
    await ctx.react('💠');
    const latencyMs = Math.round(performance.now() - start);

    const [users, groupCount] = await Promise.all([
      UserModel.find({ registered: true }).catch(() => []),
      countJoinedGroups(ctx.sock)
    ]);
    const groupsValue = groupCount === null ? 'No disponible' : formatNumber(groupCount);
    const used = process.memoryUsage();
    const mem = {
      rss: (used.rss / 1024 / 1024).toFixed(1),
      heapUsed: (used.heapUsed / 1024 / 1024).toFixed(1),
      heapTotal: (used.heapTotal / 1024 / 1024).toFixed(1)
    };

    const sys = {
      cpus: os.cpus().length,
      platform: os.platform(),
      arch: os.arch(),
      freeMem: (os.freemem() / 1024 / 1024 / 1024).toFixed(1),
      totalMem: (os.totalmem() / 1024 / 1024 / 1024).toFixed(1)
    };

    const uptimeStr = formatUptime(process.uptime());
    const dbEngine = getEngineName();

    const totalZencoins = users.reduce((sum, u) => sum + (u.zencoins || 0), 0);
    const totalKogen = users.reduce((sum, u) => sum + (u.kogen || 0), 0);
    const totalLux = users.reduce((sum, u) => sum + (u.lux || 0), 0);

    const caption = [
      `『 💠 』 *ESTADO DE ${ZenConfig.botName.toUpperCase()}*`,
      ``,
      `✦ *CONECTIVIDAD & LATENCIA*`,
      `  • Ping real : ⚡ ${latencyMs} ms`,
      `  • Uptime    : ⏱️ ${uptimeStr}`,
      `  • Versión   : ${ZenConfig.version || '10.0.0'}`,
      `  • Prefijo   : \` ${ZenConfig.prefix} \``,
      ``,
      `✦ *RENDIMIENTO DEL SERVIDOR*`,
      `  • Memoria Heap : ${mem.heapUsed} MB / ${mem.heapTotal} MB`,
      `  • Memoria RSS  : ${mem.rss} MB`,
      `  • RAM Sistema  : ${sys.freeMem} GB libres de ${sys.totalMem} GB`,
      `  • Procesador   : ${sys.cpus} núcleos (${sys.platform} ${sys.arch})`,
      `  • Node.js      : ${process.version}`,
      ``,
      `✦ *ESTADÍSTICAS GLOBALES*`,
      `  • Usuarios : 👥 ${formatNumber(users.length)} registrados`,
      `  • Grupos   : 🌐 ${groupCount === null ? 'No disponible' : `${groupsValue} conectados`}`,
      `  • Comandos : 📦 ${Soul.commands.size} activos`,
      `  • Motor DB : 💻 ${dbEngine}`,
      ``,
      `✦ *CIRCULACIÓN ECONÓMICA*`,
      `  • ${ZenConfig.currencies.zencoins.emoji} ${ZenConfig.currencies.zencoins.name} : ${formatNumber(totalZencoins)}`,
      `  • ${ZenConfig.currencies.kogen.emoji} ${ZenConfig.currencies.kogen.name}    : ${formatNumber(totalKogen)}`,
      `  • ${ZenConfig.currencies.lux.emoji} ${ZenConfig.currencies.lux.name}      : ${formatNumber(totalLux)}`
    ].join('\n');

    try {
      const dashboard = await generatePingDashboard(
        latencyMs,
        mem,
        uptimeStr,
        formatNumber(users.length),
        groupsValue,
        Soul.commands.size,
        dbEngine,
        sys
      );

      return ctx.sock.sendMessage(ctx.chat, {
        image: dashboard,
        caption
      }, { quoted: ctx.rawMsg });

    } catch {
      return ctx.reply(caption);
    }
  });