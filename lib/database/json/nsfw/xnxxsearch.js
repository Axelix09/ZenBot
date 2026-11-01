/*
 * © Created by Axelix09 🔥
 * GitHub: https://github.com/Axelix09
 * Instagram: @axelix09
 * Deja los créditos we 🗣️
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

const UA = 'Mozilla/5.0 (Linux; Android 11; Redmi Note 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

export async function xnxxSearch(query, limit = 12) {
  const { data } = await axios.get(`https://www.xnxx.com/search/${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'es-ES,es;q=0.9' },
    timeout: 15000
  });
  const $ = cheerio.load(data);
  const results = [];
  $('.mozaique .thumb-block').each((_, el) => {
    if (results.length >= limit) return false;
    const img = $(el).find('img');
    const anchor = $(el).find('.thumb-inside a').first();
    const titleEl = $(el).find('a[title]').first();
    const metadata = $(el).find('.metadata').text().replace(/\s+/g, ' ').trim();
    const rightEl = $(el).find('.metadata .right').text().replace(/\s+/g, ' ').trim();
    const href = anchor.attr('href') || titleEl.attr('href') || '';
    const title = titleEl.attr('title') || '';
    const thumb = img.attr('data-src') || img.attr('src') || '';
    const duration = metadata.match(/(\d+min|\d+:\d+)/)?.[1] || '';
    const views = rightEl.match(/([\d.]+[KMB]?)/)?.[1] || '';
    const quality = $(el).find('.video-hd').text().replace(/-/g, '').trim() || 'SD';
    const uploader = $(el).find('.uploader .name').text().trim() || 'Desconocido';

    if (title && href) {
      results.push({ title, url: `https://www.xnxx.com${href}`, thumb, duration, views, quality, uploader });
    }
  });
  return results;
}