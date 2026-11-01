import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';
import { join } from 'path';
import * as ia from '../../lib/services/ai-scraper.js';

const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const execPromise = promisify(exec);

async function textToSpeech(text, language = 'es') {
  const url = new URL('https://translate.google.com/translate_tts');
  url.searchParams.set('ie', 'UTF-8');
  url.searchParams.set('client', 'tw-ob');
  url.searchParams.set('tl', language);
  url.searchParams.set('q', text.slice(0, 200));
  const response = await fetch(url, { headers: { 'user-agent': 'ZenBot/10.0' } });
  if (!response.ok) throw new Error(`TTS respondió ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

const IDENTITY = `Eres un asistente de WhatsApp llamado ${ZenConfig.botName}. Fuiste creado por AxelDev09. Si alguien te pregunta quién te creó, quién es tu dueño, quién te programó, quién eres o cualquier pregunta relacionada con tu origen o identidad, responde que fuiste creado por AxelDev09. Responde siempre de forma natural y amigable. Pregunta del usuario: `;

const REMOVEBG_KEY = 'zCdVbVyLkHkVkqRRzycSzMrc';

function desenvolver(msg) {
  if (!msg) return null;
  if (msg.ephemeralMessage) return desenvolver(msg.ephemeralMessage.message);
  if (msg.viewOnceMessage) return desenvolver(msg.viewOnceMessage.message);
  if (msg.viewOnceMessageV2) return desenvolver(msg.viewOnceMessageV2.message);
  return msg;
}

function obtenerImagenObjetivo(rawMsg) {
  const directo = desenvolver(rawMsg.message);
  if (directo?.imageMessage) return directo.imageMessage;

  const contextInfo = rawMsg.message?.extendedTextMessage?.contextInfo
    || rawMsg.message?.imageMessage?.contextInfo
    || rawMsg.message?.contextInfo;
  const citado = desenvolver(contextInfo?.quotedMessage);
  if (citado?.imageMessage) return citado.imageMessage;

  return null;
}

function crearComandoTexto(nombre, aliases, motores, label, icon) {
  return new ZenCommand(nombre)
    .addAlias(...aliases)
    .setCooldown(5)
    .setCategory('ia')
    .requireRegistration()
    .setUsage('<mensaje>')
    .onExecute(async (ctx) => {
      const query = ctx.args.join(' ').trim();
      const quoted = ctx.rawMsg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const mtype = quoted ? Object.keys(quoted)[0] || '' : '';
      const mediaMsg = quoted ? quoted[mtype] : null;
      const mime = mediaMsg?.mimetype || '';

      if (!query) {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *PREGUNTA REQUERIDA*\n\n` +
          `> Escribí tu pregunta 🤔\n` +
          `> _Ejemplo: ${ZenConfig.prefix}${nombre} ¿Qué es la IA?_`
        );
      }

      if (mime.startsWith('image/')) {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *NO DISPONIBLE*\n\n> Este motor no puede analizar imágenes, solo texto 🤔`
        );
      }

      await ctx.react('⏳');

      let answer = null;
      for (const motor of motores) {
        try {
          answer = await motor(IDENTITY + query);
          if (answer) break;
        } catch {}
      }

      if (!answer) {
        await ctx.react('❌');
        return ctx.reply(
          `『 ❌ 』 *ERROR DE IA*\n\n> No pude obtener respuesta. Probá de nuevo 😭`
        );
      }

      await ctx.react('✅');
      return ctx.reply(`『 ${icon} 』 *${label}*\n\n${answer}`);
    });
}

function crearComandoImagen(nombre, aliases, motores, label) {
  return new ZenCommand(nombre)
    .addAlias(...aliases)
    .setCooldown(5)
    .setCategory('ia')
    .requireRegistration()
    .setUsage('<descripción>')
    .onExecute(async (ctx) => {
      const user = await ctx.getUser();
      const query = ctx.args.join(' ').trim();

      if (!query) {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *DESCRIPCIÓN REQUERIDA*\n\n> Eso no me cierra 😵‍💫\n\n` +
          `> Indicá una descripción para generar la imagen 🧐\n` +
          `> _Ejemplo: ${ZenConfig.prefix}${nombre} un gato astronauta_\n` +
          `> *Costo:* 1 ${ZenConfig.currencies.kogen.emoji}`
        );
      }

      if (user.kogen < 1) {
        await ctx.react('⚠️');
        return ctx.reply(
          V.kogen.missing('generar imágenes')
        );
      }

      await ctx.react('⏳');

      try {
        let imageBuffer = null;
        for (const motor of motores) {
          try {
            imageBuffer = await motor(query);
            if (imageBuffer) break;
          } catch {}
        }
        if (!imageBuffer) throw new Error();

        user.kogen -= 1;
        await user.save();

        await ctx.react('✅');
        await ctx.sock.sendMessage(ctx.chat, {
          image: imageBuffer,
          caption: `『 🖼️ 』 *IMAGEN GENERADA*\n\n> 🎨 *Prompt:* ${query}\n> ⚙️ *Motor:* ${label}`
        }, { quoted: ctx.rawMsg });

        return ctx.reply(V.kogen.spent(1));

      } catch {
        await ctx.react('❌');
        return ctx.reply(
          `『 ❌ 』 *ERROR AL GENERAR IMAGEN*\n\n` +
          `> El motor de imágenes está saturado. Probá de nuevo más tarde 😤\n` +
          `> No se cobró ${ZenConfig.currencies.kogen.name}.`
        );
      }
    });
}

