/*
 * © Created by Axelix09 🔥
 * GitHub: https://github.com/Axelix09
 * Instagram: @axelix09
 * Deja los créditos we 🗣️
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE = 'https://an1.com';
const UA = 'Mozilla/5.0 (Linux; Android 11; Redmi Note 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

export async function an1Search(query, limit = 10) {
  const { data, status } = await axios.get(`${BASE}/?story=${encodeURIComponent(query)}&do=search&subaction=search`, {
    headers: { 'User-Agent': UA },
    timeout: 5000,
    validateStatus: () => true
  });

  if (status !== 200 || !data) throw new Error('Error al conectar con AN1.');

  const $ = cheerio.load(data);
  const results = [];

  $('.app_list .item, .search-results .item').each((i, el) => {
    if (results.length >= limit) return false;

    const title = $(el).find('.title, .name').text().trim() || $(el).find('a').attr('title')?.trim();
    const url = $(el).find('a').attr('href');
    const thumb = $(el).find('img').attr('src');
    const developer = $(el).find('.developer, .dev').text().trim() || 'Unknown';

    if (!title || !url) return;

    results.push({
      title,
      developer,
      thumb: thumb && !thumb.startsWith('http') ? BASE + thumb : (thumb || ''),
      url: url.startsWith('http') ? url : BASE + url
    });
  });

  if (!results.length) throw new Error('Sin resultados en AN1.');
  return results;
}

export async function an1Download(url) {
  const { data: appData, status } = await axios.get(url, {
    headers: { 'User-Agent': UA },
    timeout: 5000,
    validateStatus: () => true
  });

  if (status !== 200 || !appData) throw new Error('No se pudo acceder a la página del juego.');

  const $ = cheerio.load(appData);

  const title = $('h1').text().trim();
  const version = $('span[itemprop="softwareVersion"]').text().trim() || 'Unknown';
  let thumb = $('img[itemprop="image"]').attr('src') || '';
  if (thumb && !thumb.startsWith('http')) thumb = BASE + thumb;

  const appIdMatch = url.match(/\/(\d+)-/);
  if (!appIdMatch) throw new Error('No se pudo extraer el ID del juego.');
  const appId = appIdMatch[1];

  const dlPageUrl = `${BASE}/file_${appId}-dw.html`;

  const { data: dlData } = await axios.get(dlPageUrl, {
    headers: { 'User-Agent': UA },
    timeout: 5000,
    validateStatus: () => true
  });

  const $$ = cheerio.load(dlData || '');
  let downloadLink = '';
  let fileSize = '';

  $$('a').each((_, el) => {
    const href = $$(el).attr('href') || '';
    const text = $$(el).text().trim();

    if (href.endsWith('.apk') && !href.includes('an1store.apk')) {
      downloadLink = href;
      const match = text.match(/\((.*?)\)/);
      if (match) fileSize = match[1];
    }
  });

  if (!downloadLink) throw new Error('No se encontró enlace directo de descarga.');

  return {
    title,
    version,
    size: fileSize || 'N/A',
    thumb,
    url,
    download: downloadLink
  };
}