import { writeFile, readFile, unlink } from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import axios from 'axios';
import { fileTypeFromBuffer } from 'file-type';
import crypto from 'crypto';
import webp from 'node-webpmux';

const tmp = tmpdir();

let ffmpegAvailable = null;

export async function hasFFmpeg() {
  if (ffmpegAvailable !== null) return ffmpegAvailable;
  ffmpegAvailable = await new Promise((resolve) => {
    try {
      const proc = spawn('ffmpeg', ['-version']);
      proc.on('close', (code) => resolve(code === 0));
      proc.on('error', () => resolve(false));
    } catch {
      resolve(false);
    }
  });
  return ffmpegAvailable;
}

let ffmpegFpsArgs = null;

/** `-vsync` fue eliminado en FFmpeg 7; `-fps_mode` no existe antes de 5.1. */
async function fpsArgs() {
  if (ffmpegFpsArgs) return ffmpegFpsArgs;
  const info = await new Promise((resolve) => {
    try {
      const proc = spawn('ffmpeg', ['-version']);
      let out = '';
      proc.stdout.on('data', (chunk) => { out += chunk.toString(); });
      proc.on('close', () => resolve(out));
      proc.on('error', () => resolve(''));
    } catch {
      resolve('');
    }
  });
  const match = /ffmpeg version n?(\d+)\.(\d+)/i.exec(info);
  const major = match ? Number(match[1]) : 0;
  ffmpegFpsArgs = major >= 5 ? ['-fps_mode', 'passthrough'] : ['-vsync', '0'];
  return ffmpegFpsArgs;
}

async function staticImageToWebp(buffer) {
  const sharp = (await import('sharp')).default;
  return sharp(buffer, { animated: false })
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();
}

function buildExif(packname, author, emojis = ['✨']) {
  const json = {
    'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
    'sticker-pack-name': packname,
    'sticker-pack-publisher': author,
    emojis
  };
  const exifAttr = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00,
    0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00
  ]);
  const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
  const exif = Buffer.concat([exifAttr, jsonBuffer]);
  exif.writeUIntLE(jsonBuffer.length, 14, 4);
  return exif;
}

async function attachExif(webpBuffer, packname, author, emojis) {
  try {
    const img = new webp.Image();
    await img.load(webpBuffer);
    img.exif = buildExif(packname, author, emojis);
    return await img.save(null);
  } catch {
    return webpBuffer;
  }
}

export async function addExif(webpBuffer, packname, author) {
  return attachExif(webpBuffer, packname || 'ZenBot', author || 'ZenBot');
}

export async function addExifWithUser(webpBuffer, userName) {
  return attachExif(webpBuffer, 'Creado por ZenBot', `Para: ${userName || 'Usuario'}`);
}

async function runFFmpeg(inputPath, outputPath, isVideo = false) {
  const fps = isVideo ? await fpsArgs() : [];
  return new Promise((resolve, reject) => {
    const common = [
      '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
      '-vcodec', 'libwebp',
      '-compression_level', '6',
      '-q:v', '80'
    ];
    const args = [
      '-i', inputPath,
      ...(isVideo
        ? [
            ...common,
            '-loop', '0',
            '-t', '00:00:09.5',
            ...fps,
            '-an',
            '-s', '512:512'
          ]
        : [
            ...common,
            '-frames:v', '1',
            '-an',
            '-s', '512:512'
          ]),
      '-y',
      outputPath
    ];

    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';

    ffmpeg.stderr.on('data', (data) => { stderr += data.toString(); });

    ffmpeg.on('close', async (code) => {
      try { await unlink(inputPath).catch(() => {}); } catch {}
      if (code !== 0) {
        try { await unlink(outputPath).catch(() => {}); } catch {}
        return reject(new Error(`ffmpeg error (${code}): ${stderr.slice(0, 300)}`));
      }
      try {
        resolve(await readFile(outputPath));
      } catch (e) {
        reject(e);
      } finally {
        try { await unlink(outputPath).catch(() => {}); } catch {}
      }
    });

    ffmpeg.on('error', (err) => reject(new Error(`ffmpeg no encontrado: ${err.message}`)));
  });
}