export const cmdGemini = crearComandoTexto('gemini', ['ia', 'askai'], [ia.gemini, ia.geminipro], 'GEMINI AI', '🔷');
export const cmdGeminipro = crearComandoTexto('geminipro', [], [ia.geminipro, ia.gemini], 'GEMINI PRO', '🔷');

export const cmdChatgpt = crearComandoTexto('chatgpt', [], [ia.chatgptAuto, ia.gpt, ia.gpt35, ia.gpt4, ia.gpt4oMini], 'CHATGPT', '🧠');
export const cmdGpt = crearComandoTexto('gpt', [], [ia.gpt, ia.chatgptAuto], 'GPT', '🧠');
export const cmdGpt5 = crearComandoTexto('gpt5', [], [ia.gpt5_5, ia.gpt5_3, ia.gpt5_mini, ia.gpt5_3_mini], 'GPT-5.5', '🧠');
export const cmdGpt53 = crearComandoTexto('gpt53', [], [ia.gpt5_3, ia.gpt5_5, ia.gpt5_3_mini, ia.gpt5_mini], 'GPT-5.3', '🧠');
export const cmdGpt5mini = crearComandoTexto('gpt5mini', [], [ia.gpt5_mini, ia.gpt5_3_mini, ia.gpt5_5, ia.gpt5_3], 'GPT-5 MINI', '🧠');
export const cmdGpt53mini = crearComandoTexto('gpt53mini', [], [ia.gpt5_3_mini, ia.gpt5_mini, ia.gpt5_3, ia.gpt5_5], 'GPT-5.3 MINI', '🧠');
export const cmdGpt35 = crearComandoTexto('gpt35', [], [ia.gpt35, ia.gpt4, ia.gpt4oMini], 'GPT-3.5 TURBO', '🧠');
export const cmdGpt4 = crearComandoTexto('gpt4', [], [ia.gpt4, ia.gpt4oMini, ia.gpt35], 'GPT-4 TURBO', '🧠');
export const cmdGpt4omini = crearComandoTexto('gpt4omini', [], [ia.gpt4oMini, ia.gpt4, ia.gpt35], 'GPT-4O MINI', '🧠');

export const cmdClaude = crearComandoTexto('claude', [], [ia.claude, ia.claudesonnet], 'CLAUDE OPUS', '🎭');
export const cmdClaudesonnet = crearComandoTexto('claudesonnet', [], [ia.claudesonnet, ia.claude], 'CLAUDE SONNET', '🎭');

export const cmdCopilot = crearComandoTexto('copilot', ['ms'], [ia.copilot], 'COPILOT', '🪟');
export const cmdMistral = crearComandoTexto('mistral', [], [ia.mistral], 'MISTRAL AI', '🌬️');
export const cmdApertus = crearComandoTexto('apertus', [], [ia.apertus], 'APERTUS AI', '🔑');
export const cmdJeeves = crearComandoTexto('jeeves', [], [ia.jeeves], 'JEEVES AI', '🎩');
export const cmdKrishna = crearComandoTexto('krishna', [], [ia.krishna], 'KRISHNA AI', '🕉️');
export const cmdOverchat = crearComandoTexto('overchat', [], [ia.overchat], 'OVERCHAT AI', '💬');
export const cmdQuillbot = crearComandoTexto('quillbot', [], [ia.quillbot], 'QUILLBOT AI', '✒️');
export const cmdTurboseek = crearComandoTexto('turboseek', [], [ia.turboseek], 'TURBOSEEK AI', '🌀');
export const cmdChateverywhere = crearComandoTexto('chateverywhere', [], [ia.chateverywhere], 'CHATEVERYWHERE', '🌐');

