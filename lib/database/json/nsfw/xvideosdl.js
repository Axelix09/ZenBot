/*
 * © Created by Axelix09 🔥
 * GitHub: https://github.com/Axelix09
 * Instagram: @axelix09
 * Deja los créditos we 🗣️
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const HEADERS = {
  'User-Agent': UA,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Referer': 'https://www.xvideos.com/'
};

function parseDuration(iso) {
  if (!iso) return null;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return iso;
  const h = match[1] ? parseInt(match[1]) : 0;
  const m = match[2] ? parseInt(match[2]) : 0;
  const s = match[3] ? parseInt(match[3]) : 0;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function unescapeHtml(str) {
  if (!str) return null;
  return str
    .replace(/\\u002F/g, '/')
    .replace(/\\u0026/g, '&')
    .replace(/\\u003C/g, '<')
    .replace(/\\u003E/g, '>')
    .replace(/\\/g, '');
}

export async function xvideosDownload(url) {
  if (!url || !url.includes('xvideos.com')) {
    throw new Error('URL de XVideos inválida.');
  }

  const cleanUrl = url.split('?')[0].split('#')[0];

  const { data } = await axios.get(cleanUrl, {
    headers: HEADERS,
    timeout: 15000,
    validateStatus: () => true
  });

  if (data.includes('cf-browser-verification') || data.includes('Checking your browser')) {
    throw new Error('Cloudflare bloqueó la petición. Intenta más tarde.');
  }

  const $ = cheerio.load(data);
  
  const jsonLd = $('script[type="application/ld+json"]').first().html();
  let title = 'Video de XVideos';
  let thumb = null;
  let duration = null;
  let views = null;
  let uploadDate = null;

  if (jsonLd) {
    try {
      const parsed = JSON.parse(jsonLd);
      title = parsed.name || title;
      thumb = Array.isArray(parsed.thumbnailUrl) ? parsed.thumbnailUrl[0] : parsed.thumbnailUrl || null;
      duration = parseDuration(parsed.duration);
      views = parsed.interactionStatistic?.userInteractionCount || null;
      uploadDate = parsed.uploadDate?.slice(0, 10) || null;
    } catch (e) {
      title = $('meta[property="og:title"]').attr('content') || title;
      thumb = $('meta[property="og:image"]').attr('content') || null;
    }
  } else {
    title = $('meta[property="og:title"]').attr('content') || title;
    thumb = $('meta[property="og:image"]').attr('content') || null;
  }

  const scripts = $('script').map((_, el) => $(el).html()).get().join('\n');
  
  const extract = (pattern) => {
    const match = scripts.match(pattern);
    return match ? unescapeHtml(match[1]) : null;
  };

  const low = extract(/setVideoUrlLow\(['"]([^'"]+)['"]\)/) || 
              extract(/html5player\.setVideoUrlLow\(['"]([^'"]+)['"]\)/);
              
  const high = extract(/setVideoUrlHigh\(['"]([^'"]+)['"]\)/) || 
               extract(/html5player\.setVideoUrlHigh\(['"]([^'"]+)['"]\)/);
               
  const hls = extract(/setVideoHLS\(['"]([^'"]+)['"]\)/) || 
              extract(/html5player\.setVideoHLS\(['"]([^'"]+)['"]\)/);

  // Fallback: buscar URLs de mp4 o m3u8 directamente en el HTML crudo
  const fallbackMp4 = scripts.match(/(https?:\/\/[^\s'"]+\.xvideos\.com\/videos\/[^\s'"]+\.mp4[^\s'"]*)/i)?.[1] || null;
  const fallbackHls = scripts.match(/(https?:\/\/[^\s'"]+\.xvideos\.com\/[^\s'"]+\.m3u8[^\s'"]*)/i)?.[1] || null;

  const finalLow = low || fallbackMp4;
  const finalHigh = high || fallbackMp4;
  const finalHls = hls || fallbackHls;

  if (!finalLow && !finalHigh && !finalHls) {
    throw new Error('No se encontraron URLs de descarga. El video puede ser privado o estar bloqueado.');
  }

  return {
    title: title.trim(),
    thumb: thumb || null,
    duration,
    views,
    uploadDate,
    download: {
      low: finalLow ? { quality: 'SD (240p/360p)', url: finalLow } : null,
      high: finalHigh ? { quality: 'HD (720p/1080p)', url: finalHigh } : null,
      hls: finalHls ? { quality: 'HLS Stream', url: finalHls } : null
    }
  };
}