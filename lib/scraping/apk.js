/*
 * © Created by Axelix09 🔥
 * GitHub: https://github.com/Axelix09
 * Instagram: @axelix09
 * Deja los créditos we 🗣️
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

const UA      = 'Mozilla/5.0 (Linux; Android 11; Redmi Note 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const BASE    = 'https://apkpure.net';
const DL_BASE = 'https://d.apkpure.net';
const HEADERS = { 'User-Agent': UA, 'Referer': BASE };

function extractPkg(href) {
  const m = href?.match(/\/((?:com|org|net|io|co)\.[a-zA-Z0-9_.]+)(?:\/|$)/i)
  return m ? m[1] : ''
}

function extractPkgFromEl($, el) {
  const fromAttr = $(el).find('[data-dt-pkg]').attr('data-dt-pkg')
  if (fromAttr) return fromAttr
  const href = $(el).find('a.top').first().attr('href') || ''
  return extractPkg(href)
}

function parsePageData(data) {
  try {
    const m = data.match(/window\.apkpure\s*=\s*\{pageData:\s*(\{.*?\})\s*[,;]/s);
    if (m) return JSON.parse(m[1]);
  } catch {}
  return null;
}

export async function apkSearch(query, limit = 5) {
  if (!query?.trim()) throw new Error('Query vacío');

  const { data } = await axios.get(`${BASE}/search?q=${encodeURIComponent(query)}`, {
    headers: HEADERS, timeout: 15000
  });
  const $       = cheerio.load(data);
  const results = [];
  const seen    = new Set();

  $('.search-brand-container').each((_, el) => {
    if (results.length >= limit) return false;

    const name    = $(el).find('a.top').first().text().trim();
    const dev     = $(el).find('a.developer').first().text().trim();
    const date    = $(el).find('span.time').first().text().trim();
    const icon    = $(el).find('img.app-icon-img').first().attr('data-original') || '';
    const appHref = $(el).find('a.top').first().attr('href') || '';
    const pkg     = extractPkgFromEl($, el)

    if (!name || !pkg || seen.has(pkg)) return;
    seen.add(pkg);

    const appUrl = appHref.startsWith('http') ? appHref : `${BASE}${appHref}`;
    results.push({
      name,
      developer: dev,
      pkg,
      date,
      icon,
      appUrl,
      dlUrl: `${DL_BASE}/b/APK/${pkg}?version=latest`,
    });
  });

  if (!results.length) throw new Error('No se encontraron resultados');
  return results;
}

export async function apkInfo(pkgOrUrl) {
  if (!pkgOrUrl) throw new Error('Se requiere un package o URL válido');

  let pkg = pkgOrUrl;
  let forceUrl = null;

  if (typeof pkgOrUrl === 'string' && pkgOrUrl.includes('apkpure')) {
    pkg = extractPkg(pkgOrUrl);
    forceUrl = `${BASE}${pkgOrUrl.replace(BASE, '').split('/').slice(0, 3).join('/')}/download`;
  }
  if (!pkg) pkg = pkgOrUrl;

  const shortName = pkg.split('.').slice(-2).join('-').toLowerCase();
  const url = forceUrl || `${BASE}/${shortName}/${pkg}/download`;

  const { data } = await axios.get(url, {
    headers: HEADERS, timeout: 15000, validateStatus: () => true
  });
  const $ = cheerio.load(data);
  const pageData = parsePageData(data);
  
  let version = pageData?.versionName || '';
  if (!version) {
    const verEl = $('[data-dt-version], .version-name, [class*="version-name"]').first().text().trim();
    version = verEl.match(/[\d.]+/)?.[0] || '';
  }
  if (!version || version === $('span.file-size, [class*="file-size"]').first().text().trim().match(/[\d.]+/)?.[0]) {
    version = $('h1').first().text().match(/[\d.]+/)?.[0] || '';
  }

  const name = pageData?.appName
    || $('title').text().split(' APK')[0].replace('Download ', '').trim()
    || $('h1').first().text().trim();
  const size = $('span.file-size, [class*="file-size"], [class*="size"]').first().text().trim();
  const icon = $('img.app-icon-img, img.app-icon').first().attr('data-original')
    || $('img[src*="winudf"]').first().attr('src') || '';
  const dev = $('[class*="developer"], .dev-info, [itemprop="author"]').first().text().trim();

  const dlLinks = [];
  $(`a[href*="d.apkpure.net"]`).each((_, a) => {
    const href = $(a).attr('href') || '';
    if (href.includes(pkg)) dlLinks.push(href);
  });

  return {
    name,
    developer: dev,
    pkg,
    version,
    size,
    icon,
    download: `${DL_BASE}/b/APK/${pkg}?version=latest`,
    downloadXapk: `${DL_BASE}/b/XAPK/${pkg}?version=latest`,
    dlLinks: [...new Set(dlLinks)],
    url: forceUrl || `${BASE}/${shortName}/${pkg}`,
  };
}
