/*
 * © Created by Axelix09 🔥
 * GitHub: https://github.com/Axelix09
 * Instagram: @axelix09
 * Deja los créditos we 🗣️
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
};

const IMG_HEADERS = {
  ...HEADERS,
  Referer: 'https://www.pinterest.com/',
  Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
};

export async function pinFetchBuffer(url) {
  const { data } = await axios.get(url, {
    headers: IMG_HEADERS,
    responseType: 'arraybuffer',
    timeout: 10000
  });
  return Buffer.from(data);
}

function toOriginal(src) {
  return src.replace(/\/\d+x\//, '/originals/').replace(/\/\d+x\d+\//, '/originals/');
}

function extractVidsFromHtml(html) {
  const matches = html.match(/https?:\/\/v\d+\.pinimg\.com\/videos\/[^\s"'\\]+\.mp4/g) || [];
  const unique = [...new Set(matches)].map((url) => url.replace(/\\/g, ''));
  if (!unique.length) return null;
  const hd = unique.find((url) => url.includes('/720p/')) || unique[0];
  return { hd, all: unique };
}

function formatVideoResults(html, limit) {
  const videos = extractVidsFromHtml(html);
  if (!videos) return null;
  const ordered = [videos.hd, ...videos.all.filter((url) => url !== videos.hd)];
  return ordered.slice(0, limit).map((video, i) => ({ index: i + 1, video }));
}

async function resolvePinUrl(input) {
  if (!input.includes('pin.it/')) return input;
  const response = await axios.get(input, { headers: HEADERS, maxRedirects: 5, timeout: 8000 });
  return response.request?.res?.responseUrl || response.config?.url || input;
}

export async function pinvid(input, limit = 5) {
  if (typeof input !== 'string' || !input.trim()) throw new Error('Debes indicar un pin o una búsqueda.');
  const isPin = input.includes('pinterest.com/pin/') || input.includes('pin.it/');
  const pageUrl = isPin
    ? await resolvePinUrl(input)
    : `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(`${input} video`)}`;
  const { data: html } = await axios.get(pageUrl, { headers: HEADERS, timeout: 10000 });
  const results = formatVideoResults(html, limit);
  if (!results?.length) throw new Error(isPin ? 'Este pin no contiene video.' : 'Sin videos encontrados en Pinterest.');
  return results;
}

export async function pinsearch(query, limit = 50) {
  const { data: html } = await axios.get(
    `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`,
    { headers: HEADERS, timeout: 10000 }
  );

  const $ = cheerio.load(html);
  const items = [];
  const seen = new Set();
  $('a[href*="/pin/"]').each((_, element) => {
    if (items.length >= limit) return;
    const href = $(element).attr('href') || '';
    const match = href.match(/\/pin\/(\d+)/);
    if (!match || seen.has(match[1])) return;
    seen.add(match[1]);

    const image = $(element).find('img').attr('src');
    if (image && image.includes('pinimg.com')) {
      items.push({
        id: match[1],
        pinId: match[1],
        image: toOriginal(image),
        url: `https://www.pinterest.com/pin/${match[1]}/`
      });
    }
  });

  if (!items.length) throw new Error('Sin resultados en Pinterest.');
  return items;
}

export async function pinimg(input, limit = 20) {
  if (typeof input !== 'string' || !input.trim()) throw new Error('Debes indicar un pin o una búsqueda.');
  if (!input.includes('pinterest.com/pin/') && !input.includes('pin.it/')) {
    return pinsearch(input, limit);
  }

  const resolvedUrl = await resolvePinUrl(input);
  const cleanUrl = resolvedUrl.split('?')[0].split('/sent/')[0];
  const id = cleanUrl.match(/\/pin\/(\d+)/)?.[1] || '';
  const { data: html } = await axios.get(cleanUrl, { headers: HEADERS, timeout: 10000 });
  const $ = cheerio.load(html);

  const title = $('meta[property="og:title"]').attr('content') || $('title').text().replace(/\| Pinterest.*/i, '').trim();
  const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
  const coverImage = $('meta[property="og:image"]').attr('content') || $('img').first().attr('src') || '';
  const highCover = coverImage ? toOriginal(coverImage) : '';
  const videos = extractVidsFromHtml(html);

  if (videos) {
    return { id, title, type: 'video', thumbnail: highCover, video: videos.hd, url: cleanUrl };
  }
  return { id, title, description: description.trim(), type: 'image', image: highCover, url: cleanUrl };
}
