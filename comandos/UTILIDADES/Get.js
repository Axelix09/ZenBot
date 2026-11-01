import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import fetch from 'node-fetch';
import { format } from 'node:util';
import dns from 'node:dns/promises';
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';

const MAX_GET_SIZE = 100 * 1024 * 1024;
const MAX_TEXT_SIZE = 1024 * 1024;
const MAX_REDIRECTS = 5;
const GET_TIMEOUT_MS = 120_000;

const blockedIPs = new net.BlockList();
const blockedIPv4Mapped = new net.BlockList();
blockedIPv4Mapped.addSubnet('::ffff:0:0', 96, 'ipv6');
for (const [subnet, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4]
]) blockedIPs.addSubnet(subnet, prefix, 'ipv4');

for (const [subnet, prefix] of [
  ['::', 128], ['::1', 128], ['64:ff9b::', 96], ['64:ff9b:1::', 48],
  ['100::', 64], ['2001::', 23], ['2001:db8::', 32], ['2002::', 16],
  ['fc00::', 7], ['fe80::', 10], ['ff00::', 8]
]) blockedIPs.addSubnet(subnet, prefix, 'ipv6');

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

const isBlockedAddress = (address, family) => {
  const version = family || net.isIP(address);
  if (version !== 4 && version !== 6) return true;
  if (version === 6 && blockedIPv4Mapped.check(address, 'ipv6')) return true;
  return blockedIPs.check(address, version === 4 ? 'ipv4' : 'ipv6');
};

const resolvePublicURL = async (rawURL) => {
  const url = new URL(rawURL);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('solo se permiten URLs HTTP o HTTPS');
  if (url.username || url.password) throw new Error('no se permiten credenciales dentro de la URL');
  if (url.port && url.port !== (url.protocol === 'http:' ? '80' : '443')) {
    throw new Error('solo se permiten los puertos HTTP y HTTPS estándar');
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!hostname || hostname === 'localhost' || /\.(localhost|local|internal|home\.arpa|test)$/.test(hostname)) {
    throw new Error('el host no es público');
  }

  const literalFamily = net.isIP(hostname);
  const addresses = literalFamily
    ? [{ address: hostname, family: literalFamily }]
    : await dns.lookup(hostname, { all: true, verbatim: true });

  if (!addresses.length || addresses.some(({ address, family }) => isBlockedAddress(address, family))) {
    throw new Error('la URL resuelve a una dirección no pública');
  }

  return { url, hostname, addresses };
};

const makePinnedAgent = ({ url, hostname, addresses }) => {
  const expectedHost = hostname.toLowerCase();
  const lookup = (requestedHost, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    if (String(requestedHost).toLowerCase().replace(/^\[|\]$/g, '') !== expectedHost) {
      return callback(new Error('el host de conexión no coincide con el host validado'));
    }

    const requestedFamily = typeof options === 'number' ? options : options?.family;
    const candidates = requestedFamily ? addresses.filter((entry) => entry.family === requestedFamily) : addresses;
    if (!candidates.length) return callback(new Error('no hay una dirección validada para la familia solicitada'));
    if (options?.all) return callback(null, candidates.map(({ address, family }) => ({ address, family })));
    return callback(null, candidates[0].address, candidates[0].family);
  };

  const Agent = url.protocol === 'https:' ? https.Agent : http.Agent;
  return new Agent({ lookup, keepAlive: false, maxSockets: 1 });
};

const fetchPublicURL = async (rawURL) => {
  let currentURL = new URL(rawURL);

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const validated = await resolvePublicURL(currentURL.href);
    const agent = makePinnedAgent(validated);
    try {
      const response = await fetch(validated.url.href, {
        redirect: 'manual',
        agent,
        size: MAX_GET_SIZE,
        signal: AbortSignal.timeout(GET_TIMEOUT_MS)
      });

      if (!REDIRECT_STATUSES.has(response.status) || !response.headers.get('location')) {
        return { response, agent, url: validated.url };
      }

      response.body?.destroy();
      agent.destroy();
      if (redirects === MAX_REDIRECTS) throw new Error('se excedió el límite de redirecciones');
      currentURL = new URL(response.headers.get('location'), validated.url);
    } catch (error) {
      agent.destroy();
      throw error;
    }
  }

  throw new Error('se excedió el límite de redirecciones');
};

