import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

const partidas = new Map();

const diagnosticos = [
  { min: 0, max: 5, text: '💪 *100% Heterosexual.* Macho alfa. Tu sangre es a base de asado, fútbol y herramientas. Estás a salvo. 🛡️🍺' },
  { min: 6, max: 15, text: '🧢 *Heterosexual Premium.* Estás seguro de tu sexualidad, te cuidás y no tenés masculinidad frágil. 🧢🧴' },
  { min: 16, max: 30, text: '🍷 *Heteroflexible.* En público sos re macho, pero a solas cantás pop. Con unos tragos, la barrera se rompe. 👀🍷' },
  { min: 31, max: 50, text: '⚖️ *Bisexual en pánico.* 50/50. Te hacés el que "no le ponés etiquetas", pero sabés lo que querés. Disfrutá. ⚖️🔥' },
  { min: 51, max: 70, text: '💅 *Clóset de cristal.* Todos se dan cuenta menos vos. Vivís para el chisme, la estética y el drama. Asumilo. 💅🚪' },
  { min: 71, max: 90, text: '🏳️‍🌈 *Oficialmente del bando.* De hétero solo te queda el DNI. Ya cruzaste la línea y respirás purpurina. ✨' },
  { min: 91, max: 98, text: '🦄 *Ícono Pop Inalcanzable.* Diva máxima. Caminás rápido, juzgás en silencio. Sos la madrina del grupo. 💃' },
  { min: 99, max: 100, text: '👑 *100% TRAGASABLES.* CEO de la homosexualidad. Fuiste a la yugular en todas. Nivel Dios. 💅🌈' }
];

