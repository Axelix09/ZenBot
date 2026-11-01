import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import axios from 'axios';
import fg from 'fg-senna';
import { sendAlbum } from '../../lib/messaging/album.js';
import { createRuntimeFiles } from '../../lib/runtime/download-file.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const SAMU_API = 'https://api.samu330.com';

async function samuTikTokSearch(query, count = 4) {
  const { data: response } = await axios.get(`${SAMU_API}/tiktok/search`, {
    params: { keywords: query.trim() },
    timeout: 30000,
    headers: { 'User-Agent': UA, Accept: 'application/json' }
  });
  if (!response || response.success === false || response.status === false) {
    throw new Error(response?.error || response?.message || 'samu_error');
  }
  const videos = response.videos ?? response.data?.videos ?? (Array.isArray(response.data) ? response.data : []);
  const items = (Array.isArray(videos) ? videos : [])
    .filter((video) => video?.play)
    .slice(0, count)
    .map((video) => ({
      url: video.play,
      title: video.title || 'Sin descripción',
      author: video.author?.nickname || video.author?.uniqueId || 'TikTok User',
      duration: video.duration || 0,
      plays: video.playCount || 0,
      images: []
    }));
  if (!items.length) throw new Error('samu_sin_resultados');
  return items;
}

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), ms);
    })
  ]).finally(() => clearTimeout(timer));
}

async function fetchSenna(query) {
  const res = await fg.ttsearch(query.trim());
  const list = Array.isArray(res?.result) ? res.result : [];
  return list
    .slice(0, 4)
    .map((v) => ({
      url: v.link || v.url || v.play || '',
      title: v.title || 'Sin descripción',
      author: typeof v.author === 'string'
        ? v.author
        : v.author?.nickname || v.author?.unique_id || 'TikTok User',
      duration: v.duration || 0,
      plays: v.play_count || v.plays || 0,
      images: Array.isArray(v.images) ? v.images : []
    }))
    .filter((v) => v.url);
}

async function fetchTikTokSearch(query) {
  try {
    const items = await withTimeout(fetchSenna(query), 15000);
    if (items.length > 0) return items;
  } catch (_) {}

  try {
    const { data: res } = await axios.get('https://www.tikwm.com/api/feed/search', {
      params: {
        keywords: query.trim(),
        count: 4,
        cursor: 0,
        web: 1,
        hd: 1
      },
      headers: {
        'User-Agent': UA,
        'Referer': 'https://www.tikwm.com/'
      },
      timeout: 8000
    });

    const videos = res?.data?.videos || (Array.isArray(res?.data) ? res.data : []);
    if (res?.code === 0 && videos.length > 0) {
      return videos.map((v) => {
        const rawUrl = v.play || v.wmplay || '';
        const playUrl = rawUrl.startsWith('http') ? rawUrl : `https://www.tikwm.com${rawUrl}`;
        return {
          url: playUrl,
          title: v.title || 'Sin descripción',
          author: v.author?.nickname || v.author?.unique_id || 'TikTok User',
          duration: v.duration || 0,
          plays: v.play_count || 0,
          images: Array.isArray(v.images) ? v.images : []
        };
      });
    }
  } catch (_) {}

  try {
    const { data: fb } = await axios.get(`https://bk9.fun/search/tiktok?q=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': UA },
      timeout: 8000
    });
    if (fb?.status && Array.isArray(fb.BK9) && fb.BK9.length > 0) {
      return fb.BK9.map((v) => ({
        url: v.nowm || v.watermark || '',
        title: v.title || 'TikTok Video',
        author: v.author?.name || 'TikTok User',
        duration: v.duration || 0,
        plays: 0,
        images: []
      }));
    }
  } catch (_) {}

  return samuTikTokSearch(query, 4);
}

export default new ZenCommand('ttsearch')
  .addAlias('tiktoksearch', 'tts')
  .setCooldown(10)
  .setCategory('Búsquedas')
  .requireRegistration()
  .setUsage('<término>')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const query = ctx.args.join(' ').trim();
    const prefix = ZenConfig.prefix;

    if (!query) {
      await ctx.react('🔍');
      return ctx.reply(
        `『 🔍 』 *TIKTOK SEARCH*\n\n` +
        `✦ *Uso:* ${prefix}${ctx.commandName} <término>\n` +
        `✦ *Costo:* 1 ${ZenConfig.currencies.kogen.emoji}\n` +
        `> _Ejemplo: ${prefix}${ctx.commandName} sia snowman_`
      );
    }

    if ((user.kogen || 0) < 1) {
      await ctx.react('⚠️');
      return ctx.reply(V.kogen.insufficient('buscar', 1));
    }

    const chatId = ctx.chat;
    await ctx.react('⏳');

    try {
      const items = await fetchTikTokSearch(query);

      const files = createRuntimeFiles();
      try {
        if (items.length === 1) {
          const v = items[0];
          const file = await files.download(v.url, {
            prefix: 'tiktok-search',
            extension: 'mp4',
            headers: { 'User-Agent': UA, 'Referer': 'https://www.tikwm.com/' },
            timeout: 120000,
            minBytes: 1000
          });

          const caption =
            `╔━᳀『 🎵 *TIKTOK RESULTADO* 』═᳀\n` +
            `⌬ 📝 ${v.title.slice(0, 80)}\n` +
            `⌬ 👤 *Autor:* ${v.author}\n` +
            `⌬ ⏱️ *Duración:* ${v.duration}s  ·  👁️ *Vistas:* ${Number(v.plays).toLocaleString('es-AR')}\n╚═━═━═━═━═━═━═━═᳀`;

          await ctx.sock.sendMessage(chatId, {
            video: { url: file },
            caption
          }, { quoted: ctx.rawMsg });

        } else {
          await sendAlbum(ctx, items.map((v, i) => async () => {
            try {
              const isSlide = v.images.length > 0;
              const mediaUrl = isSlide ? v.images[0] : v.url;
              const file = await files.download(mediaUrl, {
                prefix: 'tiktok-search',
                extension: isSlide ? 'jpg' : 'mp4',
                headers: { 'User-Agent': UA, 'Referer': 'https://www.tikwm.com/' },
                timeout: 120000,
                minBytes: 100
              });

              const caption = `🎵 ${(v.title || '').slice(0, 60)}\n👤 ${v.author} · 👁️ ${Number(v.plays).toLocaleString('es-AR')}`;

              return {
                [isSlide ? 'image' : 'video']: { url: file },
                caption: i === 0 ? `╔━᳀『 🎵 *TIKTOK SEARCH: ${query.toUpperCase()}* 』═᳀\n${caption.split('\n').map(l => '⌬ ' + l).join('\n')}\n╚═━═━═━═━═━═━═━═᳀` : caption
              };
            } catch (e) {
              console.error('[TTSearch] Error al enviar elemento:', e.message);
            }
          }));
        }
      } finally {
        await files.cleanup();
      }

      user.kogen = Math.max(0, (user.kogen || 0) - 1);
      await user.save();
      await ctx.react('✅');
      return ctx.reply(V.kogen.used());

    } catch (err) {
      console.error('[TTSearch] Error general:', err.message);
      await ctx.react('❌');
      return ctx.reply(`『 ⚠️ 』 *SIN RESULTADOS*\n\n> No encontré videos en TikTok para *${query}* 😞`);
    }
  });
