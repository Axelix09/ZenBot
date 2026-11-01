import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CommandContext } from './lib/core/context.js';
import { ZenConfig } from './zen.config.js';
import { Dialogues, sendAlert } from './lib/messaging/dialogues.js';
import { getButtonReply } from './lib/messaging/interactions.js';
import { STREAK_ACTIVATION_DAYS } from './lib/database/userCore.js';
import { PermissionLevel } from './lib/core/permissions.js';
import { checkTitles, getTitleById } from './lib/game/titles.js';
import { notifListener } from './lib/messaging/notif-listener.js';
import { checkSpam, SPAM_LIMIT } from './lib/runtime/antispam-bot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QUIET_COOLDOWN_MAX_SECONDS = 30;
const HEAVY_CATEGORIES = new Set(['descargas', 'nsfw', 'convertidores', 'ia', 'busquedas', 'imagenes', 'tools', 'anime']);
const memoryCooldowns = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, expiresAt] of memoryCooldowns.entries()) {
    if (now >= expiresAt) {
      memoryCooldowns.delete(key);
    }
  }
}, 60000).unref?.();

const extraerNum = (jid = '') => (typeof jid === 'string' ? jid : '').split('@')[0].split(':')[0].replace(/\D/g, '');

const normalizeCategory = (catName) => {
  const normalized = (catName || '').toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const manualMap = {
    'general': 'info',
    'economia': 'eco',
    'perfil': 'registro',
    'social': 'social',
    'owner': 'owner',
    'group': 'group'
  };
  return manualMap[normalized] || normalized;
};

