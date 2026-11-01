import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

const partidas = new Map();

const diagnosticos = [
  { min: 0, max: 5, text: '🛡️ *100% Heterosexual.* Reina de los varones. No hay rastros de tijeras en tu ADN. Estás a salvo. 👨' },
  { min: 6, max: 15, text: '💅 *Heterosexual Premium.* Admirás la belleza femenina, pero a la hora de la verdad, buscás un hombre. ✨' },
  { min: 16, max: 30, text: '👀 *Bi-curiosa en negación.* A veces te cruzás con una chica de pelo corto y te olvidás de cómo respirar. 🍷' },
  { min: 31, max: 50, text: '⚖️ *Bisexual en crisis.* Te gustan los chicos pero las mujeres te intimidan y te dejan sin palabras. 🔥' },
  { min: 51, max: 70, text: '🚪 *Clóset de cristal.* Todos tus amigos ya lo saben. Escuchás a Girl in Red y vestís oversize. Salí de ahí. ✂️' },
  { min: 71, max: 90, text: '🏳️‍🌈 *Oficialmente del bando.* Sos torta, leñadora, dueña de 3 gatos y tu ex es tu mejor amiga. 🐾' },
  { min: 91, max: 98, text: '🚚 *Leyenda Sáfica Inalcanzable.* Tenés un mosquetón en las llaves y te mudás a las dos semanas con tu novia. 💍' },
  { min: 99, max: 100, text: '👑 *100% TIJERETA SUPREMA.* CEO del lesbianismo. Entrás a un lugar y la heterosexualidad femenina colapsa. ✂️🌈' }
];

const pools = [
  { q: "¿Alguna vez miraste a una chica y pensaste 'ojalá me mirara'?", opts: ["Nunca, solo me atraen los hombres.", "Sí, como admiración estética.", "Sí, imaginando toda una vida juntas."] },
  { q: "Tu calzado favorito para salir es...", opts: ["Tacos o sandalias finas.", "Zapatillas urbanas normales.", "Borcegos, Doc Martens o Vans gastadas."] },
  { q: "¿Cómo tenés las uñas normalmente?", opts: ["Largas, esculpidas y pintadas.", "Corta normal o francesitas.", "Muy cortas y súper prolijas... por las dudas."] },
  { q: "En una primera cita vos...", opts: ["Espero que él pague todo.", "Dividimos mitad y mitad.", "Le abro la puerta, le pago la cena y la acompaño a casa."] },
  { q: "¿Qué mascotas preferís?", opts: ["Un perro grande y guardián.", "Un perro chiquito o un gato.", "Tres gatos rescatados, una iguana y un hurón."] },
  { q: "Tu música más escuchada en Spotify es...", opts: ["Reggaeton, Trap o Pop comercial.", "Indie Pop o Rock.", "Girl in Red, Clairo, Hayley Kiyoko o Billie Eilish."] },
  { q: "¿Cuándo creés que es el momento para mudarse en pareja?", opts: ["Después de un par de años juntos.", "A los 6 meses más o menos.", "A la segunda semana de conocerla alquilamos el camión de mudanza."] },
  { q: "¿Qué accesorio no te puede faltar?", opts: ["Collar de perlas o aros delicados.", "Un reloj bonito.", "Muchos anillos gruesos de plata y un mosquetón para las llaves."] },
  { q: "¿Cómo definirías tu estilo de ropa ideal?", opts: ["Vestidos ajustados, polleras y tops.", "Jeans, remeras básicas y camperas.", "Camisas a cuadros, oversize y estética Adam Sandler."] },
  { q: "El vehículo de tus sueños es:", opts: ["Un auto deportivo descapotable.", "Un auto de ciudad, chico y lindo.", "Una camioneta Subaru Forester."] },
  { q: "De niña, tu personaje ficticio favorito era:", opts: ["Alguna princesa Disney.", "Mulan o Mérida.", "Marceline de Hora de Aventura o Shego."] },
  { q: "Se rompe algo en casa. ¿Qué hacés?", opts: ["Llamo a un hombre para que lo arregle.", "Intento arreglarlo con cinta o un cuchillo.", "Saco mi caja de herramientas completa y lo soluciono."] },
  { q: "¿Qué deporte te atrae más?", opts: ["Patinaje artístico, baile o ninguno.", "Gimnasio o running.", "Fútbol femenino, Softbol o Roller Derby."] },
  { q: "¿Cómo son tus grupos de amigas?", opts: ["Todas chicas hetero que hablan de chicos.", "Mixto, de todo un poco.", "Literalmente mi grupo de amigas son mis ex novias."] },
  { q: "¿Cómo te sentás en una silla?", opts: ["Derechita y con las piernas cruzadas.", "Normal, relajada.", "Despatarrada, con una pierna arriba o como si no tuviera huesos."] },
  { q: "Tu relación con la astrología:", opts: ["No creo en esas pavadas.", "Sé mi signo solar y leo el horóscopo a veces.", "Sé mi carta astral completa, la tuya y la de mis gatos."] },
  { q: "¿Qué corte de pelo te tienta hacerte?", opts: ["Dejármelo larguísimo y lacio.", "Un corte por los hombros o flequillo.", "Un mullet, wolf cut o raparme los costados."] },
  { q: "¿Qué onda con los tatuajes?", opts: ["No me gustan, o tengo uno muy chiquito.", "Tengo un par de frases lindas.", "Tengo un bosque entero en el brazo o tatuajes stick and poke."] },
  { q: "Sobre el cuidado de las plantas:", opts: ["Se me mueren hasta los cactus.", "Tengo un par de suculentas que sobreviven.", "Soy madre de 40 plantas de interior y les hablo."] },
  { q: "¿Qué hacés cuando ves a una chica linda con estilo?", opts: ["La ignoro.", "La observo y pienso 'qué lindo outfit'.", "Me pongo nerviosa y no sé dónde mirar."] },
  { q: "¿Cuál es tu plan ideal para un fin de semana?", opts: ["Salir de fiesta con amigos.", "Netflix y pizza.", "Ir a una feria de plantas y después a un café de especialidad."] },
  { q: "¿Qué tipo de música te gusta más?", opts: ["Rock o Metal.", "Pop o Reggaeton.", "Indie o Alternativo."] },
  { q: "¿Cómo reaccionás ante una situación incómoda?", opts: ["Me pongo seria y cortante.", "Hago una broma para aliviar.", "Me río nerviosamente."] },
  { q: "¿Qué preferís para pasar el tiempo?", opts: ["Salir de compras.", "Ver series o películas.", "Salir con amigas."] },
  { q: "La de fuego: ¿Por 1 millón de dólares, te acostarías con una chica hermosa?", opts: ["Ni por todo el oro, soy hétero.", "Cierro los ojos y cobro el millón.", "Yo PAGARÍA un millón para hacerlo."] }
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

export default new ZenCommand('testlesbiana')
  .addAlias('soylesbiana', 'tortatest')
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

    await ctx.react('👩‍❤️‍💋‍👩');
    return ctx.reply(
      `『 👩‍❤️‍💋‍👩 』 *TEST DE ORIENTACIÓN LESBIANA*\n\n` +
      `> Serán *${preguntasAleatorias.length} preguntas aleatorias* para determinar tu nivel de ✂️.\n` +
      `> Cada vez que hagas el test, las preguntas cambiarán.\n\n` +
      `✦ *[ 1 ]* Sí, iniciar el test 🔥\n` +
      `✦ *[ 2 ]* No (Cancelar) 🏃‍♀️\n\n` +
      `> _Respondé con 1 o 2 sin prefijo._`
    );
  });

