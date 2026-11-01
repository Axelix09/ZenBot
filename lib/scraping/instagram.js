/*
 * © Created by Axelix09 🔥
 * GitHub: https://github.com/Axelix09
 * Instagram: @axelix09
 * Deja los créditos we 🗣️
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const BASE_URL = 'https://igsnapinsta.com';
const AJAX_URL = `${BASE_URL}/wp-admin/admin-ajax.php`;
let _cookies = '';
let _cookiesTime = 0;

function decodeUrl(encodedUrl) {
  try {
    return Buffer.from(encodedUrl, 'base64').toString('utf-8');
  } catch {
    return encodedUrl;
  }
}

function detectType(url) {
  if (url.includes('/reel/')) return 'reel';
  if (url.includes('/p/')) return 'post';
  if (url.includes('/stories/')) return 'story';
  if (url.includes('/tv/')) return 'video';
  const path = new URL(url).pathname.replace(/\/$/, '');
  if (path.split('/').length === 2) return 'profile';
  return 'post';
}

async function fetchFromEmbed(shortcode, isVideoExpected = false) {
  const BOT_UAS = [
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'Twitterbot/1.0',
    'WhatsApp/2.23.1 A'
  ];
  
  for (const ua of BOT_UAS) {
    try {
      const { data: html } = await axios.get(`https://www.instagram.com/p/${shortcode}/embed/captioned/`, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 4000,
        validateStatus: () => true
      });

      if (!html || html.length < 500) continue;
      
      const $ = cheerio.load(html);
      let videoUrl = $('video source').attr('src') || $('video').attr('src');
      
      if (!videoUrl) {
        const matchVideo = html.match(/"video_url"\s*:\s*"([^"]+)"/i) || html.match(/video_url\\":\\"([^"]+)\\"/i);
        if (matchVideo && matchVideo[1]) {
          videoUrl = matchVideo[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
        }
      }
      
      if (!videoUrl) {
        const mp4Matches = html.match(/https?:\/\/[^\s"'\\]+\.mp4[^\s"'\\]*/g) || [];
        if (mp4Matches.length > 0) {
          const rawUrl = mp4Matches[0].replace(/\\u0026/g, '&').replace(/\\/g, '');
          if (rawUrl.includes('cdninstagram') || rawUrl.includes('fbcdn')) {
            videoUrl = rawUrl;
          }
        }
      }
      
      const imgUrl = $('img.EmbeddedMediaImage').attr('src') || $('meta[property="og:image"]').attr('content');
      const items = [];
      
      if (videoUrl) {
        items.push({ type: 'video', url: videoUrl.replace(/&amp;/g, '&'), quality: 'HD', label: 'video' });
      } else if (imgUrl && !isVideoExpected) {
        items.push({ type: 'image', url: imgUrl.replace(/&amp;/g, '&'), quality: 'HD', label: 'image' });
      }
      
      if (items.length > 0) return items;
    } catch {}
  }
  return null;
}

async function fetchFromSaveIg(targetUrl) {
  try {
    const { data } = await axios.post(
      'https://saveig.app/api/ajaxSearch',
      new URLSearchParams({ q: targetUrl, t: 'media', lang: 'es' }),
      {
        headers: {
          'User-Agent': UA,
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://saveig.app/es',
          'Origin': 'https://saveig.app'
        },
        timeout: 10000,
        validateStatus: () => true
      }
    );

    if (data?.status !== 'ok' || !data?.data) return null;

    const $ = cheerio.load(data.data);
    const items = [];
    const seen = new Set();

    $('.download-items, .media-item').each((_, el) => {
      const $el = $(el);
      const downloadBtn = $el.find('a[href*="cdninstagram"], a[href*="download"], a.btn-download');
      const href = downloadBtn.attr('href') || '';
      const text = downloadBtn.text().trim();

      if (href && !seen.has(href)) {
        seen.add(href);
        const isVideo = href.includes('.mp4') || /video/i.test(text);
        const resMatch = text.match(/\d+p/i);
        items.push({
          type: isVideo ? 'video' : 'image',
          url: href.replace(/&amp;/g, '&'),
          quality: resMatch ? resMatch[0].toUpperCase() : 'HD',
          label: isVideo ? 'video' : 'image'
        });
      }
    });

    if (!items.length) {
      $('a[href*="cdninstagram"], a[href*="fbcdn"]').each((_, a) => {
        const href = $(a).attr('href');
        if (href && !seen.has(href)) {
          seen.add(href);
          const isVideo = href.includes('.mp4');
          items.push({ 
            type: isVideo ? 'video' : 'image', 
            url: href.replace(/&amp;/g, '&'), 
            quality: 'HD', 
            label: isVideo ? 'video' : 'image' 
          });
        }
      });
    }
    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}

async function fetchFromIgSnap(targetUrl) {
  try {
    const now = Date.now();
    if (!_cookies || (now - _cookiesTime > 8 * 60 * 1000)) {
      const resHome = await axios.get(`${BASE_URL}/es/`, {
        headers: { 'User-Agent': UA },
        timeout: 5000,
        validateStatus: () => true
      });
      const raw = resHome.headers['set-cookie'] || [];
      _cookies = raw.map(c => c.split(';')[0]).join('; ');
      _cookiesTime = Date.now();
    }

    const { data, status } = await axios.post(
      AJAX_URL,
      new URLSearchParams({ action: 'kdnsd_get_video', social: 'instagram', url: targetUrl }),
      {
        headers: {
          'User-Agent': UA,
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Referer': `${BASE_URL}/es/`,
          'X-Requested-With': 'XMLHttpRequest',
          'Cookie': _cookies,
        },
        timeout: 8000,
        validateStatus: () => true
      }
    );

    if (status !== 200 || !data?.success || !data?.data?.html) return null;

    const $ = cheerio.load(data.data.html);
    const items = [];
    const seen = new Set();

    $('source[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && !src.includes('kdnsd') && !seen.has(src)) {
        seen.add(src);
        items.push({ type: 'video', url: src.replace(/&amp;/g, '&'), quality: 'HD', label: 'video' });
      }
    });

    $('a[href*="kdnsd/v1/download"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim();
      const match = href.match(/url=([^&]+)/);
      if (match && match[1]) {
        const decoded = decodeUrl(decodeURIComponent(match[1]));
        if (decoded && !seen.has(decoded)) {
          seen.add(decoded);
          const isAudio = /audio/i.test(text);
          const isVideo = /video/i.test(text) || decoded.includes('.mp4');
          items.push({ 
            type: isAudio ? 'audio' : isVideo ? 'video' : 'image', 
            url: decoded.replace(/&amp;/g, '&'), 
            quality: 'HD', 
            label: isAudio ? 'audio' : isVideo ? 'video' : 'image' 
          });
        }
      }
    });
    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}

