import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_LIMIT = 100 * 1024 * 1024;
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const DATA_URL = /^data:([^;,]+)?(;base64)?,/i;

const decodeDataUrl = (value) => {
  const match = DATA_URL.exec(value);
  if (!match) throw new TypeError('data URL inválida');
  const payload = value.slice(match[0].length);
  return match[2] ? Buffer.from(payload, 'base64') : Buffer.from(decodeURIComponent(payload), 'binary');
};

async function readLimited(stream, limit) {
  if (!stream) return Buffer.alloc(0);
  const chunks = [];
  let total = 0;
  for await (const chunk of stream) {
    const part = Buffer.from(chunk);
    total += part.length;
    if (total > limit) throw new RangeError(`el buffer supera el límite de ${limit} bytes`);
    chunks.push(part);
  }
  return Buffer.concat(chunks, total);
}

export async function downloadBuffer(input, { limit = DEFAULT_LIMIT, timeout = 30_000, headers = {} } = {}) {
  if (Buffer.isBuffer(input)) {
    if (input.length > limit) throw new RangeError(`el buffer supera el límite de ${limit} bytes`);
    return Buffer.from(input);
  }
  if (input instanceof Uint8Array) return downloadBuffer(Buffer.from(input), { limit, timeout, headers });

  if (typeof input === 'string') {
    if (/^https?:\/\//i.test(input)) input = { url: input };
    else if (DATA_URL.test(input)) input = { data: input };
    else input = { path: input };
  }

  if (input?.data && typeof input.data === 'string') {
    const buffer = DATA_URL.test(input.data) ? decodeDataUrl(input.data) : Buffer.from(input.data, 'base64');
    if (buffer.length > limit) throw new RangeError(`el buffer supera el límite de ${limit} bytes`);
    return buffer;
  }

  if (input?.url) {
    const url = String(input.url);
    if (!/^https?:\/\//i.test(url) && DATA_URL.test(url)) {
      const buffer = decodeDataUrl(url);
      if (buffer.length > limit) throw new RangeError(`el buffer supera el límite de ${limit} bytes`);
      return buffer;
    }
    const response = await fetch(url, {
      headers: {
        'user-agent': BROWSER_UA,
        accept: '*/*',
        ...headers,
        ...(input.headers || {})
      },
      signal: AbortSignal.timeout(input.timeout || timeout),
      redirect: 'follow'
    });
    if (!response.ok) throw new Error(`descarga fallida ${response.status} ${response.statusText}`);
    const declared = Number(response.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > limit) throw new RangeError(`la descarga supera el límite de ${limit} bytes`);
    return readLimited(response.body, limit);
  }

  if (input?.path) {
    const filePath = path.resolve(String(input.path));
    const stat = await fs.promises.stat(filePath);
    if (stat.size > limit) throw new RangeError(`el archivo supera el límite de ${limit} bytes`);
    return fs.promises.readFile(filePath);
  }

  if (input?.stream && typeof input.stream[Symbol.asyncIterator] === 'function') {
    return readLimited(input.stream, limit);
  }

  throw new TypeError('se esperaba un Buffer, Uint8Array, URL, ruta o stream asíncrono');
}

export { DEFAULT_LIMIT };