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
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0',
  'Referer': 'https://www.google.com/'
};

async function scrapeVideoList(url, limit) {
  try {
    const { data } = await axios.get(url, { 
      headers: HEADERS, 
      timeout: 15000,
      validateStatus: () => true
    });
    
    if (data.includes('cf-browser-verification') || data.includes('Checking your browser')) {
      throw new Error('Cloudflare bloqueó la petición. Intenta más tarde.');
    }
    
    const $ = cheerio.load(data);
    const seenUrls = new Set();
    const results = [];
    
    $('a[href*="/video/"]').each((_, el) => {
      if (results.length >= limit * 3) return false;
      
      const href = $(el).attr('href');
      const title = $(el).text().trim();
      
      if (href && !seenUrls.has(href) && title.length > 20 && !title.startsWith('HD')) {
        seenUrls.add(href);
        
        let thumb = null;
        const parent = $(el).closest('div');
        if (parent.length) {
          const img = parent.find('img[src*="hentaicity.com"]');
          if (img.length) {
            thumb = img.attr('src') || img.attr('data-src');
          }
        }
        
        results.push({ title, url: href, thumb });
      }
    });
    
    return results;
  } catch (error) {
    if (error.response?.status === 403) {
      throw new Error('Acceso denegado (403). El sitio está bloqueando peticiones desde esta IP.');
    }
    throw error;
  }
}

export async function hentaicityRandom(limit = 5) {
  try {
    const results = await scrapeVideoList('https://www.hentaicity.com/videos/', limit);
    
    for (let i = results.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [results[i], results[j]] = [results[j], results[i]];
    }
    
    return results.slice(0, limit);
  } catch (error) {
    throw new Error(`Error al obtener videos aleatorios: ${error.message}`);
  }
}

export async function hentaicitySearch(query, limit = 12) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new Error('Se requiere un término de búsqueda.');
  }
  
  const cleanQuery = query.trim().replace(/\s+/g, ' ');
  const searchUrl = `https://www.hentaicity.com/videos/?q=${encodeURIComponent(cleanQuery)}`;
  
  try {
    const results = await scrapeVideoList(searchUrl, limit);
    return results.slice(0, limit);
  } catch (error) {
    throw new Error(`Error en la búsqueda: ${error.message}`);
  }
}

export async function hentaicityDownload(url) {
  if (!url || !url.includes('hentaicity.com')) {
    throw new Error('URL de Hentaicity inválida.');
  }

  try {
    const { data } = await axios.get(url, { 
      headers: HEADERS, 
      timeout: 15000,
      validateStatus: () => true
    });
    
    if (data.includes('cf-browser-verification') || data.includes('Checking your browser')) {
      throw new Error('Cloudflare bloqueó la petición. Intenta más tarde.');
    }
    
    const $ = cheerio.load(data);
    
    const title = $('title').text().replace(' - Hentai City', '').trim() || 'Hentai Video';
    
    const thumbMeta = $('meta[property="og:image"]');
    const thumb = thumbMeta.attr('content') || null;
    
    const videoMeta = $('meta[property="og:video:url"], meta[property="og:video:secure_url"]');
    let videoUrl = videoMeta.attr('content') || null;
    
    if (!videoUrl) {
      const videoTag = $('video');
      if (videoTag.length) {
        videoUrl = videoTag.attr('src') || videoTag.find('source').attr('src');
      }
    }
    
    if (!videoUrl) {
      throw new Error('No se encontró el enlace del video.');
    }
    
    const durationMeta = $('meta[property="og:video:duration"]');
    let duration = null;
    if (durationMeta.length) {
      const secs = parseInt(durationMeta.attr('content'), 10);
      if (!isNaN(secs)) {
        const m = Math.floor(secs / 60);
        const s = String(secs % 60).padStart(2, '0');
        duration = `${m}:${s}`;
      }
    }
    
    return {
      title,
      thumb,
      duration,
      videoUrl
    };
  } catch (error) {
    if (error.response?.status === 403) {
      throw new Error('Acceso denegado (403). El sitio está bloqueando peticiones desde esta IP.');
    }
    throw new Error(`Error al obtener el video: ${error.message}`);
  }
}