const cleanCommandName = (cmdName) => {
  return (cmdName || '')
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

class ZenSoul {
  constructor() {
    this.commands = new Map();
    this.aliases = new Map();
    this.queues = new Map();
    this.listeners = [];
    this.groupListeners = [];
  }

  async loadCommands(dir = path.join(__dirname, 'comandos')) {
    await this.scanDirectory(dir);
    this.groupListeners.push(notifListener.groupEvent);
    this.listeners = [...new Set(this.listeners)];
    this.groupListeners = [...new Set(this.groupListeners)];
  }

  async scanDirectory(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        if (item.name === 'dev' && !ZenConfig.devMode) {
          continue;
        }
        await this.scanDirectory(fullPath);
      } else if (item.isFile() && item.name.endsWith('.js')) {
        try {
          const fileUrl = `file://${fullPath}`;
          const module = await import(fileUrl);

          const registerCmd = (cmd) => {
            if (!cmd || !cmd.name || typeof cmd.handler !== 'function') return;

            this.commands.set(cmd.name, cmd);

            if (cmd.aliases) {
              cmd.aliases.forEach(alias => {
                this.aliases.set(alias, cmd.name);
              });
            }
          };

          registerCmd(module.default);
          Object.values(module).forEach(exp => {
            if (exp !== module.default) registerCmd(exp);
          });

          Object.keys(module).forEach(key => {
            const exp = module[key];
            if (exp && typeof exp.before === 'function') {
              this.listeners.push(exp.before);
            }
            if (exp && typeof exp.groupEvent === 'function') {
              this.groupListeners.push(exp.groupEvent);
            }
          });
        } catch (error) {
          console.error(error);
        }
      }
    }
  }

  async handleGroupEvent(sock, event) {
    let ctx;
    try {
      const author = event.author || event.participants?.[0]?.id;
      ctx = new CommandContext(sock, {
        key: {
          remoteJid: event.chat,
          participant: author,
          participantAlt: event.authorAlt,
          fromMe: false,
          id: `group-event-${Date.now()}`
        },
        message: {}
      }, [], '');
    } catch (error) {
      console.error('[group-event] Contexto inválido:', error);
      return;
    }

    for (const listener of this.groupListeners) {
      try {
        await listener(event, sock, ctx);
      } catch (error) {
        console.error('[group-event listener error]', error);
      }
    }
  }

  async handleMessage(sock, msg) {
    const ctx = new CommandContext(sock, msg, [], '');

    for (const listener of this.listeners) {
      try {
        await listener(msg, sock, ctx);
      } catch (e) {
        console.error('[listener error]', e);
      }
    }

    const btn = getButtonReply(msg);
    let parsed = null;
    try {
      parsed = sock.parseMessage(msg);
    } catch {}
    let body = parsed?.text || '';

    if (btn) {
      body = btn.id || btn.selectedRowId || btn.selectedId || btn.display_text || '';
      if (!body) {
        const interactive = msg.message?.interactiveResponseMessage;
        if (interactive) {
          body = interactive.selectedRowId || interactive.selectedId || interactive.selectedDisplayText || '';
        }
      }
    }

    if (!body || !body.startsWith(ZenConfig.prefix)) return;

    const ownerJids = ZenConfig.ownerNumbers.map(
      (num) => num.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
    );
    const isOwner = ownerJids.includes(ctx.sender);

    const spamCheck = checkSpam(ctx.sender);
    if (!isOwner) {
      if (!spamCheck.allowed) {
        const minutes = Math.floor(spamCheck.remaining / 60);
        const seconds = spamCheck.remaining % 60;
        const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
        await ctx.reply(
          `『 🚫 』 *SILENCIADO POR SPAM*\n\n` +
          `> Te silencié por mandar demasiados comandos seguidos 😤\n` +
          `> *Tiempo restante:* ${timeStr} 😴`
        );
        return;
      }
      if (spamCheck.warn) {
        await ctx.reply(
          `『 ⚠️ 』 *SPAM DETECTADO*\n\n` +
          `> Mandaste *${spamCheck.count}* comandos en menos de 1 minuto 😅\n` +
          `> El límite es *${SPAM_LIMIT}* comandos por minuto.\n` +
          `> Si seguís así, te silencio automáticamente 😬`
        );
      }
    }

    const parts = body.slice(ZenConfig.prefix.length).trim().split(/ +/);
    const rawCommandName = parts.shift();
    const commandName = cleanCommandName(rawCommandName);
    const args = parts;

    const actualName = this.aliases.get(commandName) || commandName;
    const command = this.commands.get(actualName);

    if (!command) return;

    ctx.args = args;
    ctx.commandName = commandName;

    const userDb = await ctx.getUser();

    if (ctx.isGroup) {
      const groupDb = await ctx.getGroup();
      if (groupDb) {
        if (groupDb.onlyadmin) {
          const senderIsAdmin = await ctx.isSenderAdmin();
          if (!senderIsAdmin && !isOwner) return;
        }

        const bypass = ['disable', 'enable', 'activar', 'desactivar', 'menu', 'help', 'comandos'];
        if (!bypass.includes(command.name)) {
          const cmdCat = normalizeCategory(command.categoryName);
          const isCmdDisabled = groupDb.disabledCmds?.includes(command.name);
          const isCatDisabled = groupDb.disabledCategories?.includes(cmdCat);

          if (isCmdDisabled || isCatDisabled) {
            return;
          }
        }
      }
    }

    if (command.isNsfw) {
      if (!ZenConfig.nsfwEnabled) {
        await ctx.react('⚠️');
        return sendAlert(ctx, Dialogues.error('El contenido +18 está apagado en todo el bot 🙈'));
      }
      if (ctx.isGroup) {
        const groupDb = await ctx.getGroup();
        if (!groupDb?.nsfw) {
          await ctx.react('⚠️');
          return sendAlert(ctx, Dialogues.nsfwDisabled());
        }
      } else {
        await ctx.react('⚠️');
        return sendAlert(ctx, Dialogues.onlyGroup());
      }
      if (!userDb.registered) {
        await ctx.react('⚠️');
        return sendAlert(ctx, Dialogues.notRegistered(commandName));
      }
      if (!userDb.age || userDb.age < 18) {
        await ctx.react('🔞');
        return sendAlert(ctx, Dialogues.underageNsfw());
      }
    }

    if (command.groupOnly && !ctx.isGroup) {
      await ctx.react('⚠️');
      return sendAlert(ctx, Dialogues.onlyGroup());
    }

    if (command.privateOnly && ctx.isGroup) {
      await ctx.react('⚠️');
      return sendAlert(ctx, Dialogues.onlyPrivate());
    }

    if (command.permissionLevel === PermissionLevel.OWNER) {
      if (!isOwner) {
        await ctx.react('⚠️');
        return sendAlert(ctx, Dialogues.onlyOwner());
      }
    }

    if ((command.adminOnly || command.permissionLevel === PermissionLevel.ADMIN) && ctx.isGroup) {
      const senderIsAdmin = await ctx.isSenderAdmin();
      if (!senderIsAdmin && !isOwner) {
        await ctx.react('⚠️');
        return sendAlert(ctx, Dialogues.onlyAdmin());
      }
    }

    if (command.needsBotAdmin && ctx.isGroup) {
      const botIsAdmin = await ctx.isBotAdmin();
      if (!botIsAdmin) {
        await ctx.react('⚠️');
        return sendAlert(ctx, Dialogues.needBotAdmin());
      }
    }

    const isHeavy = HEAVY_CATEGORIES.has(normalizeCategory(command.categoryName));

    let lockKeys;
    if (isHeavy) {
      lockKeys = [ctx.sender];
    } else {
      const [resolvedMentionTarget, implicitTargets] = await Promise.all([
        ctx.resolveMentionTarget().catch(() => null),
        ctx.getImplicitRelationTargets().catch(() => [])
      ]);
      lockKeys = Array.from(new Set([
        ctx.sender,
        ...(ctx.mentions || []),
        ...(resolvedMentionTarget ? [resolvedMentionTarget] : []),
        ...implicitTargets
      ]));
    }
    const previousList = lockKeys.map(k => this.queues.get(k) || Promise.resolve());
    const task = Promise.all(previousList.map(p => p.catch(() => {})))
      .then(() => this.executeCommand(command, ctx, commandName, msg));

    lockKeys.forEach(k => this.queues.set(k, task));
    task.finally(() => {
      lockKeys.forEach(k => {
        if (this.queues.get(k) === task) this.queues.delete(k);
      });
    });

    await task;
  }

  async executeCommand(command, ctx, commandName, msg) {
    try {
      const time = new Date().toLocaleTimeString('es-ES', { hour12: false });
      const chatType = ctx.isGroup ? 'grupo' : 'privado';
      const number = extraerNum(ctx.sender);
      const username = msg.pushName || 'sin nombre';

      const c = {
        reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
        cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
        magenta: '\x1b[35m', blue: '\x1b[34m'
      };
      const tag = chatType === 'grupo' ? `${c.blue}grupo${c.reset}` : `${c.magenta}privado${c.reset}`;

      console.log(
        `${c.dim}[${time}]${c.reset} ` +
        `${c.green}.${command.name}${c.reset} ` +
        `${c.dim}—${c.reset} ${c.bold}${c.cyan}${username}${c.reset} ` +
        `${c.dim}(${c.yellow}${number}${c.dim})${c.reset} ` +
        `${c.dim}—${c.reset} ${tag}`
      );

      const userDb = await ctx.getUser();

      if (command.needsRegistration && !userDb.registered) {
        await ctx.react('⚠️');
        return sendAlert(ctx, Dialogues.notRegistered(commandName));
      }

      if (command.cooldownSeconds > 0) {
        const cooldownKey = `${ctx.sender}:${command.name}`;
        const now = Date.now();
        const expirationTime = memoryCooldowns.get(cooldownKey) || 0;

        if (now < expirationTime) {
          if (command.cooldownSeconds <= QUIET_COOLDOWN_MAX_SECONDS) {
            await ctx.react('⏳').catch(() => {});
            return;
          }
          const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
          await sendAlert(ctx, Dialogues.cooldown(timeLeft));
          return;
        }

        memoryCooldowns.set(cooldownKey, now + (command.cooldownSeconds * 1000));
      }

      let streakMsg = null;
      if (userDb.registered) {
        const ahora = Date.now();
        const hoy = new Date().setHours(0, 0, 0, 0);
        const ultima = userDb.lastActivity ? new Date(userDb.lastActivity).setHours(0, 0, 0, 0) : null;
        const ayer = hoy - 86400000;

        if (ultima !== hoy) {
          const continuesStreak = ultima === ayer;
          userDb.streak = continuesStreak ? (Number(userDb.streak) || 0) + 1 : 1;
          if (userDb.streak > userDb.maxStreak) userDb.maxStreak = userDb.streak;
          userDb.lastActivity = ahora;

          const bonus = Math.floor(userDb.streak * 10);
          userDb.zencoins += bonus;

          if (userDb.streak === 1) {
            streakMsg = `✨ ¡Arrancaste una racha nueva! 😄\n✧ Día 1/${STREAK_ACTIVATION_DAYS} para activarla\n✧ +${bonus} ${ZenConfig.currencies.zencoins.name} ${ZenConfig.currencies.zencoins.emoji}`;
          } else if (userDb.streak < STREAK_ACTIVATION_DAYS) {
            streakMsg = `✨ Día ${userDb.streak}/${STREAK_ACTIVATION_DAYS} para activar tu racha, ¡seguí así! 😎\n✧ +${bonus} ${ZenConfig.currencies.zencoins.name} ${ZenConfig.currencies.zencoins.emoji}`;
          } else if (userDb.streak === STREAK_ACTIVATION_DAYS) {
            streakMsg = `🔥 *¡Racha activada!* ${userDb.streak} días seguidos 🥳\n✧ +${bonus} ${ZenConfig.currencies.zencoins.name} ${ZenConfig.currencies.zencoins.emoji}`;
          } else {
            streakMsg = `🔥 *Racha: ${userDb.streak} días* 😎\n✧ +${bonus} ${ZenConfig.currencies.zencoins.name} ${ZenConfig.currencies.zencoins.emoji} bonus`;
          }
        }
      }

      const xpGained = Math.floor(
        Math.random() * (ZenConfig.economy.xpMax - ZenConfig.economy.xpMin + 1)
      ) + ZenConfig.economy.xpMin;

      const levelUp = userDb.addXP(xpGained);

      if (!userDb.stats) userDb.stats = { dicesThrown: 0, actionsSent: 0, commandsUsed: 0 };
      userDb.stats.commandsUsed = (userDb.stats.commandsUsed || 0) + 1;

      await command.handler(ctx);

      const newTitles = checkTitles(userDb);
      if (newTitles.length > 0) {
        if (!userDb.titles) userDb.titles = [];
        let newTitleNames = [];
        for (const titleId of newTitles) {
          if (!userDb.titles.includes(titleId)) {
            userDb.titles.push(titleId);
            const title = getTitleById(titleId);
            if (title) newTitleNames.push(`${title.emoji} ${title.name}`);
          }
        }
        if (newTitleNames.length > 0) {
          if (typeof userDb.markModified === 'function') {
            userDb.markModified('titles');
          }
          ctx._newTitles = newTitleNames;
        }
      }

      if (userDb.registered) {
        try {
          await userDb.save();
        } catch (saveError) {
          console.error(`[error] fallo al guardar usuario ${ctx.sender} tras .${command.name}:`, saveError);
          await sendAlert(ctx, Dialogues.error('No pude guardar tu progreso 😢 Probá de nuevo.'));
          return;
        }
      }

      const extras = [];
      if (levelUp) {
        const showNotification = userDb.config?.levelNotifications !== false;
        if (showNotification) {
          extras.push(Dialogues.levelUp(ctx.sender, userDb.level, userDb.role));
        }
      }
      if (streakMsg) extras.push(streakMsg);
      if (ctx._newTitles && ctx._newTitles.length > 0) {
        extras.push(
          `🎉 *¡NUEVOS TÍTULOS DESBLOQUEADOS!* 🤩\n` +
          ctx._newTitles.map(t => `  ✧ ${t}`).join('\n') +
          `\n💡 Usá *+titulo equipar [id]* para equiparlos 😉`
        );
      }

      if (extras.length) {
        await ctx.reply(extras.join('\n\n'));
      }
    } catch (err) {
      console.error(`[error] .${command.name}:`, err);
      await sendAlert(ctx, Dialogues.error());
    }
  }
}

export const Soul = new ZenSoul();