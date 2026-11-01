import axios from 'axios';

export const SAMU_BASE = 'https://api.samu330.com';

const UA = 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

const http = axios.create({
  baseURL: SAMU_BASE,
  timeout: 30000,
  headers: { 'User-Agent': UA, Accept: 'application/json' }
});

async function call(path, params, timeout) {
  const { data } = await http.get(path, { params, timeout });
  if (!data || data.success === false || data.status === false) {
    throw new Error(data?.error || data?.message || 'samu_error');
  }
  return data;
}

const list = (v) => (Array.isArray(v) ? v : []);

const body = (res) => (res?.data && !Array.isArray(res.data) ? res.data : res);

function firstArray(res, keys) {
  for (const k of keys) {
    const v = res?.[k] ?? res?.data?.[k];
    if (Array.isArray(v) && v.length) return v;
  }
  return Array.isArray(res?.data) ? res.data : [];
}

function collectUrls(node, out = [], depth = 0) {
  if (node == null || depth > 6) return out;
  if (typeof node === 'string') {
    if (/^https?:\/\//i.test(node)) out.push(node);
    return out;
  }
  if (Array.isArray(node)) {
    node.forEach((n) => collectUrls(n, out, depth + 1));
    return out;
  }
  if (typeof node === 'object') Object.values(node).forEach((n) => collectUrls(n, out, depth + 1));
  return out;
}

export function height(label) {
  const t = String(label || '');
  const p = t.match(/(\d{3,4})\s*p/i);
  if (p) return Number(p[1]);
  const x = t.match(/\d+\s*[x×]\s*(\d{3,4})/i);
  if (x) return Number(x[1]);
  const n = t.match(/\d{3,4}/);
  return n ? Number(n[0]) : 0;
}

const byQuality = (a, b) => height(b.quality || b.resolution) - height(a.quality || a.resolution);

export function pickQuality(items, maxHeight = 720) {
  const sorted = [...items].sort(byQuality);
  return sorted.find((i) => {
    const h = height(i.quality || i.resolution);
    return h > 0 && h <= maxHeight;
  }) || sorted[sorted.length - 1] || null;
}

export function fmtSec(total) {
  const s = Math.max(0, Math.floor(Number(total) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}

function normalizeSearch(res, keys) {
  return firstArray(res, keys)
    .map((v) => ({
      title: v.title || v.name || '',
      url: v.url || v.link || '',
      duration: v.duration || v.length || '-',
      thumbnail: v.thumbnail || v.thumb || v.cover || null,
      views: v.views || null,
      uploader: v.uploader || v.author || null
    }))
    .filter((v) => v.url);
}

export async function samuTikTok(url) {
  const d = body(await call('/tiktok/download', { url }, 40000));
  const downloads = list(d.downloads).filter((o) => o?.url);
  const isAudio = (o) => /audio|music|mp3/i.test(`${o.type} ${o.text}`);
  const videos = downloads.filter((o) => !isAudio(o) && !/image/i.test(o.type || ''));
  const best = videos.find((o) => /hd|sin marca|no.?water|nowm/i.test(`${o.type} ${o.text}`)) || videos[0];
  const music = downloads.find(isAudio);
  const images = list(d.images).filter((i) => typeof i === 'string' && i);
  if (!best && !images.length) throw new Error('samu_sin_media');
  return {
    title: d.description || 'TikTok Media',
    images,
    music: music?.url || null,
    videoUrl: best?.url || null
  };
}

export async function samuTikTokSearch(query, count = 4) {
  const res = await call('/tiktok/search', { keywords: query.trim() }, 30000);
  const items = firstArray(res, ['videos'])
    .filter((v) => v?.play)
    .slice(0, count)
    .map((v) => ({
      url: v.play,
      title: v.title || 'Sin descripción',
      author: v.author?.nickname || v.author?.uniqueId || 'TikTok User',
      duration: v.duration || 0,
      plays: v.playCount || 0,
      images: []
    }));
  if (!items.length) throw new Error('samu_sin_resultados');
  return items;
}

export async function samuFacebook(url) {
  const res = await call('/fb-ig/dl', { url }, 40000);
  const formats = list(res.formats ?? res.data?.formats).filter((f) => f?.url && !/image|audio/i.test(f.type || ''));
  const best = pickQuality(formats, 1080);
  if (!best) throw new Error('samu_sin_video');
  return {
    title: best.filename || '',
    videoUrl: best.url,
    thumbnail: res.thumbnail || best.thumbnail || null
  };
}

export async function samuInstagram(url) {
  const res = await call('/fb-ig/dl', { url }, 40000);
  let items = firstArray(res, ['data']).filter((i) => i?.url);
  if (!items.length) items = list(res.formats).filter((i) => i?.url);
  items = items.map((i) => ({
    type: /video/i.test(i.type || '') || /\.mp4(\?|$)/i.test(i.url) ? 'video' : 'image',
    url: i.url,
    quality: 'HD'
  }));
  if (!items.length) throw new Error('samu_sin_media');
  return { type: 'post', items };
}

export async function samuTwitter(url) {
  const d = body(await call('/twitter', { url }, 40000));
  const videos = list(d.videos).filter((v) => v?.url).sort(byQuality);
  const images = list(d.images).map((i) => (typeof i === 'string' ? i : i?.url)).filter(Boolean);
  if (!videos.length && !images.length) throw new Error('samu_sin_media');
  return {
    type: videos.length ? 'video' : 'image',
    hd: videos[0]?.url || null,
    sd: videos[videos.length - 1]?.url || null,
    images,
    videoId: d.tweetId || null,
    audio: null
  };
}

export async function samuPinterest(url) {
  const d = body(await call('/pinterest/download', { url }, 40000));
  const urls = collectUrls(d);
  const video = urls.find((u) => /\.mp4(\?|$)/i.test(u)) || null;
  const images = urls.filter((u) => /\.(jpe?g|png|webp)(\?|$)/i.test(u));
  const image = images.find((u) => /originals/i.test(u)) || images[0] || null;
  if (!video && !image) throw new Error('samu_sin_media');
  return {
    type: video ? 'video' : 'image',
    video,
    image,
    title: d.title || d.description || ''
  };
}

export async function samuPinterestSearch(query, count = 5) {
  const res = await call('/pinterest/search', { q: query.trim() }, 30000);
  const items = firstArray(res, ['results', 'pins', 'images', 'items']);
  const out = [];
  for (const item of items) {
    const urls = typeof item === 'string' ? [item] : collectUrls(item);
    const img = urls.find((u) => /\.(jpe?g|png|webp)(\?|$)/i.test(u) && /originals|736x|564x|474x/i.test(u))
      || urls.find((u) => /\.(jpe?g|png|webp)(\?|$)/i.test(u));
    if (img) out.push({ url: img, title: typeof item === 'object' ? (item.title || item.description || '') : '' });
    if (out.length >= count) break;
  }
  if (!out.length) throw new Error('samu_sin_resultados');
  return out;
}

export async function samuSpotify(url) {
  const d = body(await call('/spotify', { url }, 60000));
  const dl = list(d.downloads).filter((o) => o?.url);
  const pick = dl.find((o) => /mp3/i.test(o.label || '')) || dl[0];
  if (!pick) throw new Error('samu_sin_audio');
  return {
    name: d.title || 'Spotify',
    artist: d.artist || '—',
    album: d.album || '—',
    year: d.releaseYear || null,
    duration: d.duration || '—',
    cover: d.cover || null,
    mp3: pick.url
  };
}

export async function samuSpotifySearch(query, count = 8) {
  const res = await call('/spotify/search', { q: query.trim() }, 30000);
  const items = firstArray(res, ['tracks', 'results', 'items']).slice(0, count).map((t) => ({
    name: t.name || t.title || 'Sin título',
    artist: Array.isArray(t.artists) ? t.artists.join(', ') : (t.artist || '—'),
    album: t.album || '—',
    duration: t.duration || '—',
    explicit: Boolean(t.explicit),
    cover: t.cover || null,
    url: t.url || ''
  })).filter((t) => t.url);
  if (!items.length) throw new Error('samu_sin_resultados');
  return items;
}

export async function samuXvideos(url) {
  const d = body(await call('/xvideos/info', { url }, 40000));
  const meta = d.metadata || {};
  const formats = list(d.formats)
    .filter((f) => f?.directUrl && !/m3u8/i.test(`${f.extension} ${f.directUrl}`))
    .map((f) => ({ ...f, url: f.directUrl }));
  const best = pickQuality(formats, 720);
  if (!best) throw new Error('samu_sin_video');
  const low = [...formats].sort(byQuality).pop();
  return {
    status: true,
    title: meta.title || 'Video',
    duration: meta.durationSeconds ? fmtSec(meta.durationSeconds) : '-',
    uploader: meta.uploader || '-',
    thumbnail: meta.thumbnail || null,
    downloads: { high: best.url, low: low?.url || best.url }
  };
}

export async function samuXvideosSearch(query) {
  const items = normalizeSearch(await call('/xvideos/search', { q: query.trim() }, 30000), ['results', 'videos', 'items']);
  if (!items.length) throw new Error('samu_sin_resultados');
  return items;
}

export async function samuPornhub(url) {
  const d = body(await call('/ph/download', { url }, 45000));
  const videos = list(d.videos).filter((v) => v?.url).sort(byQuality);
  if (!videos.length) throw new Error('samu_sin_video');
  return {
    title: d.title || 'Video',
    duration: d.durationFormatted || '-',
    thumbnail: d.thumbnail || null,
    videos
  };
}

export const samuPhProxy = (mediaUrl) => `${SAMU_BASE}/ph/proxy?url=${encodeURIComponent(mediaUrl)}`;

export async function samuPornhubSearch(query) {
  const items = normalizeSearch(await call('/ph/search', { q: query.trim() }, 30000), ['results', 'videos', 'items']);
  if (!items.length) throw new Error('samu_sin_resultados');
  return items;
}

export async function samuXhamster(url) {
  const d = body(await call('/xhamster/info', { url }, 45000));
  const meta = d.metadata || d;
  const formats = list(d.formats ?? d.videos)
    .map((f) => ({ ...f, url: f?.directUrl || f?.url }))
    .filter((f) => f.url);
  const urls = collectUrls(d);
  const mp4Format = pickQuality(formats.filter((f) => /\.mp4(\?|$)/i.test(f.url)), 720);
  const mp4 = mp4Format?.url || urls.find((u) => /\.mp4(\?|$)/i.test(u)) || null;
  const m3u8 = formats.find((f) => /\.m3u8/i.test(f.url))?.url || urls.find((u) => /\.m3u8/i.test(u)) || null;
  if (!mp4 && !m3u8) throw new Error('samu_sin_video');
  return {
    title: meta.title || 'Video',
    duration: meta.durationSeconds ? fmtSec(meta.durationSeconds) : (meta.durationFormatted || meta.duration || '-'),
    thumbnail: meta.thumbnail || null,
    mp4,
    m3u8
  };
}

export async function samuXhamsterConvert(m3u8) {
  const r = await http.get('/xhamster/convert', { params: { m3u8 }, responseType: 'stream', timeout: 60000 });
  if (/json/i.test(String(r.headers['content-type'] || ''))) {
    let raw = '';
    for await (const chunk of r.data) raw += chunk;
    const urls = collectUrls(JSON.parse(raw));
    return urls.find((u) => /\.mp4(\?|$)/i.test(u)) || urls[0] || null;
  }
  r.data.destroy();
  return `${SAMU_BASE}/xhamster/convert?m3u8=${encodeURIComponent(m3u8)}`;
}

export async function samuXhamsterSearch(query) {
  const items = normalizeSearch(await call('/xhamster/search', { q: query.trim() }, 30000), ['results', 'videos', 'items']);
  if (!items.length) throw new Error('samu_sin_resultados');
  return items;
}
