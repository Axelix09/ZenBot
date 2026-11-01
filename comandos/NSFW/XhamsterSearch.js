import axios from 'axios';
import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { xhamsterSearch } from '../../lib/database/json/nsfw/xhamstersearch.js';

const SEP = '─'.repeat(28);

function buildListMsg(query, results) {
  let msg = `『 🔞 』 *XHAMSTER — ${query.toUpperCase()}*\n\n`;
  results.forEach((v, i) => {
    const extra = v.views ? `👁️ ${v.views}` : '';
    msg += `*${i + 1}.* 🎬 ${v.title}\n`;
    msg += `> ⏳ ${v.duration || '-'}${extra ? ` | ${extra}` : ''}\n`;
    msg += `> 🔗 ${v.url}\n${SEP}\n`;
  });
  return msg;
}

export default new ZenCommand('xhamstersearch')
  .addAlias('xhsearch')
  .setCooldown(8)
  .setCategory('Nsfw')
  .setNSFW()
  .requireGroup()
  .requireRegistration()
  .setUsage('<búsqueda>')
  .onExecute(async (ctx) => {
    const group = await ctx.getGroup();
    if (!group.nsfw) {
      await ctx.react('⛔');
      return ctx.reply(V.nsfw.off());
    }
    
    const queryText = ctx.args.join(' ').trim();
    const prefix = ZenConfig.prefix;
    await ctx.react('🔞');
    
    if (!queryText) {
      return ctx.reply(`『 🔞 』 *XHAMSTER SEARCH*\n\n✦ *Uso:* ${prefix}xhamstersearch <búsqueda>\n\n> _Ejemplo: ${prefix}xhamstersearch amateur_`);
    }
    
    await ctx.reply(`『 ⏳ 』 *Buscando en xHamster...*\n\n> Buscando, no te vayas 👀`);
    
    try {
      const results = await xhamsterSearch(queryText, 12);
      if (!results.length) {
        await ctx.react('❌');
        return ctx.reply(`『 ❌ 』 *SIN RESULTADOS*\n\n> No encontré nada para _${queryText}_ 😶 Probá con otra búsqueda.`);
      }
      
      const caption = buildListMsg(queryText, results);
      const firstThumb = results[0].thumb || '';
      
      await ctx.react('✅');
      if (firstThumb) {
        return ctx.sock.sendMessage(ctx.chat, { image: { url: firstThumb }, caption }, { quoted: ctx.rawMsg });
      } else {
        return ctx.sock.sendMessage(ctx.chat, { text: caption }, { quoted: ctx.rawMsg });
      }
    } catch (e) {
      console.error('[xhamstersearch]', e);
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *ERROR*\n\n> La búsqueda falló 😣 Probá de nuevo.`);
    }
  });