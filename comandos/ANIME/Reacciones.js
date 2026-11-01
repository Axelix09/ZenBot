import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';

const execPromise = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.join(__dirname, '..', '..', 'lib', 'database', 'json', 'anime-react.json');

const ACCIONES = {
  angry:      { emoji: '😠', msgs: ['está enojado con {obj}! 😠',              'está enojado consigo mismo 😠'] },
  baka:       { emoji: '😤', msgs: ['le dice baka a {obj} 😤',                 'se dice baka a sí mismo 😤'] },
  bite:       { emoji: '🦷', msgs: ['le mordió a {obj}! au! 🦷',               'se mordió a sí mismo... au 🤕'] },
  bleh:       { emoji: '😝', msgs: ['le saca la lengua a {obj} 😝',             'se saca la lengua al espejo 😝'] },
  blowkiss:   { emoji: '💋', msgs: ['le manda un beso a {obj} 💋',              'se manda un beso al espejo 💋'] },
  blush:      { emoji: '😳', msgs: ['se sonrojó por {obj} 😳',                  'se sonrojó uwu 😳'] },
  bonk:       { emoji: '🔨', msgs: ['le dio un bonk a {obj} 🔨',               'se dio un bonk a sí mismo 🔨'] },
  bored:      { emoji: '😑', msgs: ['está aburrido de {obj}...',                'está aburrido...'] },
  carry:      { emoji: '🤲', msgs: ['cargó a {obj} en brazos 🤲',              'intenta cargarse a sí mismo 🤲'] },
  clap:       { emoji: '👏', msgs: ['le aplaude a {obj} 👏',                    'se aplaude a sí mismo 👏'] },
  confused:   { emoji: '😕', msgs: ['está confundido por {obj} 😕',             'está muy confundido 😕'] },
  cry:        { emoji: '😭', msgs: ['está llorando por culpa de {obj}',         'está llorando...'] },
  cuddle:     { emoji: '🤗', msgs: ['se acurruca con {obj} 💕',                 'se acurruca consigo mismo 🥲'] },
  dance:      { emoji: '💃', msgs: ['está bailando con {obj} 💃',               'está bailando~ 💃'] },
  facepalm:   { emoji: '🤦', msgs: ['hace facepalm por culpa de {obj} 🤦',      'hace facepalm 🤦'] },
  feed:       { emoji: '🍽️', msgs: ['le da de comer a {obj} 🍽️',               'se da de comer a sí mismo 🍽️'] },
  handhold:   { emoji: '🤝', msgs: ['le toma la mano a {obj} 🤝',               'se toma la mano a sí mismo 🤝'] },
  handshake:  { emoji: '🤝', msgs: ['saluda con un apretón a {obj} 🤝',         'se da la mano a sí mismo 🤝'] },
  happy:      { emoji: '😊', msgs: ['está feliz gracias a {obj} ~',             'está muy feliz~'] },
  highfive:   { emoji: '🙌', msgs: ['le choca los cinco a {obj} 🙌',            'se choca los cinco solo 🙌'] },
  hug:        { emoji: '🤗', msgs: ['le dio un abrazo a {obj} 💕',              'se dio un abrazo a sí mismo... alguien dale amor 💔'] },
  kabedon:    { emoji: '💢', msgs: ['le hizo un kabedon a {obj} 💢',            'hace kabedon contra la pared 💢'] },
  kill:       { emoji: '⚰️', msgs: ['mató a {obj} 💀 ⚰️',                        'intentó matarse a sí mismo 💀 ⚰️'] },
  kiss:       { emoji: '😘', msgs: ['le dio un beso a {obj} 💋',                'se dio un beso a sí mismo 💋'] },
  lappillow:  { emoji: '😴', msgs: ['usa las piernas de {obj} de almohada 😴',  'usa sus propias piernas de almohada 😴'] },
  laugh:      { emoji: '😂', msgs: ['se muere de risa de {obj} 😂',             'se está muriendo de risa 😂'] },
  lurk:       { emoji: '👀', msgs: ['está espiando a {obj} 👀',                 'está espiando en el chat 👀'] },
  nod:        { emoji: '👍', msgs: ['le da la razón a {obj} con un nod 👍',     'asiente solo 👍'] },
  nom:        { emoji: '🍽️', msgs: ['está comiendo con {obj} nom nom 🍽️',       'está comiendo nom nom 🍽️'] },
  nope:       { emoji: '🙅', msgs: ['le dice nope a {obj} 🙅',                  'dice nope a todo 🙅'] },
  nya:        { emoji: '🐱', msgs: ['le dice nya a {obj} 🐱',                   'dice nya~ 🐱'] },
  pat:        { emoji: '🤲', msgs: ['le acaricia la cabeza a {obj}',            'se acaricia la cabeza a sí mismo'] },
  peck:       { emoji: '😘', msgs: ['le da un besito rápido a {obj} 😘',        'se da un besito a sí mismo 😘'] },
  poke:       { emoji: '👉', msgs: ['pica a {obj} 👉',                          'se picó a sí mismo 👉'] },
  pout:       { emoji: '😤', msgs: ['hace pucheros por {obj} 😤',               'está haciendo pucheros 😤'] },
  punch:      { emoji: '👊', msgs: ['le pegó un puñetazo a {obj}! 👊',          'se dio un puñetazo a sí mismo 😵 👊'] },
  run:        { emoji: '🏃', msgs: ['está corriendo de {obj} 🏃',               'está corriendo 🏃'] },
  salute:     { emoji: '🫡', msgs: ['le hace un saludo militar a {obj} 🫡',     'saluda al vacío 🫡'] },
  shake:      { emoji: '🤝', msgs: ['le da la mano a {obj} 🤝',                 'se da la mano a sí mismo 🤝'] },
  shocked:    { emoji: '😱', msgs: ['está shockeado por {obj} 😱',              'está completamente shockeado 😱'] },
  shoot:      { emoji: '🔫', msgs: ['le dispara a {obj} 🔫',                    'se dispara a sí mismo 🔫'] },
  shrug:      { emoji: '🤷', msgs: ['se encoge de hombros ante {obj} 🤷',       'se encoge de hombros 🤷'] },
  sip:        { emoji: '☕', msgs: ['toma té mirando a {obj} ☕',               'toma té tranquilo ☕'] },
  slap:       { emoji: '👋', msgs: ['le pegó una cachetada a {obj} 😤',         'se dio una cachetada a sí mismo 😵'] },
  sleep:      { emoji: '😴', msgs: ['se va a dormir con {obj}... zZz 😴',       'se va a dormir... zZz 😴'] },
  smile:      { emoji: '😊', msgs: ['le sonríe a {obj} 😊',                     'sonríe al vacío 😊'] },
  smug:       { emoji: '😏', msgs: ['está siendo smug con {obj} 😏',            'está siendo smug solo 😏'] },
  spin:       { emoji: '🌀', msgs: ['gira feliz con {obj} 🌀',                  'está girando~ 🌀'] },
  stare:      { emoji: '👁️', msgs: ['le clava la mirada a {obj} 👁️',            'clava la mirada en la nada 👁️'] },
  tableflip:  { emoji: '(╯°□°）╯', msgs: ['voltea la mesa por culpa de {obj} (╯°□°）╯', 'voltea la mesa (╯°□°）╯'] },
  teehee:     { emoji: '😄', msgs: ['se ríe de {obj} teehee 😄',                'teehee~ 😄'] },
  think:      { emoji: '🤔', msgs: ['está pensando en {obj}... 🤔',             'está pensando... 🤔'] },
  thumbsup:   { emoji: '👍', msgs: ['le da un thumbsup a {obj} 👍',             'se da un thumbsup a sí mismo 👍'] },
  tickle:     { emoji: '🤣', msgs: ['le hace cosquillas a {obj} 🤣',            'se hace cosquillas a sí mismo 🤣'] },
  wag:        { emoji: '🐾', msgs: ['menea la cola ante {obj} 🐾',              'menea la cola~ 🐾'] },
  wave:       { emoji: '👋', msgs: ['le saluda con la mano a {obj} 👋',         'saluda con la mano 👋'] },
  wink:       { emoji: '😉', msgs: ['le guiña el ojo a {obj} 😉',               'guiña el ojo 😉'] },
  yawn:       { emoji: '🥱', msgs: ['bosteza al lado de {obj} 🥱',              'está bostezando 🥱'] },
  yeet:       { emoji: '💨', msgs: ['yeetea a {obj} por los aires 💨',          'se yeetea a sí mismo 💨'] }
};

