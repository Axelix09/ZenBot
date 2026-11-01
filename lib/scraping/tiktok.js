/*
 * © Created by Axelix09 🔥
 * GitHub: https://github.com/Axelix09
 * Instagram: @axelix09
 * Deja los créditos we 🗣️
 */
import axios from 'axios';

const UA = 'Mozilla/5.0 (Linux; Android 11; Redmi Note 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

export async function tiktokDownload(url) {
  if (!url || typeof url !== 'string' || !url.trim()) {
    throw new Error('Se requiere una URL de TikTok válida.');
  }

  const cleanUrl = url.split('?')[0].split('#')[0].trim();

  try {
    const { data } = await axios.post(
      'https://www.tikwm.com/api/',
      new URLSearchParams({ url: cleanUrl, hd: 1 }),
      {
        headers: {
          'User-Agent': UA,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json, text/javascript, */*; q=0.01'
        },
        timeout: 6000,
        validateStatus: () => true
      }
    );

    if (!data || data.code !== 0 || !data.data) {
      throw new Error(data?.msg || 'No se pudo procesar la URL de TikTok. Verificá que sea pública.');
    }

    const d = data.data;
    const title = d.title || 'TikTok Media';
    const thumbnail = d.cover || d.origin_cover || '';

    if (Array.isArray(d.images) && d.images.length > 0) {
      return {
        title,
        thumbnail,
        type: 'images',
        images: d.images,
        imagesWm: d.images,
        music: d.music || null,
        source: 'tikwm'
      };
    }

    const sdUrl = d.play || '';
    const hdUrl = d.hdplay || d.play || '';

    if (!sdUrl) {
      throw new Error('No se encontró URL de descarga de video.');
    }

    return {
      title,
      thumbnail,
      type: 'video',
      download: {
        sd: sdUrl,
        hd: hdUrl,
        hdApi: hdUrl
      },
      music: d.music || null,
      source: 'tikwm'
    };
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('Límite de solicitudes alcanzado. Reintentá en un momento.');
    }
    throw error;
  }
}

export async function snaptikDownload(url) {
  return tiktokDownload(url);
}