/*
 * © Created by Axelix09 🔥
 * GitHub: https://github.com/Axelix09
 * Instagram: @axelix09
 * Deja los créditos we 🗣️
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

const UA = 'Mozilla/5.0 (Linux; Android 11; Redmi Note 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

export async function phSearch(query, limit = 10) {
  const { data } = await axios.get(`https://www.pornhub.com/video/search?search=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
    timeout: 12000
  });

  const $       = cheerio.load(data);
  const results = [];

  $('li[data-video-vkey]').each((_, el) => {
    if (results.length >= limit) return false;

    const anchor   = $(el).find('a.imageLink').first();
    const img      = $(el).find('img.videoThumb').first();

    const href     = anchor.attr('href') || '';
    const title    = $(el).find('.title a').first().text().trim();
    const thumb    = img.attr('src') || '';
    const preview  = anchor.attr('data-webm') || '';
    const duration = $(el).find('.duration').first().text().trim();
    const vkey     = $(el).attr('data-video-vkey') || '';

    if (!title || !href) return;

    results.push({
      title,
      url:      href.startsWith('http') ? href : `https://www.pornhub.com${href}`,
      thumb,
      preview,
      duration,
      vkey
    });
  });

  return results;
}