const limitedBody = (response, limit) => (async function* () {
  if (!response.body) return;
  let total = 0;
  let completed = false;
  try {
    for await (const chunk of response.body) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buffer.length;
      if (total > limit) throw new RangeError(`la descarga supera el límite de ${limit} bytes`);
      yield buffer;
    }
    completed = true;
  } finally {
    if (!completed && response.body && !response.body.destroyed) response.body.destroy();
  }
})();

const readLimitedBuffer = async (response, limit) => {
  const chunks = [];
  let total = 0;
  for await (const chunk of limitedBody(response, limit)) {
    chunks.push(chunk);
    total += chunk.length;
  }
  return Buffer.concat(chunks, total);
};

const filenameFromURL = (url) => {
  let name = url.pathname.split('/').pop() || '';
  try { name = decodeURIComponent(name); } catch {}
  name = name.replace(/[\u0000-\u001f\u007f/\\]/g, '_').slice(0, 120);
  if (!name || name === '.' || name === '..') return 'descarga.bin';
  return name;
};

const classifyMedia = (contentType, ext) => {
  const mime = contentType.split(';', 1)[0].trim().toLowerCase();
  if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mime) || ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) return 'image';
  if (['video/mp4', 'video/webm', 'video/ogg'].includes(mime) || ['.mp4', '.webm', '.ogv', '.ogg'].includes(ext)) return 'video';
  if (mime.startsWith('audio/') || ['.mp3', '.wav', '.ogg', '.opus', '.m4a', '.aac', '.flac'].includes(ext)) return 'audio';
  return null;
};

const isTextResponse = (contentType, ext) => {
  const mime = contentType.split(';', 1)[0].trim().toLowerCase();
  return mime.startsWith('text/') || ['application/json', 'application/xml', 'application/javascript', 'application/x-javascript'].includes(mime) || ['.txt', '.json', '.xml', '.html', '.htm', '.csv', '.js', '.css'].includes(ext);
};

export default new ZenCommand('get')
  .setCooldown(10)
  .setCategory('tools')
  .requireRegistration()
  .setUsage('<url>')
  .onExecute(async (ctx) => {
    const [rawURL] = ctx.args;
    const prefix = ZenConfig.prefix;

    if (!rawURL) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *URL REQUERIDA*\n\n` +
        `> Uy, algo no cuadra 🤨\n\n` +
        `> Indicá la URL del archivo a descargar 🧐\n` +
        `> _Ejemplo: ${prefix}get https://example.com/image.jpg_`
      );
    }

    let parsedURL;
    try {
      parsedURL = new URL(rawURL);
      if (!['http:', 'https:'].includes(parsedURL.protocol)) throw new Error();
    } catch {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *URL INVÁLIDA*\n\n` +
        `> La URL debe ser HTTP o HTTPS y estar bien escrita 🤨`
      );
    }

    await ctx.react('⏳');
    let result;

    try {
      result = await fetchPublicURL(parsedURL.href);
      const { response, url } = result;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentLength = Number(response.headers.get('content-length'));
      if (Number.isFinite(contentLength) && contentLength > MAX_GET_SIZE) {
        response.body?.destroy();
        throw new RangeError('el archivo supera el límite permitido');
      }

      const contentType = response.headers.get('content-type') || '';
      const ext = path.extname(url.pathname).toLowerCase();
      const mediaType = classifyMedia(contentType, ext);
      const fileName = filenameFromURL(url);

      if (mediaType) {
        await ctx.react('✅');
        return await ctx.sock.sendMessage(
          ctx.chat,
          { [mediaType]: { stream: limitedBody(response, MAX_GET_SIZE) } },
          { quoted: ctx.rawMsg }
        );
      }

      if (isTextResponse(contentType, ext)) {
        const buffer = await readLimitedBuffer(response, MAX_TEXT_SIZE);
        let content = buffer.toString('utf8');
        try { content = format(JSON.parse(content)); } catch {}
        await ctx.react('✅');
        return ctx.reply(content || '(respuesta vacía)');
      }

      await ctx.react('✅');
      return await ctx.sock.sendMessage(
        ctx.chat,
        { document: { stream: limitedBody(response, MAX_GET_SIZE) }, fileName },
        { quoted: ctx.rawMsg }
      );
    } catch {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR DE DESCARGA*\n\n` +
        `> No pude descargar esa URL. Puede ser privada, inválida, demasiado grande o no estar disponible 😖`
      );
    } finally {
      result?.response?.body?.destroy();
      result?.agent?.destroy();
    }
  });
