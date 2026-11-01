import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { sendAlbum } from '../../lib/messaging/album.js';

export default new ZenCommand('gif')
  .addAlias('buscargif', 'tenorgif')
  .setCooldown(5)
  .setCategory('Busquedas')
  .requireRegistration()
  .setUsage('<búsqueda>')
  .onExecute(async (ctx) => {
    const [text] = ctx.args;
    if (!text) {
      await ctx.react('🎬');
      return ctx.reply(
        `『 🎬 』 *BUSCADOR DE GIFs*\n\n` +
        `✦ *Uso:* ${ZenConfig.prefix}gif [búsqueda]\n` +
        `✦ *Ejemplo:* ${ZenConfig.prefix}gif funny\n\n` +
        `> _Busca GIFs en Tenor 😌_`
      );
    }

    await ctx.react('⏳');
    await ctx.reply(`『 ⏳ 』 *Buscando...*\n\n> Buscando GIFs bien buenos 😄`);

    try {
      const res = await fetch(`https://g.tenor.com/v1/search?q=${encodeURIComponent(text)}&key=LIVDSRZULELA&limit=6`);
      const json = await res.json();

      if (!json.results?.length) {
        await ctx.react('❌');
        return ctx.reply(`『 ❌ 』 *SIN RESULTADOS*\n\n> No encontré GIFs para *${text}* 😕 Probá con otras palabras.`);
      }

      const items = json.results;
      await sendAlbum(ctx, items.map((item, i) => async () => {
        try {
          const url = item.media[0].mp4.url;
          const buf = Buffer.from(await fetch(url).then(r => r.arrayBuffer()));
          return {
            video: buf,
            gifPlayback: true,
            caption: i === 0 ? `『 🎬 』 *GIFs*\n🔎 *${text}*` : ''
          };
        } catch (e) {}
      }));
    } catch {
      await ctx.react('❌');
      await ctx.reply(`『 ❌ 』 *ERROR*\n\n> La búsqueda de GIFs falló 😵‍💫 Probá de nuevo.`);
    }
  });