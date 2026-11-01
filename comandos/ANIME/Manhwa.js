import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

const traducir = async (texto) => {
  if (!texto) return '';
  const partes = texto.match(/.{1,450}/g) || [];
  let resultado = '';
  for (const parte of partes) {
    const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(parte)}&langpair=en|es`);
    const j = await r.json();
    resultado += (j.responseData.translatedText || parte) + ' ';
  }
  return resultado.trim();
};

export default new ZenCommand('manhwa')
  .addAlias('manga')
  .setCooldown(5)
  .setCategory('anime')
  .requireRegistration()
  .setUsage('<nombre>')
  .onExecute(async (ctx) => {
    const queryInput = ctx.args.join(' ');
    const prefix = ZenConfig.prefix;

    if (!queryInput) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *TÍTULO REQUERIDO*\n\n` +
        `> Indicá el título de la obra que deseas buscar 😵‍💫\n` +
        `> _Ejemplo: ${prefix}manhwa Solo Leveling_`
      );
    }

    await ctx.react('🔍');
    const query = encodeURIComponent(queryInput);

    try {
      const res = await fetch(`https://api.mangadex.org/manga?title=${query}&limit=1`);
      if (!res.ok) throw new Error();
      const data = await res.json();

      if (!data.data?.length) {
        return ctx.reply(
          `『 ⚠️ 』 *SIN RESULTADOS*\n\n` +
          `> No encontré obras para *${queryInput}* 🥲 Probá con otro nombre.`
        );
      }

      const manga = data.data[0];
      const id = manga.id;
      const nd = 'No disponible';

      const titulo = manga.attributes.title?.en || manga.attributes.title?.ja || manga.attributes.title?.ko || 'Sin título';
      const descripcion = manga.attributes.description?.en || manga.attributes.description?.es || 'Sin descripción disponible.';
      const estado = manga.attributes.status || nd;
      const demografia = manga.attributes.publicationDemographic || nd;
      const year = manga.attributes.year || nd;
      const rating = manga.attributes.contentRating || nd;
      const generos = manga.attributes.tags.map(tg => tg.attributes.name.en).slice(0, 3).join(', ') || nd;
      const autores = manga.relationships.filter(r => r.type === 'author').map(r => r.attributes?.name).join(', ') || nd;

      const coverRes = await fetch(`https://api.mangadex.org/cover?manga[]=${id}`);
      const coverJson = await coverRes.json();
      let imagen = null;
      if (coverJson.data?.length) {
        const file = coverJson.data[0].attributes.fileName;
        imagen = `https://uploads.mangadex.org/covers/${id}/${file}`;
      }

      const [generosT, descripcionT, estadoT, demografiaT, ratingT] = await Promise.all([
        traducir(generos), traducir(descripcion), traducir(estado), traducir(demografia), traducir(rating)
      ]);

      const caption = [
        `『 🎌 』 *${titulo}*`,
        ``,
        `✦ *Autor(es):* ${autores}`,
        `✦ *Géneros:* ${generosT}`,
        `✦ *Estado:* ${estadoT}`,
        `✦ *Demografía:* ${demografiaT}`,
        `✦ *Año:* ${year}`,
        `✦ *Clasificación:* ${ratingT}`,
        ``,
        `📝 *SINOPSIS:*\n_${descripcionT}_`
      ].join('\n');

      if (imagen) {
        return ctx.sock.sendMessage(ctx.chat, { image: { url: imagen }, caption }, { quoted: ctx.rawMsg });
      } else {
        return ctx.reply(caption);
      }
    } catch {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR DE CARGA*\n\n` +
        `> Ocurrió un error al cargar los detalles de la obra 😵`
      );
    }
  });