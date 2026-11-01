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
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
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

function parseDuration(iso) {
  if (!iso) return null;
  const match = iso.match(/PT(\d+)H(\d+)M(\d+)S/);
  if (!match) return iso;
  const h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const s = parseInt(match[3]);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function extractMediaDefinitions(s) {
  const start = s.indexOf('mediaDefinitions');
  if (start === -1) return null;
  const arrStart = s.indexOf('[', start);
  if (arrStart === -1) return null;
  let depth = 0, end = -1;
  for (let i = arrStart; i < s.length; i++) {
    if (s[i] === '[') depth++;
    else if (s[i] === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  try { return JSON.parse(s.slice(arrStart, end + 1).replace(/\\\//g, '/')); }
  catch { return null; }
}

function decodeHtml(str) {
  if (!str) return str;
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&iexcl;/g, '¡')
    .replace(/&iquest;/g, '¿')
    .replace(/&aacute;/g, 'á')
    .replace(/&eacute;/g, 'é')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú')
    .replace(/&ntilde;/g, 'ñ')
    .replace(/&Aacute;/g, 'Á')
    .replace(/&Eacute;/g, 'É')
    .replace(/&Iacute;/g, 'Í')
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&Uacute;/g, 'Ú')
    .replace(/&Ntilde;/g, 'Ñ')
    .replace(/&period;/g, '.')
    .replace(/&excl;/g, '!')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function extractMeta($) {
  const jsonLd = $('script[type="application/ld+json"]').first().html();
  let title = null, thumb = null, duration = null, uploadDate = null;
  if (jsonLd) {
    try {
      const parsed = JSON.parse(jsonLd);
      title      = decodeHtml(parsed.name) || null;
      thumb      = parsed.thumbnailUrl || null;
      duration   = parseDuration(parsed.duration);
      uploadDate = parsed.uploadDate?.slice(0, 10) || null;
    } catch {}
  }
  if (!title) title = $('h1.title span').text().trim() || $('h1').first().text().trim() || null;
  return { title, thumb, duration, uploadDate };
}

export async function phDownload(url) {
  const { data } = await axios.get(url, { headers: HEADERS, timeout: 8000 });

  const $ = cheerio.load(data);
  const scripts = $('script').map((_, el) => $(el).html()).get();

  let mediaDefinitions = null;
  for (const s of scripts) {
    if (!s || !s.includes('mediaDefinitions')) continue;
    mediaDefinitions = extractMediaDefinitions(s);
    if (mediaDefinitions) break;
  }

  if (!mediaDefinitions) throw new Error('No se encontraron calidades de video.');

  const hlss = mediaDefinitions
    .filter(d => d.format === 'hls' && d.videoUrl && d.quality)
    .sort((a, b) => parseInt(b.quality) - parseInt(a.quality));

  if (!hlss.length) throw new Error('No se encontró stream HLS.');

  const { title, thumb, duration, uploadDate } = extractMeta($);

  const hls = {};
  for (const d of hlss) {
    hls[`${d.quality}p`] = { quality: `${d.quality}p`, format: 'hls', url: d.videoUrl };
  }

  return { 
    title, 
    thumb, 
    duration, 
    uploadDate, 
    download: hls,
    url: hlss[0]?.videoUrl || null
  };
}

export async function phDownloadBuffer(url) {
  return await phDownload(url);
}