export const lesbianaListener = {
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
      return ctx.reply(`『 🛑 』 *TEST CANCELADO*\n\n> No quisiste ver la verdad 😢`);
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
        await enviarPreguntaLes(sock, ctx.chat, sender, sesion);
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
      await ctx.reply(`『 ⏳ 』 *PROCESANDO...*\n\n> Calculando tu nivel de ✂️...`);

      setTimeout(async () => {
        await ctx.reply(
          `『 👩‍❤️‍💋‍👩 』 *EL VEREDICTO DE LA VERDAD*\n\n` +
          `✦ *Porcentaje:* ${porcentaje}%\n\n` +
          `${diagTexto}`
        );
        partidas.delete(sender);
      }, 3000);
    } else {
      sesion.timer = setTimeout(() => { partidas.delete(sender); }, 60000);
      await enviarPreguntaLes(sock, ctx.chat, sender, sesion);
    }
  }
};

async function enviarPreguntaLes(sock, chatId, sender, sesion) {
  const preguntas = generarPreguntasUnicas(sesion);
  const preg = preguntas[sesion.paso];
  let texto = `『 👩‍❤️‍💋‍👩 』 *TEST LESBIANA — ${sesion.paso + 1}/${preguntas.length}*\n> Progreso: ${generarBarra(sesion.paso, preguntas.length)}\n\n*${preg.q}*\n\n`;
  preg.opts.forEach((o, i) => {
    const emojis = ['❶', '❷', '❸'];
    texto += `✦ *[ ${emojis[i]} ]* ${o.text}\n`;
  });
  texto += `\n> _Respondé con 1, 2 o 3 sin prefijo 😉_\n> _Escribí "cancelar" para salir._`;

  await sock.sendMessage(chatId, { text: texto, mentions: [sender] });
}