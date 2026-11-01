/*
 * © Created by Axelix09 🔥
 * GitHub: https://github.com/Axelix09
 * Instagram: @axelix09
 * Deja los créditos we 🗣️
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

const UA = 'Mozilla/5.0 (Linux; Android 11; Redmi Note 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

function extractVideoId(url) {
  if (!url || typeof url !== 'string') return null;
  const patterns = [
    /status\/(\d+)/,
    /\/(\d{10,})/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export async function twtDownload(url) {
  if (!url || typeof url !== 'string' || (!url.includes('twitter.com') && !url.includes('x.com') && !url.includes('t.co'))) {
    throw new Error('URL de Twitter/X inválida.');
  }

  const cleanUrl = url.split('?')[0].split('#')[0].trim();
  const videoId = extractVideoId(cleanUrl) || extractVideoId(url) || '';

  try {
    const { data: html } = await axios.get('https://x2twitter.com/es4', {
      headers: { 'User-Agent': UA },
      timeout: 10000
    });

    const tokenMatch = html.match(/k_token=["'](.*?)["']/);
    const expMatch = html.match(/k_exp=["'](.*?)["']/);
    
    const k_token = tokenMatch ? tokenMatch[1] : '';
    const k_exp = expMatch ? expMatch[1] : '';

    if (!k_token || !k_exp) {
      throw new Error('No se pudieron extraer los tokens de seguridad.');
    }

    const { data } = await axios.post(
      'https://x2twitter.com/api/ajaxSearch',
      new URLSearchParams({
        q: cleanUrl,
        t: 'media',
        lang: 'es',
        token: k_token,
        exp: k_exp
      }),
      {
        headers: {
          'User-Agent': UA,
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Referer': 'https://x2twitter.com/es4',
          'Origin': 'https://x2twitter.com',
          'X-Requested-With': 'XMLHttpRequest'
        },
        timeout: 15000
      }
    );

    if (data.status !== 'ok') {
      throw new Error(data.msg || 'Error al procesar la solicitud.');
    }

    const responseHtml = data.data;
    if (!responseHtml || typeof responseHtml !== 'string') {
      throw new Error('Respuesta inválida del servidor.');
    }

    const $ = cheerio.load(responseHtml);
    const thumb = $('.thumbnail img').attr('src') || $('.image-tw img').attr('src') || '';
    
    const downloadLinks = [];
    let hasVideo = false;
    let hasImage = false;

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim().toLowerCase();

      if (href && (href.includes('snapcdn.app') || href.includes('twimg.com'))) {
        if (text.includes('mp4') || text.includes('video')) hasVideo = true;
        if (text.includes('imagen') || text.includes('photo') || text.includes('jpg') || text.includes('png')) hasImage = true;
        
        downloadLinks.push({ href, text });
      }
    });

    if (!downloadLinks.length) {
      throw new Error('No se encontraron enlaces de descarga. El tweet puede ser privado o no tener media.');
    }

    const isImageOnly = !hasVideo && hasImage;

    if (isImageOnly) {
      const images = downloadLinks.map(l => l.href);
      return {
        videoId,
        title: 'Twitter Image',
        description: 'Twitter Image',
        type: 'image',
        thumb: thumb || images[0],
        image: images[0],
        images: images,
        source: 'x2twitter'
      };
    }

    let hd = null;
    let sd = null;
    let audio = null;
    const images = [];

    for (const link of downloadLinks) {
      if (link.text.includes('mp3') || link.text.includes('audio')) {
        audio = link.href;
      } else if (link.text.includes('mp4')) {
        const resMatch = link.text.match(/(\d+)p/);
        const res = resMatch ? parseInt(resMatch[1]) : 0;
        if (res >= 720) hd = link.href;
        else sd = link.href;
      } else if (link.text.includes('imagen') || link.text.includes('photo') || link.text.includes('jpg') || link.text.includes('png')) {
        if (!images.includes(link.href)) images.push(link.href);
      }
    }

    if (!hd && sd) hd = sd;

    return {
      videoId,
      title: 'Twitter Video',
      description: 'Twitter Video',
      type: 'video',
      thumb,
      hd,
      sd,
      audio: audio || null,
      images: images.length > 0 ? images : undefined,
      source: 'x2twitter'
    };

  } catch (error) {
    throw new Error(error.message || 'Error al procesar el enlace de Twitter/X.');
  }
}