export async function igDownload(url) {
  if (!url || typeof url !== 'string' || !url.includes('instagram.com')) {
    throw new Error('URL inválida. Debe ser un link de Instagram.');
  }

  const base = url.split('?')[0].split('#')[0];
  const cleanUrl = base.endsWith('/') ? base : base + '/';
  const type = detectType(cleanUrl);
  const isVideoExpected = type === 'reel' || type === 'video';
  
  const matchShortcode = cleanUrl.match(/\/(?:reel|p|tv)\/([A-Za-z0-9_-]+)/);
  const shortcode = matchShortcode ? matchShortcode[1] : null;

  if (shortcode) {
    const embedResult = await fetchFromEmbed(shortcode, isVideoExpected);
    if (embedResult && embedResult.length > 0) {
      return { type, items: embedResult };
    }
  }

  const saveIgResult = await fetchFromSaveIg(cleanUrl);
  if (saveIgResult && saveIgResult.length > 0) {
    return { type, items: saveIgResult };
  }

  const igSnapResult = await fetchFromIgSnap(cleanUrl);
  if (igSnapResult && igSnapResult.length > 0) {
    return { type, items: igSnapResult };
  }

  throw new Error('No se pudo obtener el contenido. Verificá que el perfil o post sea público.');
}

export async function igReelDownload(url) {
  return igDownload(url);
}

export async function igStalk(input) {
  const username = input.replace(/https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '').replace('@', '').split('?')[0].trim();
  
  if (!username) {
    throw new Error('Usuario inválido.');
  }

  const UAs = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  ];

  for (const ua of UAs) {
    try {
      const { data: html } = await axios.get(`https://www.instagram.com/${username}/`, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 8000,
        validateStatus: () => true 
      });

      const $ = cheerio.load(html);
      
      const meta = $('meta[property="og:description"]').attr('content') || '';
      const name = $('meta[property="og:title"]').attr('content') || '';
      const avatar = $('meta[property="og:image"]').attr('content') || '';

      if (!name && !meta) continue;

      const m = meta.match(/([\d,.KkMm]+)\s*Followers[,\s]+([\d,.KkMm]+)\s*Following[,\s]+([\d,.KkMm]+)\s*Posts?/i);
      
      const bioRaw = meta.replace(/[\d,.KkMm]+\s*Followers[^-–—]*[-–—]\s*/i, '').trim();
      const bioClean = bioRaw.replace(/^See Instagram photos and videos from .+/i, '').trim();
      
      const fullNameClean = name
        .replace(/\s*\(@?[^)]*\)\s*/g, '')
        .replace(/\s*[•·]\s*Instagram.*/i, '')
        .trim();

      const isVerified = html.includes('"is_verified":true') || html.includes('"verified":true') || html.includes('aria-label="Verified"');
      const isPrivate = html.includes('"is_private":true');

      return {
        username,
        fullName: fullNameClean || username,
        bio: bioClean || '',
        followers: m ? m[1] : '?',
        following: m ? m[2] : '?',
        posts: m ? m[3] : '?',
        isPrivate,
        isVerified,
        avatar,
        url: `https://www.instagram.com/${username}/`
      };
    } catch {}
  }
  
  throw new Error('No se pudo obtener información del perfil. Instagram puede estar bloqueando las peticiones.');
}