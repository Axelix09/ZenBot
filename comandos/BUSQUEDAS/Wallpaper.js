import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { sendAlbum } from '../../lib/messaging/album.js';
import fg from 'fg-senna';

export default new ZenCommand('wallpaper')
  .addAlias('fondo', 'wallpapers', 'wp')
  .setCooldown(5)
  .setCategory('Busquedas')
  .requireRegistration()
  .setUsage('<búsqueda>')
  .onExecute(async (ctx) => {
    const text = ctx.args.join(' ').trim();
    if (!text) {
      await ctx.react('🖼️');
      return ctx.reply(
        `『 🖼️ 』 *WALLPAPERS*\n\n` +
        `✦ *Uso:* ${ZenConfig.prefix}wallpaper [búsqueda]\n` +
        `✦ *Ejemplo:* ${ZenConfig.prefix}wallpaper atardecer\n\n` +
        `> _Busca fondos de pantalla 😄_`
      );
    }

    await ctx.react('⏳');
    await ctx.reply(`『 ⏳ 』 *Buscando...*\n\n> Buscando wallpapers 😄`);

    try {
      const res = await fg.wallpaper(text);
      const lista = (Array.isArray(res) ? res : []).filter((x) => x?.image);

      if (!lista.length) {
        await ctx.react('❌');
        return ctx.reply(`『 ❌ 』 *SIN RESULTADOS*\n\n> No encontré wallpapers para *${text}* 🥺 Probá con otras palabras.`);
      }

      const items = [...lista].sort(() => Math.random() - 0.5).slice(0, 6);
      await sendAlbum(ctx, items.map((item, i) => async () => {
        try {
          const buf = Buffer.from(await fetch(item.image).then(r => r.arrayBuffer()));
          return {
            image: buf,
            caption: i === 0 ? `『 🖼️ 』 *WALLPAPERS*\n🔎 *${text}*` : ''
          };
        } catch (e) {}
      }));
    } catch {
      await ctx.react('❌');
      await ctx.reply(`『 ❌ 』 *ERROR*\n\n> No pude buscar wallpapers ahora 😩 Probá de nuevo.`);
    }
  });
