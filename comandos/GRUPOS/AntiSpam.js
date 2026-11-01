import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

const SPAM_CONFIG = {
  maxMessages: 5,
  timeWindow: 5000,
  warnLimit: 3,
  muteDuration: 300000,
  resetTime: 60000
};

const userSpamTracker = new Map();
const warnedUsers = new Map();
const mutedUsers = new Map();

function getTimeWindow() {
  return Date.now() - SPAM_CONFIG.timeWindow;
}

function cleanOldEntries() {
  const cutoff = Date.now() - SPAM_CONFIG.resetTime;
  for (const [key, data] of userSpamTracker) {
    if (data.lastReset < cutoff) {
      userSpamTracker.delete(key);
    }
  }
}

function getUserSpamData(jid) {
  const key = jid;
  if (!userSpamTracker.has(key)) {
    userSpamTracker.set(key, {
      messages: [],
      lastReset: Date.now(),
      warnings: 0,
      muted: false
    });
  }
  return userSpamTracker.get(key);
}

function isSpamming(jid) {
  const data = getUserSpamData(jid);
  const now = Date.now();
  
  data.messages = data.messages.filter(t => t > getTimeWindow());
  data.messages.push(now);
  
  if (data.messages.length > SPAM_CONFIG.maxMessages) {
    data.warnings++;
    return true;
  }
  
  return false;
}

function isMuted(jid) {
  const data = mutedUsers.get(jid);
  if (!data) return false;
  if (Date.now() > data.until) {
    mutedUsers.delete(jid);
    return false;
  }
  return true;
}

function muteUser(jid, duration = SPAM_CONFIG.muteDuration) {
  mutedUsers.set(jid, {
    until: Date.now() + duration,
    reason: 'Spam detectado'
  });
}

function getWarnCount(jid) {
  const data = userSpamTracker.get(jid);
  return data ? data.warnings : 0;
}

function resetWarnings(jid) {
  const data = userSpamTracker.get(jid);
  if (data) {
    data.warnings = 0;
    data.messages = [];
    data.lastReset = Date.now();
  }
}

export default new ZenCommand('antispam')
  .addAlias('spam', 'spamfilter')
  .setCooldown(3)
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .setUsage('on|off|config')
  .onExecute(async (ctx) => {
    const [subcmd] = ctx.args;
    const group = await ctx.getGroup();

    if (!subcmd) {
      const estado = group.antispam ? '✅ Activado' : '❌ Desactivado';
      const config = group.antispam_config || SPAM_CONFIG;
      
      return ctx.reply(
        `『 🛡️ 』 *SISTEMA ANTI-SPAM*\n\n` +
        `✦ *Estado:* ${estado}\n` +
        `✦ *Mensajes máximos:* ${config.maxMessages || SPAM_CONFIG.maxMessages} en ${(config.timeWindow || SPAM_CONFIG.timeWindow) / 1000}s\n` +
        `✦ *Advertencias límite:* ${config.warnLimit || SPAM_CONFIG.warnLimit}\n` +
        `✦ *Silencio:* ${(config.muteDuration || SPAM_CONFIG.muteDuration) / 60000} min\n\n` +
        `✦ *Comandos:*\n` +
        `  • ${ZenConfig.prefix}${ctx.commandName} on ➜ Activar\n` +
        `  • ${ZenConfig.prefix}${ctx.commandName} off ➜ Desactivar\n` +
        `  • ${ZenConfig.prefix}${ctx.commandName} config [mensajes] [segundos] [advertencias] [minutos] ➜ Configurar\n` +
        `  • ${ZenConfig.prefix}${ctx.commandName} reset ➜ Reiniciar advertencias\n` +
        `  • ${ZenConfig.prefix}${ctx.commandName} unmute @usuario ➜ Des-silenciar manualmente`
      );
    }

    const sub = subcmd.toLowerCase();

    if (sub === 'on' || sub === 'activar') {
      if (!group.antispam_config) {
        group.antispam_config = { ...SPAM_CONFIG };
      }
      group.antispam = true;
      if (typeof group.markModified === 'function') {
        group.markModified('antispam_config');
      }
      await group.save();
      await ctx.react('✅');
      return ctx.reply(
        `『 ✅ 』 *ANTI-SPAM ACTIVADO*\n\n` +
        `> El sistema de protección contra spam está activo 🤩\n` +
        `> Los usuarios que excedan el límite serán advertidos y silenciados.`
      );
    }

    if (sub === 'off' || sub === 'desactivar') {
      group.antispam = false;
      await group.save();
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ANTI-SPAM DESACTIVADO*\n\n` +
        `> El sistema de protección contra spam fue desactivado 🥳`
      );
    }

    if (sub === 'reset') {
      const targetJid = ctx.mentions?.[0] || ctx.sender;
      resetWarnings(targetJid);
      mutedUsers.delete(targetJid);
      await ctx.react('♻️');
      return ctx.reply(
        `『 ♻️ 』 *ADVERTENCIAS REINICIADAS*\n\n` +
        `> @${targetJid.split('@')[0]} fue restablecido 😄\n` +
        `> Todas sus advertencias y silencios fueron eliminados.`,
        { mentions: [targetJid] }
      );
    }

    if (sub === 'unmute') {
      const targetJid = ctx.mentions?.[0];
      if (!targetJid) {
        return ctx.reply(
          `『 ⚠️ 』 *USUARIO REQUERIDO*\n\n` +
          `> Mencioná al usuario que deseas des-silenciar 🤔\n` +
          `> Ejemplo: *${ZenConfig.prefix}${ctx.commandName} unmute @usuario*`
        );
      }
      
      mutedUsers.delete(targetJid);
      resetWarnings(targetJid);
      await ctx.react('🔊');
      return ctx.reply(
        `『 🔊 』 *USUARIO DES-SILENCIADO*\n\n` +
        `> @${targetJid.split('@')[0]} ya puede enviar mensajes nuevamente 😄`,
        { mentions: [targetJid] }
      );
    }

    if (sub === 'config') {
      const isAdmin = await ctx.isSenderAdmin();
      if (!isAdmin) {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *ACCESO DENEGADO*\n\n` +
          `> Para hacer esto necesitás ser admin 😬`
        );
      }

      const maxMsgs = parseInt(ctx.args[1], 10);
      const timeSecs = parseInt(ctx.args[2], 10);
      const warnLim = parseInt(ctx.args[3], 10);
      const muteMins = parseInt(ctx.args[4], 10);

      if (!group.antispam_config) {
        group.antispam_config = { ...SPAM_CONFIG };
      }

      if (maxMsgs > 0 && maxMsgs <= 20) {
        group.antispam_config.maxMessages = maxMsgs;
      }
      if (timeSecs > 0 && timeSecs <= 60) {
        group.antispam_config.timeWindow = timeSecs * 1000;
      }
      if (warnLim > 0 && warnLim <= 10) {
        group.antispam_config.warnLimit = warnLim;
      }
      if (muteMins > 0 && muteMins <= 60) {
        group.antispam_config.muteDuration = muteMins * 60000;
      }

      if (typeof group.markModified === 'function') {
        group.markModified('antispam_config');
      }
      await group.save();
      await ctx.react('⚙️');

      const config = group.antispam_config;
      return ctx.reply(
        `『 ⚙️ 』 *CONFIGURACIÓN ACTUALIZADA*\n\n> ¡Qué crack! 🥳\n\n` +
        `✦ *Mensajes máximos:* ${config.maxMessages}\n` +
        `✦ *Ventana de tiempo:* ${config.timeWindow / 1000}s\n` +
        `✦ *Límite de advertencias:* ${config.warnLimit}\n` +
        `✦ *Duración del silencio:* ${config.muteDuration / 60000} min`
      );
    }

    return ctx.reply(
      `『 ⚠️ 』 *SUBCOMANDO INVÁLIDO*\n\n> Creo que te faltó algo 🤔\n\n` +
      `✦ *Opciones:*\n` +
      `  • ${ZenConfig.prefix}${ctx.commandName} on ➜ Activar\n` +
      `  • ${ZenConfig.prefix}${ctx.commandName} off ➜ Desactivar\n` +
      `  • ${ZenConfig.prefix}${ctx.commandName} config [mensajes] [segundos] [advertencias] [minutos] ➜ Configurar\n` +
      `  • ${ZenConfig.prefix}${ctx.commandName} reset ➜ Reiniciar advertencias\n` +
      `  • ${ZenConfig.prefix}${ctx.commandName} unmute @usuario ➜ Des-silenciar manualmente`
    );
  });

