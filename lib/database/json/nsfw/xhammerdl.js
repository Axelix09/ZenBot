/*
 * © Created by Axelix09 🔥
 * GitHub: https://github.com/Axelix09
 * Instagram: @axelix09
 * Deja los créditos we 🗣️
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

const UA = 'Mozilla/5.0 (Linux; Android 11; Redmi Note 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

function secsToTime(s) {
  if (!s) return null;
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function normalizeUrl(url) {
  return url.replace(/^https?:\/\/[a-z]{2}\.xhamster\.com/, 'https://xhamster.com');
}

function extractMeta($, data) {
  const scripts = $('script').map((_, el) => $(el).html()).get();
  for (const s of scripts) {
    if (!s || !s.includes('"title"') || !s.includes('"duration"')) continue;
    const match = s.match(/"title":"([^"]+)","thumbUrl":"([^"]+)","duration":(\d+),"views":(\d+)/);
    if (match) {
      const title    = JSON.parse(`"${match[1]}"`);
      const thumb    = match[2].replace(/\\\//g, '/');
      const duration = secsToTime(parseInt(match[3]));
      const views    = parseInt(match[4]);
      return { title, thumb, duration, views };
    }
  }
  return {
    title:    $('meta[property="og:title"]').attr('content') || null,
    thumb:    $('meta[property="og:image"]').attr('content') || null,
    duration: null,
    views:    null
  };
}

function extractMasterUrl(data) {
  const mp4Matches = [...new Set(data.match(/https?:\/\/[^\s"'\\]+\.mp4[^\s"'\\]*/g) || [])];
  return mp4Matches[0] || null;
}

function parseM3u8(m3u8, masterUrl) {
  const origin  = new URL(masterUrl).origin;
  const lines   = m3u8.split('\n');
  const streams = {};

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith('#EXT-X-STREAM-INF')) continue;
    const resMatch  = lines[i].match(/RESOLUTION=(\d+x\d+)/);
    const nextLine  = lines[i + 1]?.trim();
    if (!nextLine || !resMatch) continue;
    const qualMatch = nextLine.match(/(\d+p)/);
    const quality   = qualMatch ? qualMatch[1] : resMatch[1];
    const streamUrl = nextLine.startsWith('http') ? nextLine : origin + nextLine;
    streams[quality] = { quality, url: streamUrl, format: 'hls' };
  }

  return streams;
}

export async function xhamsterDownload(url) {
  url = normalizeUrl(url);

  const { data } = await axios.get(url, {
    headers: { 
      'User-Agent': UA,
      'Cookie': 'age_verified=1; cookies_accepted=1'
    },
    timeout: 7000
  });

  const $         = cheerio.load(data);
  const meta      = extractMeta($, data);
  const masterUrl = extractMasterUrl(data);

  if (!masterUrl) throw new Error('No se encontró stream de video.');

  const { data: m3u8 } = await axios.get(masterUrl, {
    headers: { 
      'User-Agent': UA, 
      'Referer': 'https://xhamster.com/',
      'Cookie': 'age_verified=1; cookies_accepted=1'
    },
    timeout: 5000
  });

  const download = parseM3u8(m3u8, masterUrl);
  if (!download || !Object.keys(download).length) throw new Error('No se encontraron calidades.');

  const defaultQuality = Object.keys(download)[0];

  return { 
    ...meta, 
    download, 
    url: download[defaultQuality]?.url || masterUrl 
  };
}

export async function xhamsterDownloadBuffer(url, quality = '720p') {
  return await xhamsterDownload(url);
}