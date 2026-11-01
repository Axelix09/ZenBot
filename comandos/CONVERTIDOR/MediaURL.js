import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import axios from 'axios';
import FormData from 'form-data';

const TIPOS = {
  videoMessage: 'video',
  imageMessage: 'image',
  audioMessage: 'audio',
  stickerMessage: 'sticker'
};

const EXTS = {
  videoMessage: 'mp4',
  imageMessage: 'jpg',
  audioMessage: 'mp3',
  stickerMessage: 'webp'
};

async function uploadToTelegraph(buffer, name) {
  const formData = new FormData();
  formData.append('file', buffer, name);
  const response = await axios.post('https://telegra.ph/upload', formData, {
    headers: formData.getHeaders(),
    timeout: 15000
  });
  return 'https://telegra.ph' + response.data[0].src;
}

async function uploadToCatbox(buffer, name) {
  const formData = new FormData();
  formData.append('fileToUpload', buffer, name);
  formData.append('reqtype', 'fileupload');
  const response = await axios.post('https://catbox.moe/user/api.php', formData, {
    headers: formData.getHeaders(),
    timeout: 20000
  });
  return response.data;
}

async function uploadToImgBB(buffer, name) {
  const formData = new FormData();
  formData.append('image', buffer.toString('base64'));
  const response = await axios.post('https://api.imgbb.com/1/upload', formData, {
    params: {
      key: '3c0ed158650e1020532454fc799c2cc3'
    },
    headers: formData.getHeaders(),
    timeout: 15000
  });
  return response.data.data.url;
}

async function uploadToGraph(buffer, name) {
  const formData = new FormData();
  formData.append('file', buffer, name);
  const response = await axios.post('https://graph.org/upload', formData, {
    headers: formData.getHeaders(),
    timeout: 15000
  });
  return 'https://graph.org' + response.data[0].src;
}

async function uploadToVidey(buffer, name) {
  const formData = new FormData();
  formData.append('file', buffer, name);
  const response = await axios.post('https://api.videy.co/upload', formData, {
    headers: formData.getHeaders(),
    timeout: 20000
  });
  return response.data.url;
}

async function uploadToLitterbox(buffer, name) {
  const formData = new FormData();
  formData.append('file', buffer, name);
  formData.append('time', '1h');
  const response = await axios.post('https://litterbox.cat/api/upload', formData, {
    headers: formData.getHeaders(),
    timeout: 20000
  });
  return response.data.url;
}

async function uploadToFileIo(buffer, name) {
  const formData = new FormData();
  formData.append('file', buffer, name);
  const response = await axios.post('https://file.io', formData, {
    headers: formData.getHeaders(),
    timeout: 20000
  });
  return response.data.link;
}

async function uploadToGofile(buffer, name) {
  const { data: serverData } = await axios.get('https://api.gofile.io/servers');
  const server = serverData.data.servers[0].name;
  const formData = new FormData();
  formData.append('file', buffer, name);
  const response = await axios.post(`https://${server}.gofile.io/contents/upload`, formData, {
    headers: formData.getHeaders(),
    timeout: 20000
  });
  return response.data.data.downloadPage;
}

async function uploadToPomf(buffer, name) {
  const formData = new FormData();
  formData.append('files[]', buffer, name);
  const response = await axios.post('https://pomf.lain.la/upload.php', formData, {
    headers: formData.getHeaders(),
    timeout: 15000
  });
  return response.data.files[0].url;
}

const uploadMethods = [
  { name: 'Telegraph', fn: uploadToTelegraph },
  { name: 'Catbox', fn: uploadToCatbox },
  { name: 'ImgBB', fn: uploadToImgBB },
  { name: 'Graph', fn: uploadToGraph },
  { name: 'Videy', fn: uploadToVidey },
  { name: 'Litterbox', fn: uploadToLitterbox },
  { name: 'File.io', fn: uploadToFileIo },
  { name: 'Gofile', fn: uploadToGofile },
  { name: 'Pomf', fn: uploadToPomf }
];

async function uploadMedia(buffer, name) {
  const errors = [];
  for (const method of uploadMethods) {
    try {
      const url = await method.fn(buffer, name);
      if (url && typeof url === 'string' && url.startsWith('http')) {
        return { url, service: method.name };
      }
    } catch (error) {
      errors.push(`${method.name}: ${error.message}`);
    }
  }
  throw new Error(`Todas las APIs fallaron:\n${errors.join('\n')}`);
}

function unwrap(message) {
  let current = message;
  for (let i = 0; i < 5 && current; i++) {
    const wrapper = ['ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension', 'documentWithCaptionMessage']
      .find((key) => current[key]?.message);
    if (!wrapper) return current;
    current = current[wrapper].message;
  }
  return current || {};
}

function findMedia(message) {
  const body = unwrap(message);
  const mtype = Object.keys(TIPOS).find((key) => body[key]);
  return mtype ? { mtype } : null;
}

function extraerMedia(ctx) {
  const own = findMedia(ctx.rawMsg.message);
  if (own) return { ...own, source: 'current' };
  const quoted = ctx.getQuoted?.();
  const quotedMedia = quoted ? findMedia(quoted.message) : null;
  return quotedMedia ? { ...quotedMedia, source: 'quoted' } : null;
}

export default new ZenCommand('tourl')
  .addAlias('tovideourl', 'togifurl', 'tomediaurl', 'tofotourl', 'subir', 'upload')
  .setCooldown(5)
  .setCategory('convertidores')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const media = extraerMedia(ctx);

    if (!media) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *MEDIA REQUERIDA*\n\n` +
        `> Enviá una imagen, video, audio o sticker con el comando 😵‍💫\n` +
        `> O responde a un mensaje con media.\n\n` +
        `> _Ejemplos:_\n` +
        `  • ${ZenConfig.prefix}tourl [imagen]\n` +
        `  • ${ZenConfig.prefix}tourl [responde a una imagen]`
      );
    }

    const { mtype } = media;

    await ctx.react('⏳');

    try {
      const buffer = Buffer.from(await ctx.download({ quoted: media.source === 'quoted' }));

      const ext = EXTS[mtype] || 'bin';
      const name = `media_${Date.now()}.${ext}`;

      const result = await uploadMedia(buffer, name);

      await ctx.react('🔗');
      return ctx.reply(
        `『 🔗 』 *URL GENERADA*\n\n` +
        `✦ *Servicio:* ${result.service}\n` +
        `✦ *Link:* ${result.url}\n` +
        `✦ *Tamaño:* ${(buffer.length / 1024).toFixed(1)} KB\n` +
        `✦ *Tipo:* ${mtype.replace('Message', '').toUpperCase()}`
      );
    } catch (error) {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR DE SUBIDA*\n\n` +
        `> No pude subir el archivo 😭\n` +
        `> _${error.message || 'Probá de nuevo más tarde 😅'}_`
      );
    }
  });
