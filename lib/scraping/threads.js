/*
 * © Created by Axelix09 🔥
 * GitHub: https://github.com/Axelix09
 * Instagram: @axelix09
 * Deja los créditos we 🗣️
 */
import axios from 'axios';

const UA = 'Mozilla/5.0 (Linux; Android 11; Redmi Note 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const BASE = 'https://sssthreads.app';

function extractThreadId(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/\/post\/([A-Za-z0-9_-]+)|\/([A-Za-z0-9_-]{10,})/);
  return match ? (match[1] || match[2]) : null;
}

function decodeToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  const rawPart = parts[0] || parts[1] || '';
  const pad = p => p + '='.repeat((4 - p.length % 4) % 4);
  try {
    return JSON.parse(Buffer.from(pad(rawPart), 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

export async function threadsDownload(url) {
  if (!url || typeof url !== 'string' || (!url.includes('threads.net') && !url.includes('threads.com'))) {
    throw new Error('URL de Threads inválida.');
  }

  const cleanUrl = url.split('?')[0].replace('threads.com', 'threads.net').replace(/\/$/, '');
  const videoId = extractThreadId(cleanUrl) || 'unknown';

  try {
    const params = new URLSearchParams();
    params.append('action', 'fetch_source');
    params.append('url', cleanUrl);

    const { data, status } = await axios.post(`${BASE}/`, params, {
      headers: {
        'User-Agent': UA,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': `${BASE}/`,
        'Origin': BASE
      },
      timeout: 10000,
      validateStatus: () => true
    });

    if (status !== 200 || !data?.success || !data?.token) {
      throw new Error('La API no devolvió un token válido. El post puede ser privado.');
    }

    const payload = decodeToken(data.token);
    if (!payload?.v) {
      throw new Error('No se pudo decodificar la URL de medios del token.');
    }

    const mediaUrl = payload.v.replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
    const thumb = payload.t ? payload.t.replace(/\\u0026/g, '&').replace(/&amp;/g, '&') : mediaUrl;
    const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('.mov');
    const type = isVideo ? 'video' : 'image';

    if (type === 'video') {
      return {
        videoId,
        title: 'Threads Video',
        description: 'Threads Video',
        type: 'video',
        thumb,
        hd: mediaUrl,
        sd: mediaUrl,
        audio: null,
        source: 'sssthreads'
      };
    } else {
      return {
        videoId,
        title: 'Threads Image',
        description: 'Threads Image',
        type: 'image',
        thumb,
        image: mediaUrl,
        images: [mediaUrl],
        source: 'sssthreads'
      };
    }

  } catch (error) {
    throw new Error(error.message || 'Error al procesar el enlace de Threads.');
  }
}