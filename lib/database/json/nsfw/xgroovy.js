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
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0'
};

export async function xgroovyRandom(limit = 8) {
  const url = 'https://xgroovy.com/gay/photos/';

  try {
    const { data } = await axios.get(url, {
      headers: HEADERS,
      timeout: 10000, // Reducido a 10s para fallar rápido si hay problema
      validateStatus: () => true
    });

    if (data.includes('cf-browser-verification') || data.includes('Checking your browser')) {
      throw new Error('Cloudflare bloqueó la petición.');
    }

    const $ = cheerio.load(data);
    const results = [];
    const seenUrls = new Set();

    $('a').each((_, el) => {
      if (results.length >= limit) return false;

      const href = $(el).attr('href') || '';
      if (!href.includes('/photos/')) return;
      
      const fullUrl = href.startsWith('http') ? href : `https://xgroovy.com${href}`;
      if (seenUrls.has(fullUrl)) return;
      seenUrls.add(fullUrl);

      const img = $(el).find('img.thumb').first();
      if (!img.length) return;

      const thumb = img.attr('src') || '';
      const titleStrong = $(el).find('strong.title').first().text().trim();
      const title = titleStrong || img.attr('alt') || 'Foto';

      if (thumb && title.length > 3) {
        results.push({
          title: title.replace(/_/g, ' ').replace(/-/g, ' ').trim(),
          url: fullUrl,
          thumb: thumb.startsWith('http') ? thumb : `https:${thumb}`
        });
      }
    });

    for (let i = results.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [results[i], results[j]] = [results[j], results[i]];
    }

    return results;
  } catch (error) {
    if (error.response?.status === 403 || error.response?.status === 429) {
      throw new Error('Acceso denegado o límite de peticiones alcanzado.');
    }
    throw new Error(`Error al obtener fotos: ${error.message}`);
  }
}

export async function xgroovyPhotoInfo(url) {
  if (!url || !url.includes('xgroovy.com')) {
    throw new Error('URL de Xgroovy inválida.');
  }

  try {
    const { data } = await axios.get(url, {
      headers: HEADERS,
      timeout: 10000, // Reducido a 10s
      validateStatus: () => true
    });

    if (data.includes('cf-browser-verification') || data.includes('Checking your browser')) {
      throw new Error('Cloudflare bloqueó la petición.');
    }

    const $ = cheerio.load(data);
    
    const title = $('h1.title').text().trim() || 
                  $('meta[property="og:title"]').attr('content') || 
                  $('title').text().replace(' - Xgroovy', '').trim() || 
                  'Foto';
    
    const imageUrl = $('meta[property="og:image"]').attr('content') || 
                     $('img.photo-img').attr('src') || 
                     $('img.photo-img').attr('data-src') || 
                     null;

    if (!imageUrl) {
      throw new Error('No se encontró la imagen en la página.');
    }

    return {
      title,
      imageUrl: imageUrl.startsWith('http') ? imageUrl : `https:${imageUrl}`
    };
  } catch (error) {
    throw new Error(`Error al obtener la foto: ${error.message}`);
  }
}