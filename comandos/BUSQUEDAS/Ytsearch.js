import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import ytSearch from 'yt-search';

function extractVideoId(input) {
  const match = input.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/i);
  if (match) return match[1];
  return /^[a-zA-Z0-9_-]{11}$/.test(input) ? input : null;
}

export default new ZenCommand('ytsearch')
  .addAlias('yts', 'ytbuscar', 'youtubesearch')
  .setCooldown(5)
  .setCategory('Búsquedas')
  .requireRegistration()
  .setUsage('<texto>')
  .onExecute(async (ctx) => {
    const query = ctx.args.join(' ').trim();
    const prefix = ZenConfig.prefix;

    if (!query) {
      await ctx.react('🔍');
      return ctx.reply(
        `『 🔍 』 *YOUTUBE SEARCH*\n\n` +
        `✦ *Uso:* ${prefix}${ctx.commandName} <texto>\n` +
        `> _Ejemplo: ${prefix}${ctx.commandName} Sia snowman_`
      );
    }

    await ctx.react('⏳');

    try {
      const videoId = extractVideoId(query);
      const response = videoId ? await ytSearch({ videoId }) : await ytSearch(query);
      const rawResults = videoId ? [response] : (response?.videos || []).slice(0, 10);
      const results = rawResults
        .filter((video) => video?.videoId || video?.url)
        .map((video) => {
          const id = video.videoId || extractVideoId(video.url || '');
          return {
            id,
            title: video.title || 'Sin título',
            author: { name: typeof video.author === 'string' ? video.author : (video.author?.name || 'YouTube') },
            duration: { text: video.duration?.timestamp || video.timestamp || '-' },
            views: Number(video.views || 0).toLocaleString('es-AR'),
            thumb: video.thumbnail || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null)
          };
        })
        .filter((video) => video.id);

      if (results.length === 0) {
        await ctx.react('❌');
        return ctx.reply(`『 ⚠️ 』 *SIN RESULTADOS*\n\n> No encontré videos para: *${query}* 😕 Probá con otro título.`);
      }

      const first = results[0];

      const lines = [
        `🔍 *RESULTADOS DE YOUTUBE*`,
        `> Búsqueda: *${query}*`,
        ``
      ];

      results.forEach((item, i) => {
        const title = item.title || 'Sin título';
        const channel = item.author?.name || 'YouTube';
        const duration = item.duration?.text || '-';
        const views = item.views || '-';
        const url = `https://youtu.be/${item.id}`;

        lines.push(`*${i + 1}.* *${title}*`);
        lines.push(`› Canal: ${channel}`);
        lines.push(`› Duración: ${duration}  ·  ${views}`);
        lines.push(`› Enlace: ${url}`);
        lines.push(``);
      });

      lines.push(`💡 _Abre el menú de abajo para descargar en Audio (MP3) o Video (MP4)._`);

      const topResults = results.slice(0, 6);

      const audioRows = topResults.map((item, i) => ({
        id: `${prefix}ytmp3dl norm ${item.id}`,
        title: `${i + 1}. ${(item.title || 'Audio').slice(0, 24)}`,
        description: `${item.author?.name || 'Canal'} · ${item.duration?.text || '-'} (MP3)`
      }));

      const videoRows = topResults.map((item, i) => ({
        id: `${prefix}ytmp4dl norm ${item.id}`,
        title: `${i + 1}. ${(item.title || 'Video').slice(0, 24)}`,
        description: `${item.author?.name || 'Canal'} · ${item.duration?.text || '-'} (MP4)`
      }));

      const buttons = [
        {
          type: 'single_select',
          title: 'Descargar resultado',
          sections: [
            {
              title: 'Descargar en audio (MP3)',
              rows: audioRows
            },
            {
              title: 'Descargar en video (MP4)',
              rows: videoRows
            }
          ]
        },
        {
          type: 'cta_url',
          text: 'Canal oficial',
          url: ZenConfig.channelUrl
        }
      ];

      const messageParamsJson = JSON.stringify({
        bottom_sheet: {
          in_thread_buttons_limit: 0,
          list_title: 'OPCIONES DE DESCARGA',
          button_title: 'Elegir formato y video'
        }
      });

      await ctx.react('✅');

      return ctx.sock.sendButtons(ctx.chat, {
        text: lines.join('\n'),
        footer: `${ZenConfig.botName} • Descargas`,
        image: first.thumb || 'https://i.ibb.co/sphnd13T/images-4.jpg',
        buttons,
        messageParamsJson,
        quoted: ctx.rawMsg
      });

    } catch (error) {
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *ERROR EN BÚSQUEDA*\n\n> Ocurrió un error al consultar el servidor 😭`);
    }
  });
