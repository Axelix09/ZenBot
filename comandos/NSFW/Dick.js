import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { xgroovyRandom, xgroovyPhotoInfo } from '../../lib/database/json/nsfw/xgroovy.js';

const userLastImage = new Map();

function cleanTitle(str) {
  if (!str) return 'Foto';
  return str
    .replace(/&iacute;/g, 'í').replace(/&Iacute;/g, 'Í')
    .replace(/&aacute;/g, 'á').replace(/&Aacute;/g, 'Á')
    .replace(/&eacute;/g, 'é').replace(/&Eacute;/g, 'É')
    .replace(/&oacute;/g, 'ó').replace(/&Oacute;/g, 'Ó')
    .replace(/&uacute;/g, 'ú').replace(/&Uacute;/g, 'Ú')
    .replace(/&ntilde;/g, 'ñ').replace(/&Ntilde;/g, 'Ñ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&hellip;/g, '...')
    .replace(/&[a-z]+;/gi, '').trim();
}

export default new ZenCommand('pene')
  .addAlias('dick', 'penealeatorio', 'randompene')
  .setCooldown(8)
  .setCategory('Nsfw')
  .setNSFW()
  .requireGroup()
  .requireRegistration()
  .onExecute(async (ctx) => {
    const group = await ctx.getGroup();
    if (!group.nsfw) {
      await ctx.react('⛔');
      return ctx.reply(V.nsfw.off());
    }

    const user = await ctx.getUser();
    await ctx.react('🍆');

    try {
      const randomPhotos = await xgroovyRandom(8);
      if (!randomPhotos.length) {
        await ctx.react('❌');
        return ctx.reply(`『 ❌ 』 *SIN RESULTADOS*\n\n> No pude traer imágenes ahora 😳 Probá de nuevo.`);
      }

      const lastUrl = userLastImage.get(user.id);
      let selectedPhoto = null;
      let info = null;

      for (const photo of randomPhotos) {
        if (photo.url === lastUrl) continue;

        try {
          info = await xgroovyPhotoInfo(photo.url);
          selectedPhoto = photo;
          break;
        } catch (err) {
          console.warn(`[pene] Foto fallida: ${photo.url} - ${err.message}`);
        }
      }

      if (!selectedPhoto) {
        try {
          info = await xgroovyPhotoInfo(randomPhotos[0].url);
          selectedPhoto = randomPhotos[0];
        } catch (err) {
          throw new Error('No se pudo procesar ninguna imagen del lote.');
        }
      }
      userLastImage.set(user.id, selectedPhoto.url);
      if (userLastImage.size > 500) {
        const firstKey = userLastImage.keys().next().value;
        userLastImage.delete(firstKey);
      }

      const cleanName = cleanTitle(info.title);

      await ctx.sock.sendMessage(ctx.chat, {
        image: { url: info.imageUrl },
        caption:
          `╔━᳀『 🔞 *PENE* 』═᳀\n` +
          `⌬ *Título:* ${cleanName}\n` +
          `⌬ *Fuente:* Xgroovy.com\n` +
          `╚═━═━═━═━═━═━═━═᳀`
      }, { quoted: ctx.rawMsg });

      await ctx.react('✅');

    } catch (e) {
      console.error('[pene] Error fatal:', e);
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *ERROR*\n\n> ${e.message || 'No pude procesar la imagen 😖 Probá de nuevo.'}`);
    }
  });