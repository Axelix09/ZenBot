import { ZenCommand } from '../../lib/core/factory.js';
import axios from 'axios';

export default new ZenCommand('coreana')
  .addAlias('nsfwcoreana', 'xxxcoreana', 'korean')
  .setCooldown(3)
  .setCategory('Nsfw')
  .setNSFW()
  .requireRegistration()
  .onExecute(async (ctx) => {
    await ctx.react('🔞');
    try {
      const { data } = await axios.get('https://api.delirius.store/nsfw/corean', { timeout: 15000 });
      const imageUrl = data?.url || data?.image || data?.result;
      if (!imageUrl) throw new Error('No URL');

      const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 20000 });

      await ctx.sock.sendMessage(ctx.chat, {
        image: Buffer.from(imgRes.data),
        caption: `『 🔞 』 *COREANA*\n\n> @${ctx.sender.split('@')[0]} solicitó contenido +18 😄`,
        mentions: [ctx.sender]
      }, { quoted: ctx.rawMsg });
    } catch {
      await ctx.react('❌');
      await ctx.reply(`『 ❌ 』 *ERROR*\n\n> Eso no cargó 😣 Probá otra vez.`);
    }
  });
  