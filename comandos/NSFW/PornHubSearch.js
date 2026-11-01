import axios from 'axios';
import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { phSearch } from '../../lib/database/json/nsfw/phsearch.js';

const SEP = '─'.repeat(28);

function cleanTitle(str) {
  if (!str) return 'Sin título';
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

function buildListMsg(query, results) {
  let msg = `╔━᳀『 🔞 *PH — ${query.toUpperCase()}* 』═᳀\n`;
  results.forEach((v, i) => {
    const title = cleanTitle(v.title);
    msg += `⌬ *${i + 1}.* ${title}\n`;
    msg += `⌬ ⏳ ${v.duration || '-'}${v.views ? ` | 👁️ ${v.views}` : ''}\n`;
    msg += `⌬ 🔗 ${v.url}\n`;
    if (i < results.length - 1) msg += `⌬ ${SEP}\n`;
  });
  msg += `╚═━═━═━═━═━═━═━═᳀`;
  return msg;
}

export default new ZenCommand('phsearch')
  .addAlias('phs', 'pornhubsearch')
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
      return ctx.reply(`『 🔞 』 *PORNHUB SEARCH*\n\n✦ *Uso:* ${prefix}phsearch <búsqueda>\n\n> _Ejemplo: ${prefix}phsearch amateur_`);
    }
    
    await ctx.reply(`『 ⏳ 』 *Buscando en Pornhub...*\n\n> Ya busco, aguantame 🙂`);
    
    try {
      const results = await phSearch(queryText, 12);
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
      console.error('[phsearch]', e);
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *ERROR*\n\n> ${e.message || 'La búsqueda falló 😵 Probá de nuevo.'}`);
    }
  });