const pools = [
  { q: "¿Alguna vez miraste a un chico y pensaste 'es muy lindo'?", opts: ["Nunca.", "Sí, objetivamente tiene facha.", "Sí, lo miré más de lo que debería."] },
  { q: "¿Cómo te sentás normalmente?", opts: ["Piernas abiertas, ocupando espacio.", "Normal, una pierna cruzada sobre la rodilla.", "Pierna cruzada finamente o en poses indescriptibles."] },
  { q: "¿Qué bebida pedís en un bar?", opts: ["Cerveza o Fernet oscuro.", "Vodka o Gin Tonic.", "Daikiri, Mojito o cualquier trago dulce con sombrillita."] },
  { q: "Tu ropa interior preferida es...", opts: ["Bóxers sueltos o viejos.", "Bóxers ajustados.", "Slips, suspensorios o tangas."] },
  { q: "Tu ídolo musical se acerca a...", opts: ["Una banda de rock o un rapero duro.", "Un cantante pop tipo Bruno Mars o The Weeknd.", "Lady Gaga, Ariana Grande o Britney Spears."] },
  { q: "¿Cómo es tu forma de caminar?", opts: ["Arrastrando los pies o relajado.", "A paso firme y normal.", "Caminata rápida de pasarela."] },
  { q: "¿Cuál es tu rutina de cuidado facial?", opts: ["Me lavo la cara con el mismo jabón del cuerpo.", "Uso una crema hidratante de vez en cuando.", "Skincare de 10 pasos coreano."] },
  { q: "En el gimnasio vos...", opts: ["Levanto pesas pesadas y grito.", "Hago un poco de todo y me voy.", "Hago puro glúteo y miro a los demás de reojo."] },
  { q: "¿Cuál es tu película favorita para un domingo?", opts: ["Acción, guerra o autos.", "Una comedia normal o Marvel.", "Mean Girls, El Diablo Viste a la Moda o un musical."] },
  { q: "¿Cómo bailás en una fiesta?", opts: ["Paso básico de lado a lado.", "Me muevo bastante bien, con ritmo.", "Me sé la coreografía exacta y bajo hasta el piso."] },
  { q: "Hay una cucaracha voladora en tu cuarto:", opts: ["La piso descalzo.", "Busco insecticida rápido.", "Pego un grito agudo y llamo a alguien."] },
  { q: "¿Qué emojis usás más?", opts: ["👍 o 😂.", "Caritas normales y fueguitos.", "✨ 💅 👁️👄👁️ 🌈."] },
  { q: "¿Qué deporte te gusta más?", opts: ["Fútbol, Rugby o Boxeo.", "Tenis, Natación o Vóley.", "Gimnasia rítmica, Patinaje o Baile."] },
  { q: "Tus grupos de amigos son...", opts: ["Puros vagos, los pibes.", "Mitad hombres, mitad mujeres.", "Puras chicas y yo soy el único hombre."] },
  { q: "Cuando te emocionás mucho...", opts: ["Grito un '¡Vamos!' fuerte.", "Me río y aplaudo.", "Llego a notas agudas que rompen vidrios."] },
  { q: "¿Cómo sostenés una taza o vaso pequeño?", opts: ["Con toda la mano apretada.", "Con varios dedos normal.", "Meñique levantado, siempre con clase."] },
  { q: "Tu historial de búsqueda de YouTube tiene...", opts: ["Resúmenes de fútbol o videojuegos.", "Música, podcasts o tutoriales.", "Chismes, moda o 'Tom Holland sin camisa'."] },
  { q: "¿Cómo te imaginás a futuro?", opts: ["Casado con una supermodelo.", "Soltero o con alguien tranquilo.", "Casado con un Sugar Daddy en Europa."] },
  { q: "Si menciono 'RuPaul', vos decís:", opts: ["¿Quién es ese?", "Me suena de nombre.", "Sashay Away, reina."] },
  { q: "¿Qué hacés con las manos cuando te sacan una foto?", opts: ["Las meto en los bolsillos.", "Hablo un poco con las manos.", "Hago pistolitas o el signo de la paz."] },
  { q: "¿Cómo usás los puños de la camisa?", opts: ["Normales, cerrados.", "Arremangados hasta el codo.", "Arremangados justo a la mitad del antebrazo."] },
  { q: "¿Qué hacés cuando ves a un chico lindo con estilo?", opts: ["No le doy importancia.", "Pienso 'qué bien se ve'.", "Me pongo nervioso y no sé dónde mirar."] },
  { q: "Tu plan perfecto para un sábado a la noche:", opts: ["Juntada con los pibes.", "Salir a bailar o a un bar.", "Cena romántica con alguien especial."] },
  { q: "¿Qué tipo de música te gusta más?", opts: ["Rock pesado o Metal.", "Pop o Reggaeton.", "Electrónica o Indie."] },
  { q: "¿Cómo reaccionás ante una situación incómoda?", opts: ["Me pongo serio y cortante.", "Hago una broma para aliviar.", "Me río nerviosamente."] },
  { q: "¿Qué preferís para pasar el tiempo?", opts: ["Videojuegos o deporte.", "Salir con amigos.", "Ver series o películas."] },
  { q: "La de fuego: ¿Por 1 millón de dólares te acostarías con un varón?", opts: ["No hay plata que me haga hacerlo.", "Cierro los ojos y que sea rápido.", "Lo hago hasta gratis."] }
];

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getRandomQuestions(total = 22) {
  const shuffled = shuffleArray([...pools]);
  const selected = shuffled.slice(0, total);
  return selected.map(p => ({
    q: p.q,
    opts: p.opts.map((text, i) => ({ text, val: i * 5 }))
  }));
}

function generarBarra(paso, total) {
  const llenos = Math.round((paso / total) * 10);
  return `[${'█'.repeat(llenos)}${'░'.repeat(10 - llenos)}] ${paso}/${total}`;
}

function getDiagnostico(porcentaje) {
  return diagnosticos.find(d => porcentaje >= d.min && porcentaje <= d.max) || diagnosticos[0];
}

function generarPreguntasUnicas(sesion, total = 22) {
  if (!sesion.preguntas || sesion.preguntas.length === 0) {
    sesion.preguntas = getRandomQuestions(total);
    sesion.totalPreguntas = sesion.preguntas.length;
  }
  return sesion.preguntas;
}

