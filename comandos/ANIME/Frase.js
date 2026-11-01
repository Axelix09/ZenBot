import { ZenCommand } from '../../lib/core/factory.js';

export default new ZenCommand('animefrase')
  .addAlias('fraseanime')
  .setCooldown(5)
  .setCategory('anime')
  .requireRegistration()
  .onExecute(async (ctx) => {
    try {
      const res = await fetch('https://katanime.vercel.app/api/getrandom');
      if (!res.ok) throw new Error();
      const data = await res.json();
      const item = data.result[0];

      const fraseOriginal = item.quote || item.english || item.indo || '';
      if (!fraseOriginal) throw new Error();

      let frase = fraseOriginal;
      const transRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(fraseOriginal)}&langpair=en|es`);
      const transJson = await transRes.json();
      frase = transJson.responseData.translatedText || fraseOriginal;

      const charRes = await fetch(`https://api.jikan.moe/v4/characters?q=${encodeURIComponent(item.character)}&limit=1`);
      const charJson = await charRes.json();
      const imagen = charJson.data?.[0]?.images?.jpg?.image_url || null;

      const caption = [
        `『 💬 』 *FRASE ANIME*`,
        ``,
        `📖 *Cita célebre:*`,
        `  _${frase}_`,
        ``,
        `✦ *Personaje:* ${item.character}`,
        `✦ *Anime:* ${item.anime}`
      ].join('\n');

      await ctx.react('💬');

      if (imagen) {
        return ctx.sock.sendMessage(ctx.chat, { image: { url: imagen }, caption }, { quoted: ctx.rawMsg });
      } else {
        return ctx.reply(caption);
      }
    } catch {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR AL OBTENER FRASE*\n\n` +
        `> No pude obtener la frase de anime en este momento 😤`
      );
    }
  });