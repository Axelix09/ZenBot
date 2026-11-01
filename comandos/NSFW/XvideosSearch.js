import axios from 'axios';
import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { xvideosSearch } from '../../lib/database/json/nsfw/xvideossearch.js';

const UA = 'Mozilla/5.0 (Linux; Android 11; Redmi Note 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const SEP = '─'.repeat(28);
const SAMU = 'https://api.samu330.com';

async function samuCall(path, params, timeout = 40000) {
  const { data } = await axios.get(`${SAMU}${path}`, {
    params,
    timeout,
    headers: { 'User-Agent': UA, Accept: 'application/json' }
  });
  if (!data || data.success === false || data.status === false) {
    throw new Error(data?.error || data?.message || 'samu_error');
  }
  return data;
}

const list = (value) => (Array.isArray(value) ? value : []);
const body = (res) => (res?.data && !Array.isArray(res.data) ? res.data : res);

function firstArray(res, keys) {
  for (const k of keys) {
    const v = res?.[k] ?? res?.data?.[k];
    if (Array.isArray(v) && v.length) return v;
  }
  return Array.isArray(res?.data) ? res.data : [];
}

const normalizeResults = (items) => items
  .map((v) => ({
    title: v.title || v.name || '',
    url: v.url || v.link || '',
    duration: v.duration || v.length || '-',
    views: v.views || '',
    uploader: v.uploader || v.author || '',
    thumb: v.thumb || v.thumbnail || ''
  }))
  .filter((v) => v.url);

const PROVIDERS = [
  { name: 'scraper', run: (query) => xvideosSearch(query, 12) },
  {
    name: 'zone',
    run: async (query) => {
      const { data } = await axios.get('https://zone.api.br/api/xvideos/search', { params: { q: query }, timeout: 15000 });
      if (!data?.status) throw new Error('zone_sin_resultados');
      return list(data.result);
    }
  },
  { name: 'samu', run: async (query) => firstArray(await samuCall('/xvideos/search', { q: query }, 30000), ['results', 'videos', 'items']) }
];

async function searchAll(query) {
  const failures = [];
  let answered = false;
  for (const provider of PROVIDERS) {
    try {
      const results = normalizeResults(await provider.run(query));
      answered = true;
      if (results.length) return results.slice(0, 12);
      failures.push(`${provider.name}: sin resultados`);
    } catch (error) {
      failures.push(`${provider.name}: ${error.message}`);
    }
  }
  if (!answered) throw new Error(`sin_fuentes (${failures.join(' | ')})`);
  return [];
}

function buildListMsg(query, results) {
  let msg = `『 🔞 』 *XVIDEOS — ${query.toUpperCase()}*\n\n`;
  results.forEach((v, i) => {
    const extra = [v.views && `👁️ ${v.views}`, v.uploader && `👤 ${v.uploader}`].filter(Boolean).join(' | ');
    msg += `*${i + 1}.* 🎬 ${v.title || 'Sin título'}\n`;
    msg += `> ⏳ ${v.duration || '-'}${extra ? ` | ${extra}` : ''}\n`;
    msg += `> 🔗 ${v.url}\n${SEP}\n`;
  });
  return msg;
}

export default new ZenCommand('xvideossearch')
  .addAlias('xvsearch')
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
      return ctx.reply(
        V.nsfw.off()
      );
    }
    
    const queryText = ctx.args.join(' ').trim();
    const prefix = ZenConfig.prefix;
    
    await ctx.react('🔞');
    
    if (!queryText) {
      return ctx.reply(
        `『 🔞 』 *XVIDEOS SEARCH*\n\n` +
        `✦ *Uso:* ${prefix}xvideossearch <búsqueda>\n\n` +
        `> _Ejemplo: ${prefix}xvideossearch amateur_`
      );
    }
    
    await ctx.reply(`『 ⏳ 』 *Buscando en XVideos...*\n\n> Dame un toque que busco 😌`);
    
    try {
      const results = await searchAll(queryText);
      
      if (!results.length) {
        await ctx.react('❌');
        return ctx.reply(`『 ❌ 』 *SIN RESULTADOS*\n\n> No encontré nada para _${queryText}_ 😶 Probá con otra búsqueda.`);
      }
      
      const caption = buildListMsg(queryText, results);
      const firstThumb = results[0].thumb || '';
      
      await ctx.react('✅');
      
      if (firstThumb) {
        return ctx.sock.sendMessage(ctx.chat, {
          image: { url: firstThumb },
          caption
        }, { quoted: ctx.rawMsg });
      } else {
        return ctx.sock.sendMessage(ctx.chat, { text: caption }, { quoted: ctx.rawMsg });
      }
      
    } catch (e) {
      console.error('[xvideossearch]', e);
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *ERROR*\n\n> La búsqueda falló 😖 Probá de nuevo.`);
    }
  });