import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import axios from 'axios';

export default new ZenCommand('npm')
  .addAlias('popnpm')
  .setCooldown(5)
  .setCategory('tools')
  .requireRegistration()
  .setUsage('<paquete>')
  .onExecute(async (ctx) => {
    const [query] = ctx.args;
    const prefix = ZenConfig.prefix;

    if (!query) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *PAQUETE REQUERIDO*\n\n` +
        `> Indicá el nombre del paquete NPM 😵‍💫\n` +
        `> _Ejemplo: ${prefix}npm axios_`
      );
    }

    await ctx.react('⏳');

    try {
      const res = await axios.get(`https://api.popcat.xyz/v2/npm?q=${encodeURIComponent(query)}`);
      const data = res.data?.message || res.data;
      if (!data || data.error) throw new Error();

      const caption = `『 📦 』 *${data.name}*\n\n` +
        `✦ *Versión:* ${data.version}\n` +
        `✦ *Descripción:* ${data.description || 'Sin descripción'}\n` +
        `✦ *Autor:* ${data.author || 'Desconocido'}\n` +
        `✦ *Publicado:* ${data.last_published || 'Desconocido'}\n` +
        `✦ *Descargas este año:* ${data.downloadsthisyear || '0'}`;

      await ctx.react('✅');
      return ctx.reply(caption);
    } catch {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *PAQUETE NO ENCONTRADO*\n\n` +
        `> No encontré el paquete *${query}* en NPM 😕`
      );
    }
  });