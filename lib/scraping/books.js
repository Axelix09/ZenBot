/*
 * © Created by Axelix09 🔥
 * GitHub: https://github.com/Axelix09
 * Instagram: @axelix09
 * Deja los créditos we 🗣️
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

const DOMAINS = ['https://ww3.lectulandia.co', 'https://www.lectulandia.co', 'https://lectulandia.co'];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const HDRS = {
  'User-Agent': UA,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
};

async function resolveAntUpload(url) {
  if (!url || !url.includes('antupload.com/file/')) return null;
  try {
    const res = await axios.get(url, { 
      headers: HDRS, 
      timeout: 8000,
      validateStatus: () => true 
    });
    
    const $ = cheerio.load(res.data || '');
    const finalHref = $('#downloadB').attr('href') || 
                      $('a[href*="/filed/"]').first().attr('href') || 
                      $('.download-btn').attr('href') ||
                      $('a.btn.btn-primary').attr('href');
                      
    if (finalHref) {
      return finalHref.startsWith('http') ? finalHref : 'https://www.antupload.com' + finalHref;
    }
  } catch {}
  return null;
}

async function fetchLectulandia(endpoint) {
  let lastError = null;
  
  for (const base of DOMAINS) {
    const targetUrl = endpoint.startsWith('http') ? endpoint : `${base}${endpoint}`;
    try {
      const res = await axios.get(targetUrl, { 
        headers: HDRS, 
        timeout: 8000, 
        validateStatus: () => true 
      });
      
      if (res.status === 200 && res.data && res.data.length > 1000) {
        return { data: res.data, base };
      }
    } catch (e) {
      lastError = e;
    }
    
    try {
      const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
      const resProxy = await axios.get(proxyUrl, { timeout: 10000, validateStatus: () => true });
      if (resProxy.status === 200 && typeof resProxy.data === 'string' && resProxy.data.length > 1000) {
        if (!resProxy.data.includes('502 Bad Gateway') && !resProxy.data.includes('proxy error')) {
          return { data: resProxy.data, base };
        }
      }
    } catch {}
  }
  
  throw new Error('No se pudo conectar con Lectulandia. Intenta de nuevo más tarde.');
}

export async function bookSearch(query, limit = 10) {
  const { data, base } = await fetchLectulandia(`/search/${encodeURIComponent(query)}`);
  const $ = cheerio.load(data);
  const results = [];
  
  $('article.card').each((i, el) => {
    if (results.length >= limit) return false;
    
    let href = $(el).find('a.card-click-target').attr('href') || 
               $(el).find('a').first().attr('href') || '';
               
    if (href && !href.startsWith('http')) {
      href = href.startsWith('/') ? href : '/' + href;
    }
    
    const url = href.startsWith('http') ? href : base + href;

    const title = $(el).find('img.cover').attr('alt')?.trim() || 
                  $(el).find('h2 a').text().trim() || 
                  $(el).find('h2').text().trim();
                  
    const thumb = $(el).find('img.cover').attr('src') || '';
    const author = $(el).find('a[href*="/autor/"]').first().text().trim() || 'Desconocido';
    const genre = $(el).find('a[href*="/genero/"]').first().text().trim() || null;
    
    if (!title || !url || url === base) return;
    
    results.push({ title, author, thumb, url, genre });
  });
  
  if (!results.length) throw new Error('Sin resultados de libros. Verifica el título o autor.');
  return results;
}

export async function bookInfo(url) {
  const { data, base } = await fetchLectulandia(url);
  const $ = cheerio.load(data);
  
  const title = $('h1').not('.site-title').first().text().trim() || 
                $('title').text().split(' - ')[0].trim() || 
                $('h1').first().text().trim();
                
  const author = $('#autor').text().replace(/^Autor:\s*/i, '').trim() || 
                 $('a[href*="/autor/"]').first().text().trim() || 'Desconocido';
                 
  const genre = $('a[href*="/genero/"]').first().text().replace(/^Genero:\s*/i, '').trim() || null;
  const year = $('#publicado').text().replace(/^Publicado:\s*/i, '').trim() || null;
  
  let description = '';
  $('#book .description, #content .description, .book .description, #resumen').each((_, el) => {
    const txt = $(el).text().trim();
    if (txt.length > description.length) description = txt;
  });
  
  if (!description) {
    description = $('meta[property="og:description"]').attr('content')?.trim() || '';
  }
  
  let thumb = $('meta[property="og:image"]').attr('content') || 
              $('img.cover').attr('src') || '';
              
  if (thumb && !thumb.startsWith('http')) {
    thumb = thumb.startsWith('/') ? base + thumb : base + '/' + thumb;
  }
  
  const getAntUploadLink = (href) => {
    if (!href) return null;
    const dMatch = href.match(/[?&]d=([^&]+)/);
    if (dMatch && dMatch[1]) {
      try {
        const decoded = Buffer.from(dMatch[1], 'base64').toString('utf-8');
        return 'https://www.antupload.com/file/' + decoded;
      } catch {}
    }
    return href.startsWith('http') ? href : base + href;
  };
  
  let epubLink = null;
  let pdfLink = null;
  
  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (href.includes('download.php') || href.includes('?d=')) {
      const tVal = href.match(/[?&]t=(\d+)/)?.[1];
      if (tVal === '1') epubLink = getAntUploadLink(href);
      if (tVal === '2') pdfLink = getAntUploadLink(href);
    }
  });
  
  if (!epubLink) epubLink = getAntUploadLink($('a#download1').attr('href') || $('a:contains("EPUB")').attr('href') || '');
  if (!pdfLink) pdfLink = getAntUploadLink($('a#download2').attr('href') || $('a:contains("PDF")').attr('href') || '');
  
  const [finalEpub, finalPdf] = await Promise.all([
    resolveAntUpload(epubLink),
    resolveAntUpload(pdfLink)
  ]);
  
  return {
    title,
    author,
    description: description.replace(/\s+/g, ' ').slice(0, 1000),
    genre,
    year,
    thumb,
    url,
    download: {
      epub: finalEpub || epubLink || null,
      pdf: finalPdf || pdfLink || null,
    }
  };
}