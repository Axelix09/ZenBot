/*
© Created by Axelix09 🔥
GitHub: https://github.com/Axelix09
Instagram: @axelix09
Deja los créditos we 🗣️
*/
import fs from 'node:fs';
import { pipeline } from 'node:stream/promises';
import axios from 'axios';
import { runtimePath } from '../runtime/tmpdir.js';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9'
};

function parseFileId(input) {
  const m1 = input.match(/\/d\/([a-zA-Z0-9_-]{20,})\//);
  if (m1) return m1[1];
  const m2 = input.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (m2) return m2[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(input)) return input;
  return null;
}

export async function gdriveInfo(input) {
  const fileId = parseFileId(input);
  if (!fileId) throw new Error('URL o ID de Google Drive inválido.');
  
  const res = await axios.get(`https://drive.google.com/file/d/${fileId}/view`, {
    headers: HEADERS,
    timeout: 10000,
    validateStatus: () => true
  });
  
  const html = res.data || '';
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1]?.replace(' - Google Drive', '').trim() || 'Google Drive File';
  
  return {
    fileId,
    name: title,
    download: `https://drive.google.com/uc?export=download&id=${fileId}`,
    url: `https://drive.google.com/file/d/${fileId}/view`,
  };
}

const openStream = (url) =>
  axios.get(url, { 
    headers: HEADERS, 
    maxRedirects: 0, 
    timeout: 30000, 
    responseType: 'stream', 
    validateStatus: () => true 
  });

async function readText(stream, limit = 2_000_000) {
  const chunks = [];
  let total = 0;
  for await (const chunk of stream) {
    total += chunk.length;
    if (total > limit) break;
    chunks.push(Buffer.from(chunk));
  }
  stream.destroy();
  return Buffer.concat(chunks).toString();
}

export async function gdriveDownload(input, { maxBytes = Infinity } = {}) {
  const fileId = parseFileId(input);
  if (!fileId) throw new Error('URL o ID de Google Drive inválido.');

  let res = await openStream(`https://drive.google.com/uc?export=download&id=${fileId}`);
  let contentType = res.headers['content-type'] || 'application/octet-stream';
  let finalUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

  if (contentType.includes('text/html') || res.status === 302) {
    let downloadUrl = null;
    
    if (res.status === 302 && res.headers.location) {
      downloadUrl = res.headers.location;
    } else {
      const html = await readText(res.data);
    
      const userContentMatch = html.match(/(https:\/\/drive\.usercontent\.google\.com\/download[^"'\s]+)/);
      if (userContentMatch) {
        downloadUrl = userContentMatch[1];
      } else {
        const confirm = html.match(/confirm=([^&"']+)/);
        if (confirm) {
          downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=${confirm[1]}`;
        }
      }
    }

    if (downloadUrl) {
      finalUrl = downloadUrl;
      res = await openStream(downloadUrl);
      contentType = res.headers['content-type'] || contentType;
    } else {
      throw new Error('El archivo no es público, es muy grande o requiere permisos de acceso.');
    }
  }

  if (res.status >= 400) {
    if (res.data.destroy) res.data.destroy();
    throw new Error(`No se pudo obtener el archivo de Google Drive (HTTP ${res.status}).`);
  }

  if (contentType.includes('text/html')) {
    if (res.data.destroy) res.data.destroy();
    throw new Error('Google Drive devolvió una página HTML en lugar del archivo. Verifica que el enlace sea público.');
  }

  const declared = parseInt(res.headers['content-length'] || '0', 10);
  if (declared > maxBytes) {
    if (res.data.destroy) res.data.destroy();
    return { fileId, tooLarge: true, size: declared, contentType, url: finalUrl };
  }

  const filePath = runtimePath('gdrive', 'bin');
  try {
    await pipeline(res.data, fs.createWriteStream(filePath));
  } catch (error) {
    await fs.promises.rm(filePath, { force: true }).catch(() => {});
    throw error;
  }

  const { size } = await fs.promises.stat(filePath);
  if (size > maxBytes) {
    await fs.promises.rm(filePath, { force: true }).catch(() => {});
    return { fileId, tooLarge: true, size, contentType, url: finalUrl };
  }

  return { fileId, path: filePath, contentType, size, url: finalUrl };
}