export async function stickerFromBuffer(buffer, { isVideo = false, userName = 'Usuario' } = {}) {
  const type = await fileTypeFromBuffer(buffer);
  const mime = type?.mime || '';
  const video = isVideo || mime.startsWith('video/');
  const image = mime.startsWith('image/');

  if (!video && !image) {
    throw new Error('Formato no soportado para sticker');
  }

  if (!video && !(await hasFFmpeg())) {
    return attachExif(await staticImageToWebp(buffer), 'Creado por ZenBot', `Para: ${userName}`);
  }

  const ext = type?.ext ? `.${type.ext}` : video ? '.mp4' : '.png';
  const inputPath = path.join(tmp, `${randomUUID()}${ext}`);
  const outputPath = path.join(tmp, `${randomUUID()}.webp`);
  await writeFile(inputPath, buffer);

  try {
    let webpBuffer = await runFFmpeg(inputPath, outputPath, video);
    return await attachExif(webpBuffer, 'Creado por ZenBot', `Para: ${userName}`);
  } catch (error) {
    if (!video) {
      try {
        return await attachExif(await staticImageToWebp(buffer), 'Creado por ZenBot', `Para: ${userName}`);
      } catch {}
    }
    throw error;
  } finally {
    try { await unlink(inputPath).catch(() => {}); } catch {}
    try { await unlink(outputPath).catch(() => {}); } catch {}
  }
}

export async function stickerBufferFromUrl(url, options = {}) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
    headers: { 'User-Agent': 'Mozilla/5.0', ...(options.headers || {}) }
  });
  return stickerFromBuffer(Buffer.from(res.data), {
    isVideo: Boolean(options.isVideo),
    userName: options.userName
  });
}

export async function sendImageAsSticker(conn, jid, buffer, m, options = {}) {
  const sticker = await stickerFromBuffer(buffer, { isVideo: false, userName: options.userName });
  return conn.sendMessage(jid, {
    sticker,
    contextInfo: options.contextInfo || {}
  }, { quoted: m });
}

export async function sendVideoAsSticker(conn, jid, buffer, m, options = {}) {
  const sticker = await stickerFromBuffer(buffer, { isVideo: true, userName: options.userName });
  return conn.sendMessage(jid, {
    sticker,
    contextInfo: options.contextInfo || {}
  }, { quoted: m });
}

export async function stickerToImage(buffer) {
  const inputPath = path.join(tmp, `${randomUUID()}.webp`);
  const outputPath = inputPath.replace('.webp', '.png');
  await writeFile(inputPath, buffer);

  try {
    if (await hasFFmpeg()) {
      await new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', ['-i', inputPath, '-y', outputPath]);
        ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg error: ${code}`))));
        ffmpeg.on('error', (err) => reject(err));
      });
      return await readFile(outputPath);
    }
    const sharp = (await import('sharp')).default;
    return await sharp(buffer).png().toBuffer();
  } finally {
    try { await unlink(inputPath).catch(() => {}); } catch {}
    try { await unlink(outputPath).catch(() => {}); } catch {}
  }
}

function unwrapMedia(message) {
  let current = message;
  for (let i = 0; i < 5 && current; i++) {
    const wrapper = ['ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension', 'documentWithCaptionMessage']
      .find((key) => current[key]?.message);
    if (!wrapper) break;
    current = current[wrapper].message;
  }
  return current || {};
}

export async function downloadMediaBuffer(conn, msg) {
  try {
    const mediaMsg = unwrapMedia(msg.message);
    const mtype = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage']
      .find((key) => mediaMsg[key]);
    if (!mtype) return null;
    return await conn.downloadMedia(mediaMsg, mtype.replace('Message', '').toLowerCase());
  } catch {
    return null;
  }
}

export async function handleMediaMessage(conn, m) {
  const buffer = await downloadMediaBuffer(conn, m);
  if (!buffer) throw new Error('No se pudo descargar el media');
  return stickerFromBuffer(buffer, { userName: 'Usuario' });
}

export async function checkFFmpeg() {
  return await hasFFmpeg();
}
