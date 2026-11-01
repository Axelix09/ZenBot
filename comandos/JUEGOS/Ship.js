import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import axios from 'axios';

const DEFAULT_PIC_1 = 'https://cdn.popcat.xyz/avatar.png';
const DEFAULT_PIC_2 = 'https://cdn.popcat.xyz/popcat.png';

const COMPAT = [
  { min: 95, texto: '💍 *Alma gemela confirmada!* Son el uno para el otro. El universo los juntó. 💕', emoji: '💍' },
  { min: 85, texto: '🔥 *Alta química explosiva!* Hay tensión, hay feeling, hay de todo. Solo falta que se den cuenta. 😏', emoji: '🔥' },
  { min: 70, texto: '✨ *Hay potencial real.* Se llevan bien, se entienden, solo falta la última chispa. 🌹', emoji: '✨' },
  { min: 55, texto: '👀 *Algo hay ahí...* Pero está muy escondido. Tal vez solo necesitan un empujón. 🤔', emoji: '👀' },
  { min: 40, texto: '😅 *Amigos con derechos... o solo amigos.* La línea es delgada. 🍷', emoji: '😅' },
  { min: 25, texto: '💨 *Muy poco amor por acá.* Son como agua y aceite. Pero todo puede pasar. 🤷', emoji: '💨' },
  { min: 10, texto: '😂 *Mejor como amigos... o ni eso.* La compatibilidad es casi nula. Pero hey, la vida es impredecible. ', emoji: '😂' },
  { min: 0, texto: '💀 *No hay conexión.* Literalmente 0 química. Pero quién sabe, el amor es raro. 🌌', emoji: '💀' }
];

const LOADING = [
  '💭 Buscando almas gemelas en el grupo...',
  '🔮 Consultando al universo... ¿quién ama en secreto?',
  '❤️ Cupido está disparando flechas... ¡cuidado!',
  '⏳ Analizando miraditas, likes ocultos y chats privados...',
  '✨ Activando modo shippeo máximo...',
  '😏 Revisando quién se sonroja cuando el otro escribe...',
  '💔 Preparando corazones rotos por si sale 0%...',
  '🌹 Calculando vibraciones románticas del grupo...',
  '🎯 El algoritmo del amor está trabajando...',
  '🪄 Agitando la varita del shippeo...'
];

const FRASES = [
  '💞 *¡PAREJA DEL DÍA DETECTADA!* 💞\n@{user1} ❤️ @{user2}\nCompatibilidad: *{p}%* — {compat}\n\n> Se aman en secreto... o no tanto 🤫',
  '❤️ *El algoritmo del amor habló:*\n@{user1} + @{user2} = *{p}% de amor*\n{compat}\n\n> ¿Cuándo la cita? El grupo espera el chisme 🔥',
  '✨ *Shippeo oficial del grupo:*\n@{user1} ❤️ @{user2}\nNivel de compatibilidad: *{p}%*\n{compat}\n\n> Cupido ya está celebrando 🎉',
  '😍 *¡BOMBA ROMÁNTICA!*\n@{user1} y @{user2} tienen *{p}%* de química\n{compat}\n\n> ¿Quién confiesa primero? 👀',
  '💔 O... 💞\n@{user1} ❤️ @{user2} → *{p}%*\n{compat}\n\n> El grupo ya está shippeando fuerte 😏',
  '🌹 *El universo los juntó:*\n@{user1} 💕 @{user2}\nCompatibilidad cósmica: *{p}%*\n{compat}\n\n> Nadie puede luchar contra el destino ✨',
  '🎯 *Match del día:*\n@{user1} 🤝 @{user2}\n*{p}%* de posibilidades de que sea real\n{compat}\n\n> El grupo ya lo sabe... y vos también 😏',
  '💕 *Destino escrito en las estrellas:*\n@{user1} ✨ @{user2}\n*{p}%* de conexión cósmica\n{compat}\n\n> El universo quiere que estén juntos 🌌',
  '🔥 *Química innegable:*\n@{user1} ⚡ @{user2}\n*{p}%* de tensión palpable\n{compat}\n\n> El resto del grupo lo siente también 😳',
  '🌈 *Amor sin etiquetas:*\n@{user1} 💫 @{user2}\n*{p}%* de compatibilidad pura\n{compat}\n\n> El amor es amor y punto 🏳️‍🌈'
];

const SHIP_TEXT = [
  'En el amor', 'Almas gemelas', 'Para siempre',
  'Inevitable', 'Shippeo oficial', 'Destino',
  'Cupido dijo sí', 'No hay escape', 'El grupo sabe',
  'Amor verdadero', 'Conexión cósmica', 'Flechazo',
  'Química pura', 'Destino escrito', 'Alma gemela',
  'Amor eterno', 'Pareja perfecta', 'El uno para el otro',
  'Fuego 🔥', 'Amor loco', 'Sin duda'
];