export default new ZenCommand('testgay')
  .addAlias('soygay')
  .setCooldown(5)
  .setCategory('Juegos')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const sender = ctx.sender;

    if (partidas.has(sender)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *TEST EN CURSO*\n\n> Ya tenés un test activo. Respondé o escribí *cancelar* 😄`);
    }

    const preguntasAleatorias = getRandomQuestions(22);

    partidas.set(sender, {
      estado: 'lobby',
      paso: 0,
      puntaje: 0,
      chatId: ctx.chat,
      calculando: false,
      preguntas: preguntasAleatorias,
      totalPreguntas: preguntasAleatorias.length,
      timer: setTimeout(() => { partidas.delete(sender); }, 60000)
    });

    await ctx.react('🏳️‍🌈');
    return ctx.reply(
      `『 🏳️‍🌈 』 *TEST DE ORIENTACIÓN GAY*\n\n` +
      `> Serán *${preguntasAleatorias.length} preguntas aleatorias* para determinar tu nivel de 🌈.\n` +
      `> Cada vez que hagas el test, las preguntas cambiarán.\n\n` +
      `✦ *[ 1 ]* Sí, iniciar el test 🔥\n` +
      `✦ *[ 2 ]* No (Cancelar) 🏃‍♂️\n\n` +
      `> _Respondé con 1 o 2 sin prefijo._`
    );
  });

export const gayListener = {
  before: async (msg, sock, ctx) => {
    if (ctx.rawMsg.key.fromMe) return;

    const sender = ctx.sender;
    if (!partidas.has(sender)) return;

    const sesion = partidas.get(sender);
    if (sesion.calculando) return;
    if (sesion.chatId !== ctx.chat) return;

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    if (!body) return;

    const txt = body.trim().toLowerCase();
    if (['cancelar', 'salir', 'cancel'].includes(txt)) {
      clearTimeout(sesion.timer);
      partidas.delete(sender);
      await ctx.react('🛑');
      return ctx.reply(`『 🛑 』 *TEST CANCELADO*\n\n> Huiste de la verdad 😭`);
    }

    const num = parseInt(txt);
    if (isNaN(num)) return;

    if (sesion.estado === 'lobby') {
      if (num === 2) {
        clearTimeout(sesion.timer);
        partidas.delete(sender);
        await ctx.react('🛑');
        return ctx.reply(`『 🛑 』 *TEST CANCELADO*`);
      }
      if (num === 1) {
        sesion.estado = 'jugando';
        clearTimeout(sesion.timer);
        sesion.timer = setTimeout(() => { partidas.delete(sender); }, 60000);
        await enviarPreguntaGay(sock, ctx.chat, sender, sesion);
      }
      return;
    }

    const preguntas = generarPreguntasUnicas(sesion);
    if (num < 1 || num > preguntas[sesion.paso].opts.length) return;

    clearTimeout(sesion.timer);
    sesion.puntaje += preguntas[sesion.paso].opts[num - 1].val;
    sesion.paso++;

    if (sesion.paso >= preguntas.length) {
      sesion.calculando = true;
      const maxPuntaje = preguntas.length * 10;
      const porcentaje = Math.round((sesion.puntaje / maxPuntaje) * 100);
      const diagTexto = getDiagnostico(porcentaje).text;

      await ctx.react('⏳');
      await ctx.reply(`『 ⏳ 』 *PROCESANDO...*\n\n> Calculando tu nivel de 💅...`);

      setTimeout(async () => {
        await ctx.reply(
          `『 🏳️‍🌈 』 *EL VEREDICTO DE LA VERDAD*\n\n` +
          `✦ *Porcentaje:* ${porcentaje}%\n\n` +
          `${diagTexto}`
        );
        partidas.delete(sender);
      }, 3000);
    } else {
      sesion.timer = setTimeout(() => { partidas.delete(sender); }, 60000);
      await enviarPreguntaGay(sock, ctx.chat, sender, sesion);
    }
  }
};

async function enviarPreguntaGay(sock, chatId, sender, sesion) {
  const preguntas = generarPreguntasUnicas(sesion);
  const preg = preguntas[sesion.paso];
  let texto = `『 🏳️‍🌈 』 *TEST GAY — ${sesion.paso + 1}/${preguntas.length}*\n> Progreso: ${generarBarra(sesion.paso, preguntas.length)}\n\n*${preg.q}*\n\n`;
  preg.opts.forEach((o, i) => {
    const emojis = ['❶', '❷', '❸'];
    texto += `✦ *[ ${emojis[i]} ]* ${o.text}\n`;
  });
  texto += `\n> _Respondé con 1, 2 o 3 sin prefijo 😌_\n> _Escribí "cancelar" para salir._`;

  await sock.sendMessage(chatId, { text: texto, mentions: [sender] });
}