import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import axios from 'axios';
import { deezerSearch, deezerDownload } from '../../lib/scraping/deezer.js';

function formatDuration(secs) {
  if (typeof secs === 'string' && secs.includes(':')) return secs;
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

async function dzApi(endpoint) {
  const { data } = await axios.get(`https://api.deezer.com/${endpoint}`);
  return data;
}

export default new ZenCommand('deezer')
  .addAlias(
    'dz', 'dzsearch', 'deezersearch',
    'dzdl', 'deezerdl', 'dldeezer',
    'dzalbum', 'deezeralbum',
    'dzartist', 'deezerartist',
    'dztracks', 'deezertracks',
    'dztop', 'deezertop'
  )
  .setCooldown(10)
  .setCategory('Descargas')
  .requireRegistration()
  .setUsage('<búsqueda|link>')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const subcmd = ctx.args[0];
    const query = ctx.args.join(' ').trim();
    const command = ctx.commandName.toLowerCase();
    const prefix = ZenConfig.prefix;

    if (!subcmd) {
      await ctx.react('🎵');
      return ctx.reply(
        `『 🎵 』 *DEEZER DOWNLOAD*\n\n` +
        `✦ *Uso:* ${prefix}deezer <canción|link>\n` +
        `✦ *Costo:* 1 ${ZenConfig.currencies.kogen.emoji}\n\n` +
        `> _Ejemplos:_\n  • ${prefix}deezer shape of you\n  • ${prefix}deezer https://deezer.com/track/123\n  • ${prefix}dzalbum <álbum>`
      );
    }

    if (user.kogen < 1) {
      await ctx.react('⚠️');
      return ctx.reply(V.kogen.insufficient('descargar', 1));
    }

    const chatId = ctx.chat;
    await ctx.react('⏳');

    try {
      const trackLink = subcmd.match(/deezer\.com\/(?:[a-z]{2}\/)?track\/(\d+)/i);
      
      if (['dzdl', 'deezerdl', 'dldeezer'].includes(command) || trackLink) {
        const trackId = trackLink?.[1] || subcmd.match(/^\d+$/)?.[0];
        if (!trackId) {
          await ctx.react('⚠️');
          return ctx.reply(`『 ⚠️ 』 *ID INVÁLIDO*\n\n> Usá un link de Deezer o el ID numérico de la canción 🤔`);
        }

        const meta = await dzApi(`track/${trackId}`);
        if (!meta?.id || meta.error) throw new Error('No se pudo obtener la información de la canción.');

        const title = meta.title;
        const artist = meta.artist?.name || 'Desconocido';
        const captionText = `╔━᳀『 🎵 *${title}* 』═᳀\n` +
          `⌬ *Artista:* ${artist}\n` +
          `⌬ *Álbum:* ${meta.album?.title || 'Single'}\n` +
          `⌬ *Duración:* ${formatDuration(meta.duration)}\n` +
          (meta.release_date ? `⌬ *Lanzamiento:* ${meta.release_date}\n` : '') +
          `╚═━═━═━═━═━═━═━═᳀`;

        const cover = meta.album?.cover_xl || meta.album?.cover_big || meta.album?.cover_medium;
        
        await ctx.sock.sendMessage(
          chatId,
          cover ? { image: { url: cover }, caption: captionText } : { text: captionText },
          { quoted: ctx.rawMsg }
        );

        const dl = await deezerDownload(trackId, 'mp3');
        
        if (!dl.buffer || dl.size < 1000) throw new Error('El archivo descargado está corrupto o vacío.');

        const safeName = `${title} - ${artist}`.replace(/[\\/:*?"<>|]/g, '').slice(0, 120);
        
        await ctx.sock.sendMessage(chatId, {
          document: dl.buffer,
          mimetype: dl.mimeType,
          fileName: `${safeName}.${dl.ext}`,
          caption: `🎵 ${title} — ${artist}`
        }, { quoted: ctx.rawMsg });

        user.kogen -= 1;
        await user.save();
        await ctx.react('✅');
        return ctx.reply(V.kogen.charged(1));
      }

      if (['dzalbum', 'deezeralbum'].includes(command)) {
        await ctx.react('🔎');
        const res = await dzApi(`search/album?q=${encodeURIComponent(query)}&limit=6`);
        if (!res.data || !res.data.length) return ctx.reply(`『 ⚠️ 』 *SIN RESULTADOS*\n\n> No encontré álbumes 😕`);
        
        const lines = res.data.map((a, i) =>
          `⌬ *${i + 1}.* ${a.title} — _${a.artist.name}_\n  🎵 ${a.nb_tracks} tracks\n  🆔 \`${a.id}\``
        ).join('\n\n');
        
        await ctx.sock.sendMessage(chatId, {
          image: { url: res.data[0].cover_xl || res.data[0].cover_medium },
          caption: `╔━᳀『 💿 *ÁLBUMES — "${query}"* 』═᳀\n${lines}\n╚═━═━═━═━═━═━═━═᳀`
        }, { quoted: ctx.rawMsg });
        return;
      }

      if (['dzartist', 'deezerartist'].includes(command)) {
        await ctx.react('🔎');
        const res = await dzApi(`search/artist?q=${encodeURIComponent(query)}&limit=6`);
        if (!res.data || !res.data.length) return ctx.reply(`『 ⚠️ 』 *SIN RESULTADOS*\n\n> No encontré artistas 😕 Revisá el nombre.`);
        
        const lines = res.data.map((a, i) =>
          `⌬ *${i + 1}.* ${a.name}\n  👥 ${(a.nb_fan || 0).toLocaleString()} fans\n  🆔 \`${a.id}\``
        ).join('\n\n');
        
        await ctx.sock.sendMessage(chatId, {
          image: { url: res.data[0].picture_xl || res.data[0].picture_medium },
          caption: `╔━᳀『 👤 *ARTISTAS — "${query}"* 』═᳀\n${lines}\n╚═━═━═━═━═━═━═━═᳀`
        }, { quoted: ctx.rawMsg });
        return;
      }

      if (['dztracks', 'deezertracks'].includes(command)) {
        if (isNaN(query)) return ctx.reply(`『 ⚠️ 』 *ID REQUERIDO*\n\n> Falta el ID del álbum 😵‍💫`);
        await ctx.react('🔎');
        const album = await dzApi(`album/${query}`);
        const lines = album.tracks.data.map((tr, i) => `⌬ *${i + 1}.* ${tr.title} _(${formatDuration(tr.duration)})_`).join('\n');
        
        await ctx.sock.sendMessage(chatId, {
          image: { url: album.cover_xl || album.cover_medium },
          caption: `╔━᳀『 💿 *${album.title}* 』═᳀\n⌬ _${album.artist.name}_\n${lines}\n╚═━═━═━═━═━═━═━═᳀`
        }, { quoted: ctx.rawMsg });
        return;
      }

      if (['dztop', 'deezertop'].includes(command)) {
        if (isNaN(query)) return ctx.reply(`『 ⚠️ 』 *ID REQUERIDO*\n\n> Falta el ID del artista 😵‍💫`);
        await ctx.react('🔎');
        const artist = await dzApi(`artist/${query}`);
        const top = await dzApi(`artist/${query}/top?limit=10`);
        const lines = top.data.map((tr, i) => `⌬ *${i + 1}.* ${tr.title} — (${formatDuration(tr.duration)})`).join('\n');
        
        await ctx.sock.sendMessage(chatId, {
          image: { url: artist.picture_xl || artist.picture_medium },
          caption: `╔━᳀『 🎤 *TOP — ${artist.name}* 』═᳀\n${lines}\n╚═━═━═━═━═━═━═━═᳀`
        }, { quoted: ctx.rawMsg });
        return;
      }

      // 6. BÚSQUEDA GENERAL (Default)
      await ctx.react('🔎');
      const results = await deezerSearch(query, 10);
      
      if (!results.length) return ctx.reply(`『 ⚠️ 』 *SIN RESULTADOS*\n\n> No encontré canciones para *${query}* 😢 Probá con otro nombre.`);

      const rows = results.map((r) => ({
        header: '',
        title: r.title.length > 24 ? r.title.substring(0, 24) + '...' : r.title,
        description: `${r.artist.name} • ${r.album.title || 'Single'}`,
        id: `${prefix}dzdl ${r.id}`
      }));

      const buttons = [{
        type: 'single_select',
        title: '🎵 Elegir canción',
        sections: [{
          title: '✧ Resultados ✧',
          rows: rows
        }]
      }];

      await ctx.sock.sendButtons(ctx.chat, {
        text: `『 🎵 』 *DEEZER SEARCH*\n\n✦ *Búsqueda:* ${query}\n✦ *Resultados:* ${results.length}\n\n> Seleccioná una canción de la lista 😉`,
        footer: ZenConfig.botName,
        buttons: buttons
      });

    } catch (e) {
      await ctx.react('❌');
      console.error('[DEEZER ERROR]', e);
      return ctx.reply(`『 ❌ 』 *ERROR DE DESCARGA*\n\n> ${e.message || 'Deezer se puso difícil 😤 Probá de nuevo.'}`);
    }
  });