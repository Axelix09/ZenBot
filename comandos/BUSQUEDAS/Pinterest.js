import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { sendAlbum } from '../../lib/messaging/album.js';
import { pinFetchBuffer, pinimg } from '../../lib/scraping/pinterest.js';

const pinCache = new Map();
const pinEnviados = new Map();

async function getPinsSinRepetir(text, sender) {
  const textLimpio = text.trim();
  const cacheKey = 'pinv2:' + textLimpio;
  const sentKey = `sent:${sender}:${textLimpio}`;
  let lista = pinCache.get(cacheKey);

  if (!lista) {
    const rawResults = await pinimg(textLimpio, 50);
    const results = Array.isArray(rawResults) ? rawResults : [rawResults];
    if (!results?.length) return null;
    lista = results
      .map((item) => ({ ...item, pinId: item.pinId || item.id }))
      .filter((item) => item.image && item.pinId)
      .sort(() => Math.random() - 0.5);
    if (!lista.length) return null;
    pinCache.set(cacheKey, lista);
    setTimeout(() => pinCache.delete(cacheKey), 1000 * 60 * 60);
  }

  const enviados = pinEnviados.get(sentKey) || new Set();
  let disponibles = lista.filter(r => !enviados.has(r.pinId));

  if (disponibles.length < 6) {
    enviados.clear();
    disponibles = [...lista].sort(() => Math.random() - 0.5);
  }

  const elegidos = disponibles.slice(0, 6);
  elegidos.forEach(e => enviados.add(e.pinId));
  pinEnviados.set(sentKey, enviados);

  return elegidos;
}

export default new ZenCommand('pinterest')
  .addAlias('pin', 'pinimg', 'pinterestimg', 'pinterestbuscar', 'pinsearch')
  .setCooldown(5)
  .setCategory('Busquedas')
  .requireRegistration()
  .setUsage('<búsqueda>')
  .onExecute(async (ctx) => {
    const text = ctx.args.join(' ').trim();
    if (!text) {
      await ctx.react('📌');
      return ctx.reply(
        `『 📌 』 *PINTEREST*\n\n` +
        `✦ *Uso:* ${ZenConfig.prefix}pinterest [búsqueda]\n` +
        `✦ *Ejemplo:* ${ZenConfig.prefix}pinterest naturaleza\n\n` +
        `> _Busca imágenes en Pinterest 😄_`
      );
    }

    await ctx.react('⏳');
    await ctx.reply(`『 ⏳ 』 *Buscando...*\n\n> Buscando en Pinterest 😎`);

    try {
      const items = await getPinsSinRepetir(text, ctx.sender);
      if (!items) {
        await ctx.react('❌');
        return ctx.reply(`『 ❌ 』 *SIN RESULTADOS*\n\n> No encontré imágenes de *${text}* en Pinterest 😞 Probá con otras palabras.`);
      }

      await sendAlbum(ctx, items.map((item, i) => async () => {
        try {
          const buf = await pinFetchBuffer(item.image);
          return {
            image: buf,
            caption: i === 0 ? `『 📌 』 *PINTEREST*\n🔎 *${text}*` : ''
          };
        } catch (e) {}
      }));
    } catch {
      await ctx.react('❌');
      await ctx.reply(`『 ❌ 』 *ERROR*\n\n> Pinterest no me respondió 😤 Probá de nuevo.`);
    }
  });