export const antiSpamListener = {
  async before(msg, sock, ctx) {
    if (!ctx.isGroup) return;
    if (ctx.rawMsg.key.fromMe) return;

    const groupDb = await ctx.getGroup();
    if (!groupDb || !groupDb.antispam) return;

    const ownerJids = ZenConfig.ownerNumbers.map(n => n.replace(/[^0-9]/g, '') + '@s.whatsapp.net');
    const isOwner = ownerJids.includes(ctx.sender);
    const isAdmin = await ctx.isSenderAdmin();
    if (isAdmin || isOwner) return;

    if (isMuted(ctx.sender)) {
      try {
        await sock.sendMessage(ctx.chat, { delete: ctx.rawMsg.key });
        return;
      } catch {}
    }

    const config = groupDb.antispam_config || SPAM_CONFIG;
    const maxMessages = config.maxMessages || SPAM_CONFIG.maxMessages;
    const warnLimit = config.warnLimit || SPAM_CONFIG.warnLimit;
    const muteDuration = config.muteDuration || SPAM_CONFIG.muteDuration;

    if (isSpamming(ctx.sender)) {
      const warnCount = getWarnCount(ctx.sender);
      
      try {
        await sock.sendMessage(ctx.chat, { delete: ctx.rawMsg.key });
      } catch {}

      if (warnCount >= warnLimit) {
        muteUser(ctx.sender, muteDuration);
        const muteMins = Math.floor(muteDuration / 60000);
        const muteSeconds = Math.floor((muteDuration % 60000) / 1000);
        const timeText = muteMins > 0 ? `${muteMins} min` : `${muteSeconds}s`;
        
        try {
          await sock.sendMessage(ctx.chat, {
            text: `『 🚫 』 *USUARIO SILENCIADO POR SPAM*\n\n` +
                  `> @${ctx.sender.split('@')[0]} fue silenciado automáticamente 😌\n` +
                  `> *Motivo:* Exceso de mensajes (${warnLimit} advertencias)\n` +
                  `> *Duración:* ${timeText}\n\n` +
                  `> _Para des-silenciar manualmente: ${ZenConfig.prefix}${ctx.commandName} unmute @usuario_`,
            mentions: [ctx.sender]
          });
        } catch {}
      } else {
        const remaining = warnLimit - warnCount;
        try {
          await sock.sendMessage(ctx.chat, {
            text: `『 ⚠️ 』 *SPAM DETECTADO*\n\n` +
                  `> @${ctx.sender.split('@')[0]}, enviaste demasiados mensajes 😌\n` +
                  `> *Advertencia:* ${warnCount} / ${warnLimit}\n` +
                  `> *Restantes antes del silencio:* ${remaining}\n\n` +
                  `> _Por favor, reduce la frecuencia de tus mensajes._`,
            mentions: [ctx.sender]
          });
        } catch {}
      }
    }

    cleanOldEntries();
  }
};