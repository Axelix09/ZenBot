import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { sendAlbum } from '../../lib/messaging/album.js';
import fg from 'fg-senna';

export default new ZenCommand('imagen')
  .addAlias('img', 'image', 'gimage')
  .setCooldown(5)
  .setCategory('Busquedas')
  .requireRegistration()
  .setUsage('<búsqueda>')
  .onExecute(async (ctx) => {
    const text = ctx.args.join(' ').trim();
    if (!text) {
      await ctx.react('🖼️');
      return ctx.reply(
        `『 🖼️ 』 *BUSCADOR DE IMÁGENES*\n\n` +
        `✦ *Uso:* ${ZenConfig.prefix}imagen [búsqueda]\n` +
        `✦ *Ejemplo:* ${ZenConfig.prefix}imagen atardecer\n\n` +
        `> _Busca imágenes en Google 🙂_`
      );
    }

    await ctx.react('⏳');
    await ctx.reply(`『 ⏳ 』 *Buscando...*\n\n> Buscando tus imágenes 🧐`);

    try {
      const res = await fg.gimage(text);
      const lista = (Array.isArray(res) ? res : [])
        .map((x) => (typeof x === 'string' ? x : x?.url || x?.image))
        .filter(Boolean);

      if (!lista.length) {
        await ctx.react('❌');
        return ctx.reply(`『 ❌ 』 *SIN RESULTADOS*\n\n> No encontré imágenes para *${text}* 🥲 Probá con otras palabras.`);
      }

      const items = [...lista].sort(() => Math.random() - 0.5).slice(0, 6);
      await sendAlbum(ctx, items.map((url, i) => async () => {
        try {
          const buf = Buffer.from(await fetch(url).then(r => r.arrayBuffer()));
          return {
            image: buf,
            caption: i === 0 ? `『 🖼️ 』 *IMÁGENES*\n🔎 *${text}*` : ''
          };
        } catch (e) {}
      }));
    } catch {
      await ctx.react('❌');
      await ctx.reply(`『 ❌ 』 *ERROR*\n\n> No pude buscar imágenes ahora 😣 Probá de nuevo.`);
    }
  });
