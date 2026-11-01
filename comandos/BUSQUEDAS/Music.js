import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import fg from 'fg-senna';

export default new ZenCommand('genius')
  .addAlias('geniuslyrics', 'letragenius', 'lyrics', 'letracancion', 'songlyrics', 'letra', 'letras')
  .setCooldown(5)
  .setCategory('Busquedas')
  .requireRegistration()
  .setUsage('<canción>')
  .onExecute(async (ctx) => {
    const text = ctx.args.join(' ').trim();
    if (!text) {
      await ctx.react('🎵');
      return ctx.reply(
        `『 🎵 』 *BUSCADOR DE LETRAS*\n\n` +
        `✦ *Uso:* ${ZenConfig.prefix}genius [canción]\n` +
        `✦ *Ejemplo:* ${ZenConfig.prefix}genius bohemian rhapsody\n\n` +
        `> _Busca letras de canciones 😄_`
      );
    }

    await ctx.react('⏳');
    await ctx.reply(`『 ⏳ 』 *Buscando...*\n\n> Buscando la letra, aguantame 🎶`);

    try {
      let res = null;
      try {
        res = await fg.lyrics(text);
      } catch {}

      if (!res?.lyrics) {
        await ctx.react('❌');
        return ctx.reply(`『 ❌ 』 *SIN RESULTADOS*\n\n> No encontré la letra de *${text}* 😢 Revisá el nombre de la canción.`);
      }

      const letra = String(res.lyrics);
      const truncado = letra.length > 3000 ? letra.slice(0, 3000) + '\n\n... *(letra truncada)*' : letra;
      const caption =
        `『 🎵 』 *${res.title || text}*\n\n` +
        `✦ *Artista:* ${res.artist || '?'}\n\n` +
        `📖 *Letra:*\n${truncado}`;

      if (res.image) {
        try {
          const imgBuf = Buffer.from(await fetch(res.image).then(r => r.arrayBuffer()));
          await ctx.sock.sendMessage(ctx.chat, { image: imgBuf, caption }, { quoted: ctx.rawMsg });
        } catch {
          await ctx.reply(caption);
        }
      } else {
        await ctx.reply(caption);
      }
    } catch {
      await ctx.react('❌');
      await ctx.reply(`『 ❌ 』 *ERROR*\n\n> No pude buscar la letra ahora 😔 Probá de nuevo.`);
    }
  });
