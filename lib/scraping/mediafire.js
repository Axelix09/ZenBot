/*
 * © Created by Axelix09 🔥
 * GitHub: https://github.com/Axelix09
 * Instagram: @axelix09
 * Deja los créditos we 🗣️
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Redmi Note 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
  'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'Sec-Ch-Ua-Mobile': '?1',
  'Sec-Ch-Ua-Platform': '"Android"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache'
};

const TIMEOUT = 15000;

function parseKey(url) {
  const m = url.match(/mediafire\.com\/file\/([a-zA-Z0-9]+)/i);
  return m ? m[1] : null;
}

function getNameFromUrl(url) {
  try {
    const cleanUrl = url.split('?')[0];
    const parts = cleanUrl.split('/file/');
    if (parts.length >= 2) {
      const filenamePart = parts[1].split('/')[1];
      if (filenamePart) {
        return decodeURIComponent(filenamePart).replace(/_/g, ' ').trim();
      }
    }
  } catch (e) {}
  return 'MediaFire File';
}

function normalizeLink(link) {
  if (!link || typeof link !== 'string') return null;
  link = link.replace(/&amp;/g, '&').trim();
  if (link.startsWith('//')) link = 'https:' + link;
  return link;
}

function isDirectDownloadLink(link) {
  try {
    const parsed = new URL(normalizeLink(link));
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:')
      ? /^download\d+\.mediafire\.com$/i.test(parsed.hostname)
      : false;
  } catch (e) {
    return false;
  }
}

function findDirectLink(html, $) {
  const candidates = [
    $('#downloadButton').attr('href'),
    $('a#downloadButton').attr('data-href'),
    $('div.download_link a').attr('href'),
    $('a.input').attr('href'),
    $('a[href*="download"]').attr('href')
  ];
  
  const embedded = html.match(/https?:\/\/download\d+\.mediafire\.com\/[^\s"'<>)]+/gi) || [];
  candidates.push(...embedded);
  
  return candidates.map(normalizeLink).find(isDirectDownloadLink) || null;
}

async function tryPage(url) {
  const canonicalUrl = url.split('?')[0].split('#')[0];
  let lastError = 'la página no contiene un enlace de descarga directa';
  
  for (let attempt = 0; attempt < 3; attempt++) {
    const requestHeaders = attempt === 0 ? HEADERS : {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate'
    };
    
    if (attempt > 0) await new Promise(r => setTimeout(r, 1500));
    
    const res = await axios.get(canonicalUrl, { 
      headers: requestHeaders, 
      timeout: TIMEOUT, 
      validateStatus: () => true 
    });
    
    if (res.status >= 400) {
      throw new Error(`HTTP ${res.status} (Posible bloqueo de IP del servidor)`);
    }
    
    const html = res.data || '';
    
    if (html.includes('cf-browser-verification') || html.includes('Checking your browser') || html.includes('ray-id')) {
      throw new Error('Cloudflare bloqueó la petición (IP de VPS detectada).');
    }

    const $ = cheerio.load(html);
    const link = findDirectLink(html, $);
    
    if (link) {
      let size = 'N/A';
      let uploaded = 'N/A';
      $('ul.details li, .details li').each((_, el) => {
        const text = $(el).text().replace(/\s+/g, ' ').trim();
        if (/file size/i.test(text)) size = text.replace(/file size[:\s]*/i, '').trim();
        if (/uploaded/i.test(text)) uploaded = text.replace(/uploaded[:\s]*/i, '').trim();
      });
      return { link, size, uploaded };
    }
    lastError = 'la página no contiene un enlace de descarga directa';
  }
  throw new Error(lastError);
}

async function tryAPI(key) {
  const apiUrl = `https://www.mediafire.com/api/1.5/file/get_links.php?quick_key=${key}&link_type=normal_download&response_format=json`;
  
  const res = await axios.get(apiUrl, { 
    headers: {
      ...HEADERS,
      'Referer': `https://www.mediafire.com/file/${key}/file`,
      'Origin': 'https://www.mediafire.com'
    }, 
    timeout: TIMEOUT, 
    validateStatus: () => true 
  });
  
  if (res.status >= 400) throw new Error(`API HTTP ${res.status}`);
  
  const data = res.data?.response;
  if (data?.result !== 'Success') throw new Error('error de api: ' + (data?.message || 'desconocido'));
  
  const links = Array.isArray(data.links) ? data.links : [];
  const dl = links.map(item => normalizeLink(item?.normal_download)).find(isDirectDownloadLink);
  
  if (!dl) throw new Error('la api no devolvió un enlace de descarga directa');
  return dl;
}

export async function mediafireInfo(url) {
  if (!url || typeof url !== 'string' || !/mediafire\.com\/file\//i.test(url)) {
    throw new Error('URL de MediaFire inválida.');
  }
  
  const key = parseKey(url);
  if (!key) throw new Error('No se pudo extraer la quick_key de la URL.');
  
  const name = getNameFromUrl(url);
  let info = null;
  let lastErr = null;
  
  try {
    const pageInfo = await tryPage(url);
    info = { name, ...pageInfo };
  } catch (e) {
    lastErr = e;
  }
  
  if (!info?.link || !isDirectDownloadLink(info.link)) {
    try {
      const apiLink = await tryAPI(key);
      info = { ...(info || { name }), link: apiLink };
    } catch (e) {
      lastErr = e;
    }
  }
  
  if (!info?.link || !isDirectDownloadLink(info.link)) {
    throw new Error('No se pudo obtener un enlace de descarga directa: ' + (lastErr?.message || 'error desconocido'));
  }
  
  return {
    key,
    name: info.name || 'MediaFire File',
    size: info.size || 'N/A',
    uploaded: info.uploaded || 'N/A',
    download: info.link,
    url,
  };
}