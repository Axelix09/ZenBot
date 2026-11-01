/*
 * © Created by Axelix09 🔥
 * GitHub: https://github.com/Axelix09
 * Instagram: @axelix09
 * Deja los créditos we 🗣️
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

const UA = 'Mozilla/5.0 (Linux; Android 11; Redmi Note 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

export async function xhamsterSearch(query, limit = 12) {
  try {
    const { data } = await axios.get(`https://xhamster.com/search/${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': UA,
        'Accept-Language': 'es-ES,es;q=0.9',
        'Cookie': 'age_verified=1; cookies_accepted=1'
      },
      timeout: 15000
    });
    const $ = cheerio.load(data);
    const results = [];
    $('[class*="video-thumb"]').each((_, el) => {
      if (results.length >= limit) return false;
      const anchor = $(el).find('a.thumb-image-container').first();
      const img = $(el).find('img').first();
      const title = anchor.attr('aria-label') || $(el).find('.thumb-image-container__tooltip').text().trim() || 'Sin título';
      const href = anchor.attr('href') || '';
      const thumb = img.attr('src') || img.attr('srcset')?.split(' ')[0] || '';
      const duration = $(el).find('time').first().text().trim() || '';
      const views = $(el).find('[class*="views"]').first().text().trim() || '';

      if (title && href) {
        results.push({ 
          title, 
          url: href.startsWith('http') ? href : `https://xhamster.com${href}`, 
          thumb, 
          duration, 
          views 
        });
      }
    });
    return results;
  } catch (error) {
    throw new Error('Error de conexión con xHamster: ' + error.message);
  }
}