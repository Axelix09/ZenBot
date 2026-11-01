import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

const MAX_CACHE = 800;
const CACHE_TTL_MS = 600000;
const antideleteCache = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, item] of antideleteCache.entries()) {
    if (now - item.timestamp > CACHE_TTL_MS) {
      antideleteCache.delete(key);
    }
  }
}, 120000).unref?.();

const cacheSet = (jid, id, data) => {
  const key = `${jid}-${id}`;
  antideleteCache.set(key, { ...data, timestamp: Date.now() });
  if (antideleteCache.size > MAX_CACHE) {
    antideleteCache.delete(antideleteCache.keys().next().value);
  }
};

const cacheGet = (jid, id) => antideleteCache.get(`${jid}-${id}`);
const cacheDel = (jid, id) => antideleteCache.delete(`${jid}-${id}`);

export default new ZenCommand('antidelete')
  .addAlias('antidel')
  .setCooldown(3)
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .setUsage('on|off')
  .onExecute(async (ctx) => {
    const [modo] = ctx.args;
    const group = await ctx.getGroup();

    if (!modo || !['on', 'activar', 'off', 'desactivar'].includes(modo.toLowerCase())) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *MODO INVÁLIDO*\n\n> Uy, algo no cuadra 🤨\n\n` +
        `✦ *Opciones:*\n` +
        `  • ${ZenConfig.prefix}${ctx.commandName} on / activar\n` +
        `  • ${ZenConfig.prefix}${ctx.commandName} off / desactivar`
      );
    }

    const activar = ['on', 'activar'].includes(modo.toLowerCase());
    group.antidelete = activar;
    await group.save();

    await ctx.react('🗑️');
    return ctx.reply(
      `『 🗑️ 』 *ANTI-DELETE ${activar ? 'ACTIVADO' : 'DESACTIVADO'}*\n\n` +
      `> Los mensajes eliminados serán ${activar ? 'recuperados y mostrados' : 'ignorados'} en este grupo 🥳`
    );
  });

export const antiDeleteListener = {
  async before(msg, sock, ctx) {
    if (!ctx.isGroup) return;
    const groupDb = await ctx.getGroup();
    if (!groupDb) return;

    const mtype = msg.message ? Object.keys(msg.message)[0] : '';
    const isProtocol = mtype === 'protocolMessage';
    const isSenderKey = mtype === 'senderKeyDistributionMessage';

    if (msg.message && !isProtocol && !isSenderKey && !msg.key.fromMe) {
      cacheSet(ctx.chat, msg.key.id, {
        sender: ctx.sender,
        fromMe: msg.key.fromMe,
        waMsg: { key: msg.key, message: msg.message }
      });
    }

    if (isProtocol && msg.message.protocolMessage?.type === 0) {
      const deletedKey = msg.message.protocolMessage.key;
      if (deletedKey && groupDb.antidelete) {
        const delJid = deletedKey.remoteJid || ctx.chat;
        const delId = deletedKey.id;
        const cached = cacheGet(delJid, delId);

        if (cached && !cached.fromMe) {
          const senderNum = cached.sender.split('@')[0];
          try {
            await sock.sendMessage(ctx.chat, {
              text: `『 🗑️ 』 *MENSAJE ELIMINADO*\n\n> @${senderNum} eliminó el siguiente mensaje:`,
              mentions: [cached.sender]
            });
            await sock.sendMessage(ctx.chat, { forward: cached.waMsg });
          } catch {}
          cacheDel(delJid, delId);
        }
      }
    }
  }
};