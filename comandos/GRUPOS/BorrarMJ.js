import { ZenCommand } from '../../lib/core/factory.js';

export default new ZenCommand('del')
  .addAlias('delete', 'borrar')
  .setCooldown(1)
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .requireBotAdmin()
  .setUsage('(responder al mensaje)')
  .onExecute(async (ctx) => {
    if (!ctx.rawMsg.message?.extendedTextMessage?.contextInfo?.stanzaId) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *RESPONDE AL MENSAJE*\n\n` +
        `> Respondé al mensaje que deseas eliminar 🙂`
      );
    }

    try {
      await ctx.sock.sendMessage(ctx.chat, {
        delete: {
          remoteJid: ctx.chat,
          fromMe: false,
          id: ctx.rawMsg.message.extendedTextMessage.contextInfo.stanzaId,
          participant: ctx.quotedParticipant
        }
      });
    } catch {
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *ERROR AL ELIMINAR*\n\n> No pude eliminar el mensaje 😭`);
    }
  });