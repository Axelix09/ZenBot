/*
 * © Created by Axelix09 🔥
 * GitHub: https://github.com/Axelix09
 * Instagram: @axelix09
 * Deja los créditos we 🗣️
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

const UA = 'Mozilla/5.0 (Linux; Android 11; Redmi Note 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

const HEADERS = {
  'User-Agent': UA,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Referer': 'https://www.xvideos.com/'
};

const TIMEOUT = 15000;

export async function xvideosSearch(query, limit = 10) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new Error('Se requiere una búsqueda válida.');
  }

  const searchUrl = `https://www.xvideos.com/?k=${encodeURIComponent(query.trim())}`;
  
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const requestHeaders = attempt === 0 
        ? HEADERS 
        : { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36', 'Accept': '*/*' };

      if (attempt > 0) await new Promise(r => setTimeout(r, 1000));

      const { data } = await axios.get(searchUrl, {
        headers: requestHeaders,
        timeout: TIMEOUT,
        validateStatus: () => true
      });

      if (typeof data !== 'string' || data.includes('cf-browser-verification')) {
        throw new Error('Respuesta inválida o bloqueada por Cloudflare');
      }

      const $ = cheerio.load(data);
      const results = [];

      $('.thumb-block').each((_, el) => {
        if (results.length >= limit) return false;

        const img = $(el).find('img');
        const anchor = $(el).find('.thumb-inside a').first();
        const titleEl = $(el).find('a[title]').first();
        const metadata = $(el).find('.metadata').text().replace(/\s+/g, ' ').trim();
        const href = anchor.attr('href') || '';
        const title = titleEl.attr('title') || '';
        const thumb = img.attr('data-src') || '';
        const preview = img.attr('data-pvv') || '';
        const duration = $(el).find('.duration').first().text().trim();
        const quality = $(el).find('.video-hd-mark').text().trim();
        const viewsMatch = metadata.match(/([\d.]+[KMB]?)\s*Views/i);
        const views = viewsMatch ? viewsMatch[1] : '';

        if (!title || !href) return;

        results.push({
          title,
          url: `https://www.xvideos.com${href}`,
          thumb,
          preview,
          duration,
          views,
          quality
        });
      });

      if (results.length > 0) return results;
      
      if (attempt === 2) {
        throw new Error('No se encontraron resultados para la búsqueda.');
      }
    } catch (e) {
      if (attempt === 2) {
        throw new Error(`Error en la búsqueda: ${e.message}`);
      }
    }
  }
}