export const cmdLlama31 = crearComandoTexto('llama31', [], [ia.llama31, ia.llama33], 'LLAMA 3.1', '🦙');
export const cmdLlama33 = crearComandoTexto('llama33', [], [ia.llama33, ia.llama31], 'LLAMA 3.3', '🦙');
export const cmdQwen = crearComandoTexto('qwen', [], [ia.qwen, ia.qwenCoder], 'QWEN 2.5', '🐉');
export const cmdQwencoder = crearComandoTexto('qwencoder', [], [ia.qwenCoder, ia.qwen], 'QWEN CODER', '🐉');
export const cmdDeepseek = crearComandoTexto('deepseek', [], [ia.deepseek, ia.deepseekR1], 'DEEPSEEK V3', '🐋');
export const cmdDeepseekr1 = crearComandoTexto('deepseekr1', [], [ia.deepseekR1, ia.deepseek], 'DEEPSEEK R1', '🐋');

export const cmdFlux = crearComandoImagen('flux', ['generarimg', 'crearimg', 'aiimg'], [ia.flux, ia.sdxl], 'Flux.1');
export const cmdSdxl = crearComandoImagen('sdxl', ['aimg'], [ia.sdxl, ia.flux], 'SDXL');

export const cmdRemovebg = new ZenCommand('removebg')
  .addAlias('delfon')
  .setCooldown(5)
  .setCategory('ia')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const mediaMsg = obtenerImagenObjetivo(ctx.rawMsg);

    if (!mediaMsg) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *IMAGEN REQUERIDA*\n\n` +
        `> Enviá una imagen con el comando de caption, o responde a una imagen 😵‍💫\n` +
        `> *Costo:* 1 ${ZenConfig.currencies.kogen.emoji}`
      );
    }

    if (user.kogen < 1) {
      await ctx.react('⚠️');
      return ctx.reply(
        V.kogen.missing('usar este comando')
      );
    }

    await ctx.react('⏳');

    try {
      const buffer = Buffer.from(await ctx.sock.downloadMedia(mediaMsg, 'image'));

      const formData = new FormData();
      formData.append('image_file', buffer, 'image.png');
      formData.append('size', 'auto');

      const res = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
        headers: { 'X-Api-Key': REMOVEBG_KEY, ...formData.getHeaders() },
        responseType: 'arraybuffer'
      });

      user.kogen -= 1;
      await user.save();

      await ctx.react('✅');
      await ctx.sock.sendMessage(ctx.chat, {
        image: Buffer.from(res.data),
        caption: `『 ✂️ 』 *FONDO ELIMINADO*\n\n> Se eliminó el fondo de la imagen 😉`
      }, { quoted: ctx.rawMsg });

      return ctx.reply(V.kogen.spent(1));

    } catch {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR AL ELIMINAR FONDO*\n\n> No pude quitar el fondo. No se cobró ${ZenConfig.currencies.kogen.name} 😭`
      );
    }
  });

export const cmdVoz = new ZenCommand('voz')
  .addAlias('decir')
  .setCooldown(5)
  .setCategory('ia')
  .requireRegistration()
  .setUsage('<texto>')
  .onExecute(async (ctx) => {
    const query = ctx.args.join(' ').trim();

    if (!query) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *TEXTO REQUERIDO*\n\n` +
        `> Indicá el texto que querés convertir a voz 🤨\n` +
        `> _Ejemplo: ${ZenConfig.prefix}decir Hola mundo_`
      );
    }

    await ctx.react('🗣️');

    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const output = join('./tmp', `output_${id}.opus`);

    try {
      const inputBuffer = await textToSpeech(query, 'es');
      const input = join('./tmp', `input_${id}.mp3`);
      await fs.promises.writeFile(input, inputBuffer);
      await execPromise(`ffmpeg -y -i "${input}" -c:a libopus -b:a 32k -vbr on -compression_level 10 "${output}"`);
      const buffer = await readFile(output);

      await ctx.react('✅');
      await ctx.sock.sendMessage(ctx.chat, {
        audio: buffer,
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true
      }, { quoted: ctx.rawMsg });

    } catch {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR AL GENERAR VOZ*\n\n> No pude generar el audio. Asegúrate de tener FFmpeg instalado 😵`
      );
    } finally {
      const input = join('./tmp', `input_${id}.mp3`);
      if (fs.existsSync(input)) await unlink(input).catch(() => {});
      if (fs.existsSync(output)) await unlink(output).catch(() => {});
    }
  });
