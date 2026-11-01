import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

export const cmdMatchBorrar = new ZenCommand('matchborrar')
  .addAlias('matchpausa', 'matchsalir')
  .setCategory('Social')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const zm = user.zenmatch || {};

    if (!zm.active) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 Todavía no tenés cuenta activa en ZenMatch 🥲`);
    }

    zm.active = false;
    if (typeof user.markModified === 'function') user.markModified('zenmatch');
    await user.save();

    await ctx.react('🛑');
    return ctx.reply(
      `『 🛑 』 *PERFIL DE ZENMATCH DESACTIVADO*\n\n` +
      `> Tu perfil fue ocultado y ya no aparecerás en la sección de Explorar 😎\n` +
      `> Podés reactivarlo en cualquier momento usando *${ZenConfig.prefix}matchcrear*.`
    );
  });

export const cmdMatchMisMatches = new ZenCommand('matchmismatches')
  .addAlias('mismatches', 'misconexiones')
  .setCategory('Social')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const zm = user.zenmatch || {};
    const matches = zm.matches || [];

    if (!zm.active) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 Primero tenés que crear tu cuenta en ZenMatch 😉`);
    }

    if (matches.length === 0) {
      await ctx.react('🔥');
      return ctx.reply(
        `『 🔥 』 *SIN MATCHES AÚN*\n\n` +
        `> Aún no conectaste con nadie 😕\n` +
        `> ¡Sigue explorando perfiles con *${ZenConfig.prefix}match explorar*!`
      );
    }

    let text = `『 🔥 』 *TUS MATCHES GUARDADOS (${matches.length})*\n\n> ¡Qué crack! 🥳\n\n`;

    for (let i = 0; i < matches.length; i++) {
      const matchJid = matches[i];
      const matchUser = await ctx.getUserById(matchJid);
      if (matchUser && matchUser.zenmatch) {
        const mzm = matchUser.zenmatch;
        const num = matchJid.split('@')[0];
        text += `✦ *${i + 1}. ${mzm.name}* (${mzm.age} años) ${mzm.verified ? '✔️' : ''}\n`;
        text += `  • País: ${mzm.nationality || '—'}\n`;
        text += `  • Chat: https://wa.me/${num}\n\n`;
      }
    }

    await ctx.react('🔥');
    return ctx.reply(text);
  });