const readGifs = () => {
  try {
    const data = fs.readFileSync(jsonPath, 'utf-8');
    return JSON.parse(data) || {};
  } catch {
    return {};
  }
};

const transcodeGifToMp4 = async (gifBuffer) => {
  const tempId = Date.now() + Math.random().toString(36).substring(7);
  const inputPath = path.join(tmpdir(), `gif_in_${tempId}.gif`);
  const outputPath = path.join(tmpdir(), `gif_out_${tempId}.mp4`);

  fs.writeFileSync(inputPath, gifBuffer);

  try {
    await execPromise(`ffmpeg -y -i "${inputPath}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "${outputPath}"`);
    const mp4Buffer = fs.readFileSync(outputPath);
    return mp4Buffer;
  } finally {
    if (fs.existsSync(inputPath)) {
      try { fs.unlinkSync(inputPath); } catch {}
    }
    if (fs.existsSync(outputPath)) {
      try { fs.unlinkSync(outputPath); } catch {}
    }
  }
};

export default new ZenCommand('reaccion')
  .addAlias(...Object.keys(ACCIONES))
  .setCooldown(3)
  .setCategory('anime')
  .setUsage('@usuario')
  .onExecute(async (ctx) => {
    const cmd = ctx.commandName.toLowerCase();
    const cfg = ACCIONES[cmd];
    if (!cfg) return;

    const gifsData = readGifs();
    const gifList = gifsData[cmd] || [];

    if (!gifList.length) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SIN ANIMACIONES*\n\n> No hay animaciones registradas para la reacción *${cmd}* en la base de datos 🫤`);
    }

    let target = ctx.sender;
    if (ctx.mentions?.[0]) target = ctx.mentions[0];
    else if (ctx.quotedParticipant) target = ctx.quotedParticipant;

    const remitente = ctx.rawMsg.pushName || ctx.sender.split('@')[0];
    const objetivo = '@' + target.split('@')[0];
    const conTarget = target !== ctx.sender;

    const raw = conTarget ? cfg.msgs[0] : cfg.msgs[1];
    const texto = `${cfg.emoji} *${remitente}* ${raw.replace('{obj}', objetivo)}`;

    await ctx.react(cfg.emoji);

    try {
      const selectedGifUrl = gifList[Math.floor(Math.random() * gifList.length)];

      const res = await axios.get(selectedGifUrl, {
        responseType: 'arraybuffer',
        timeout: 25000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      const gifBuf = Buffer.from(res.data);
      if (!gifBuf || gifBuf.length < 100) throw new Error();

      const mp4Buf = await transcodeGifToMp4(gifBuf);

      return ctx.sock.sendMessage(ctx.chat, {
        video: mp4Buf,
        gifPlayback: true,
        mimetype: 'video/mp4',
        caption: texto,
        mentions: [ctx.sender, target]
      }, { quoted: ctx.rawMsg });
    } catch {
      return ctx.reply(`『 ⚠️ 』 *ERROR DE PROCESAMIENTO*\n\n> No pude procesar el archivo de animación para la reacción *${cmd}* 😢`);
    }
  });