const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];

function getCompat(porcentaje) {
  return (COMPAT.find(c => porcentaje >= c.min) || COMPAT[COMPAT.length - 1]);
}

export default new ZenCommand('parejas')
  .addAlias('formarparejas', 'ship', 'shippear', 'amor', 'enamorados', 'shipuser', 'shippearuser', 'compatibilidad')
  .setCooldown(5)
  .setCategory('Juegos')
  .requireRegistration()
  .requireGroup()
  .onExecute(async (ctx) => {
    await ctx.react('❤️');

    const metadata = await ctx.sock.groupMetadata(ctx.chat).catch(() => null);
    if (!metadata) {
      return ctx.reply(`『 ⚠️ 』 *ERROR DE GRUPO*\n\n> No pude obtener la información del grupo 😢`);
    }

    const participantes = metadata.participants
      .filter(p => !p.id.includes('broadcast') && p.id !== ctx.sock.user.id)
      .map(p => p.id);

    if (participantes.length < 2) {
      return ctx.reply(`『 ⚠️ 』 *POCOS MIEMBROS*\n\n> No hay suficientes miembros para formar una pareja 😌\n> Se necesitan al menos 2 miembros.`);
    }

    const mentions = ctx.mentions || [];
    let jid1, jid2;

    if (mentions.length >= 2) {
      [jid1, jid2] = mentions;
    } else {
      const shuffled = [...participantes].sort(() => Math.random() - 0.5);
      [jid1, jid2] = shuffled;
    }

    const name1 = jid1.split('@')[0];
    const name2 = jid2.split('@')[0];

    const mensajeCarga = await ctx.reply(`『 💞 』 *${rnd(LOADING)}*`);

    try {
      let pic1, pic2;
      try { pic1 = await ctx.sock.profile.pictureUrl(jid1, 'image'); } catch { pic1 = DEFAULT_PIC_1; }
      try { pic2 = await ctx.sock.profile.pictureUrl(jid2, 'image'); } catch { pic2 = DEFAULT_PIC_2; }

      let imageBuffer = null;
      let porcentaje = 0;

      const nombre = ctx.rawMsg.pushName || name1;

      try {
        const res = await axios.get(
          `https://api.popcat.xyz/v2/ship?user1=${encodeURIComponent(pic1)}&user2=${encodeURIComponent(pic2)}`,
          { responseType: 'arraybuffer', timeout: 10000 }
        );
        if (res.status === 200) {
          imageBuffer = Buffer.from(res.data);
          porcentaje = res.headers['ship-percentage'] 
            ? parseInt(res.headers['ship-percentage']) 
            : Math.floor(Math.random() * 101);
        }
      } catch {}

      if (!imageBuffer) {
        porcentaje = Math.floor(Math.random() * 101);
        try {
          const res = await axios.get(
            `https://api.delirius.store/canvas/ship` +
            `?image1=${encodeURIComponent(pic1)}&name1=${encodeURIComponent(name1)}` +
            `&image2=${encodeURIComponent(pic2)}&name2=${encodeURIComponent(name2)}` +
            `&percentage=${porcentaje}&text=${encodeURIComponent(rnd(SHIP_TEXT))}`,
            { responseType: 'arraybuffer', timeout: 10000 }
          );
          imageBuffer = Buffer.from(res.data);
        } catch {
          imageBuffer = null;
        }
      }

      const compatData = getCompat(porcentaje);
      const frase = rnd(FRASES)
        .replace(/{user1}/g, name1)
        .replace(/{user2}/g, name2)
        .replace(/{p}/g, String(porcentaje))
        .replace(/{compat}/g, compatData.texto);

      if (imageBuffer) {
        await ctx.sock.sendMessage(ctx.chat, {
          image: imageBuffer,
          caption: frase,
          mentions: [jid1, jid2]
        }, { quoted: ctx.rawMsg });
      } else {
        await ctx.reply(frase);
      }

      await ctx.sock.sendMessage(ctx.chat, { delete: mensajeCarga.key }).catch(() => {});

    } catch (error) {
      console.error('[Ship] Error:', error);
      await ctx.sock.sendMessage(ctx.chat, { delete: mensajeCarga.key }).catch(() => {});
      return ctx.reply(`『 ❌ 』 *ERROR AL GENERAR PAREJA*\n\n> Ocurrió un fallo al generar la pareja 😭\n> Intentá de nuevo más tarde.`);
    }
  });