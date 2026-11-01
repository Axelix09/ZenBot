/*
 * © Created by Axelix09 🔥
 * GitHub: https://github.com/Axelix09
 * Instagram: @axelix09
 * Deja los créditos we 🗣️
 */
import axios from 'axios';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const BASE = 'https://deezdownloaders.com';
const DEEZER_API = 'https://api.deezer.com';

const HEADERS = {
  'User-Agent': UA,
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'X-Requested-With': 'XMLHttpRequest',
  'Referer': `${BASE}/`,
  'Origin': BASE
};

export async function deezerSearch(query, limit = 10) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new Error('Se requiere una búsqueda válida.');
  }
  
  const count = Math.min(Math.max(Number(limit) || 10, 1), 50);
  
  const { data } = await axios.get(`${DEEZER_API}/search`, {
    params: { q: query.trim(), limit: count },
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    timeout: 12000,
  });
  
  if (!Array.isArray(data?.data)) {
    throw new Error('La API de Deezer no devolvió resultados.');
  }
  
  return data.data.slice(0, count).map(t => ({
    id: t.id,
    title: t.title,
    duration: t.duration,
    preview: t.preview,
    explicit: Boolean(t.explicit_lyrics),
    link: t.link,
    artist: { id: t.artist?.id, name: t.artist?.name, picture: t.artist?.picture_medium },
    album: { id: t.album?.id, title: t.album?.title, cover: t.album?.cover_medium, cover_xl: t.album?.cover_xl },
  }));
}

export async function deezerDownload(trackId, format = 'mp3') {
  const trackUrl = `https://www.deezer.com/track/${trackId}`;
  
  const { data: trackMeta } = await axios.get(`${BASE}/api/track.php`, {
    params: { url: trackUrl },
    headers: {
      'User-Agent': UA,
      'Accept': 'application/json',
      'Referer': BASE
    },
    timeout: 15000
  });
  
  if (!trackMeta || !trackMeta.name || !trackMeta.artist) {
    throw new Error('No se pudo obtener metadata del track.');
  }
  
  const { data: downloadResponse } = await axios.post(
    `${BASE}/api/downloader.php`,
    new URLSearchParams({
      name: trackMeta.name,
      artist: trackMeta.artist,
      url: trackUrl,
      quality: '128',
      zip_download: 'false'
    }),
    {
      headers: {
        ...HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 60000
    }
  );
  
  if (!downloadResponse.success || !downloadResponse.dlink) {
    throw new Error(downloadResponse.reason || 'Error al generar enlace de descarga.');
  }
  
  const dlRes = await axios.get(downloadResponse.dlink, {
    headers: {
      'User-Agent': UA,
      'Referer': `${BASE}/track.php`
    },
    responseType: 'arraybuffer',
    timeout: 120000
  });
  
  const buffer = Buffer.from(dlRes.data);
  
  const header = buffer.subarray(0, 10);
  if (header[0] !== 0x49 || header[1] !== 0x44 || header[2] !== 0x33) {
    if (header[0] !== 0xFF || header[1] !== 0xFB) {
      throw new Error('El archivo descargado no es un MP3 válido.');
    }
  }
  
  return {
    buffer,
    ext: 'mp3',
    mimeType: 'audio/mpeg',
    size: buffer.length,
    title: trackMeta.name,
    artist: trackMeta.artist,
    album: trackMeta.album || null,
    duration: trackMeta.duration,
    cover: trackMeta.thumb || null
  };
}

export async function deezerTrack(query, host = '') {
  const results = await deezerSearch(query, 1);
  if (!results.length) throw new Error('No se encontraron resultados.');
  const track = results[0];
  return {
    title: track.title,
    artist: track.artist.name,
    album: track.album.title || null,
    duration: track.duration,
    cover: track.album.cover_xl,
    preview: track.preview,
    link: track.link,
    explicit: track.explicit,
    mp3: `${host}/api/deezer/stream?id=${track.id}&format=mp3`,
    flac: `${host}/api/deezer/stream?id=${track.id}&format=flac`
  };
}