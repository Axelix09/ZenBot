import fs from 'fs/promises';
import axios from 'axios';
import { jidNormalizedUser } from 'zyrix';
import NodeCache from 'node-cache';

const imageBufferCache = new NodeCache({ 
  stdTTL: 300,
  checkperiod: 60,
  maxKeys: 50
});

function isUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

async function resolveImage(image) {
  if (Buffer.isBuffer(image)) return image;

  if (isUrl(image)) {
    const cached = imageBufferCache.get(image);
    if (cached) return cached;

    const { data } = await axios.get(image, { 
      responseType: 'arraybuffer', 
      timeout: 15000 
    });
    const buffer = Buffer.from(data);
    imageBufferCache.set(image, buffer);
    return buffer;
  }

  if (typeof image === 'string') {
    const cached = imageBufferCache.get(image);
    if (cached) return cached;

    const buffer = await fs.readFile(image);
    imageBufferCache.set(image, buffer);
    return buffer;
  }

  throw new Error('[catalog] opts.image debe ser un Buffer, una URL http(s) o una ruta de archivo local');
}

export function clearCatalogImageCache(key) {
  if (key) return imageBufferCache.del(key);
  imageBufferCache.flushAll();
}

export async function sendCatalog(sock, jid, opts = {}) {
  if (!sock?.user?.id) {
    throw new Error('[catalog] sock inválido: falta sock.user.id');
  }
  if (!jid) {
    throw new Error('[catalog] Falta el jid destino');
  }

  const {
    image,
    title = 'Producto',
    description = '',
    body = '',
    currencyCode = 'ARS',
    priceAmount1000 = 0,
    retailerId = String(Date.now()).slice(-6),
    productId = String(Date.now()),
    url = '',
    additionalImages = [],
    quoted
  } = opts;

  if (!image) {
    throw new Error('[catalog] Falta la imagen del producto (opts.image)');
  }

  let productImage;
  try {
    productImage = await resolveImage(image);
  } catch (error) {
    throw new Error(`[catalog] No se pudo resolver la imagen del producto: ${error.message}`);
  }

  const resolvedExtras = await Promise.all(
    additionalImages.filter(Boolean).map((img) => resolveImage(img).catch(() => null))
  );
  const extraImages = resolvedExtras.filter(Boolean);

  const productPayload = {
    productImage,
    productImageCount: 1 + extraImages.length,
    title,
    description,
    currencyCode,
    priceAmount1000,
    retailerId,
    productId,
    url
  };

  if (extraImages.length) {
    productPayload.additionalImages = extraImages;
  }

  return sock.sendMessage(jid, {
    product: productPayload,
    businessOwnerJid: jidNormalizedUser(sock.user.id),
    footer: body
  }, { messageType: 'product', quoted });
}