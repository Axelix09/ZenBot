import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

export default new ZenCommand('meme')
  .addAlias('memardo', 'chiste')
  .setCooldown(5)
  .setCategory('Busquedas')
  .requireRegistration()
  .onExecute(async (ctx) => {
    await ctx.react('⏳');
    await ctx.reply(`『 ⏳ 』 *Buscando memes...*\n\n> Preparando algo para reírnos 😂`);

    try {
      const res = await fetch(`https://meme-api.com/gimme/memesenespanol`);
      const data = await res.json();
      const { title, url, postLink } = data;
      const buf = Buffer.from(await fetch(url).then(r => r.arrayBuffer()));

      await ctx.sock.sendMessage(ctx.chat, {
        image: buf,
        caption: `『 🎭 』 *MEME*\n\n✦ *Título:* ${title}\n🔗 ${postLink}`,
        mentions: [ctx.sender]
      }, { quoted: ctx.rawMsg });

    } catch {
      await ctx.react('❌');
      await ctx.reply(`『 ❌ 』 *ERROR*\n\n> No pude traer un meme ahora 😭 Probá de nuevo.`);
    }
  });