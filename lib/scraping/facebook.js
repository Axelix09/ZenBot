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
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'HX-Request': 'true',
  'HX-Target': 'target',
  'HX-Trigger': 'main_submit',
  'Content-Type': 'application/x-www-form-urlencoded'
};

export async function fgetDownload(url) {
  if (!url || !url.includes('facebook.com')) {
    throw new Error('URL de Facebook inválida.');
  }

  const { data } = await axios.post(
    'https://fget.io/process',
    new URLSearchParams({ id: url, locale: 'en' }),
    { headers: HEADERS, timeout: 15000 }
  );

  const $ = cheerio.load(data);
  
  const thumbImg = $('img[alt="Video thumbnail"]');
  const thumb = thumbImg.attr('src') || null;
  const title = thumbImg.attr('title') || $('h3.result-title').text().trim() || 'Facebook Video';

  const results = [];
  const downloadButtons = $('a[href^="https://ssscdn.io/fget/"]');
  
  downloadButtons.each((index, el) => {
    const href = $(el).attr('href');
    const parent = $(el).parent();
    const qualityText = parent.find('span, div, p').text().trim() || 'Unknown';
    
    let quality = 'SD';
    let type = 'video';
    
    if (qualityText.toLowerCase().includes('720') || qualityText.toLowerCase().includes('hd')) {
      quality = '720p';
    } else if (qualityText.toLowerCase().includes('360') || qualityText.toLowerCase().includes('sd')) {
      quality = '360p';
    } else if (qualityText.toLowerCase().includes('mp3') || qualityText.toLowerCase().includes('audio')) {
      quality = 'MP3';
      type = 'audio';
    }

    results.push({ quality, type, url: href });
  });

  if (results.length === 0) {
    throw new Error('No se encontraron enlaces de descarga. El video puede ser privado o no estar disponible.');
  }

  const priority = { '720p': 1, '360p': 2, 'MP3': 3 };
  results.sort((a, b) => (priority[a.quality] || 99) - (priority[b.quality] || 99));

  return {
    title,
    thumb,
    downloads: results
  };
}