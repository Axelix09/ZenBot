import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

const partidas = new Map();

const diagnosticos = [
  { min: 0, max: 5, text: '🚶 *100% Monosexual.* Estás firmemente de un solo lado. No hay confusión acá. 🚶‍♂️🚶‍♀️' },
  { min: 6, max: 15, text: '👍 *Curiosidad leve.* Sabés reconocer la belleza en cualquier género. 👍' },
  { min: 16, max: 30, text: '👀 *Flexibilidad activada.* Mayormente te gusta un género, pero hubo excepciones. 🍷' },
  { min: 31, max: 50, text: '⚖️ *El Bi-Cycle te tiene de hijo.* Una semana sos 100% hétero y al siguiente te replanteás todo. 🚴' },
  { min: 51, max: 70, text: '💜 *Oficialmente de los dos bandos.* Hacés pistolitas con las manos. 💙' },
  { min: 71, max: 90, text: '👑 *Bisexual Empoderado.* Te enamorás de la persona, del alma y del físico. 🔥' },
  { min: 91, max: 98, text: '🌈 *Bisexual Supremo.* Amante del caos. Tu orientación es una montaña rusa. 🎢' },
  { min: 99, max: 100, text: '👑 *100% BISEXUAL SUPREMO.* CEO del Bi-Panic. El caos te define. 👑🔥🌈' }
];

const poolsHombre = [
  { q: "Ves a una pareja por la calle donde ambos son hermosos. ¿Qué pensás?", opts: ["Miro a la chica y pienso 'qué suertudo el pibe'.", "Miro a los dos y digo 'fua, qué facheros son'.", "Entro en crisis porque no sé a cuál de los dos le daría primero."] },
  { q: "¿Alguna vez experimentaste el famoso 'Bi-Cycle'?", opts: ["No, mis gustos no cambian nunca.", "A veces tengo épocas donde miro un poco más a los chicos.", "Sí, un día soy Ricky Martin y al otro Romeo Santos."] },
  { q: "¿Te pondrías ropa considerada 'andrógina' o femenina?", opts: ["Ni loco, soy 100% masculino.", "Depende, capaz pintarme las uñas o anillos.", "Me pongo una falda si me combina con el outfit."] },
  { q: "Estás con tus amigos más facheros. Vos:", opts: ["Los trato de bros, punto.", "Admito que tienen facha, sin miedo.", "Les daría un beso de buenas noches a mis compas."] },
  { q: "¿Cuál fue tu crush famoso de la infancia?", opts: ["Megan Fox, obvio.", "Brad Pitt y Angelina Jolie a la vez.", "Ryan Reynolds, sin pensarlo dos veces."] },
  { q: "¿Cómo te sentás habitualmente?", opts: ["Normal, recto o abierto.", "Medio cruzado a veces.", "Me es físicamente imposible sentarme derecho."] },
  { q: "¿Alguna vez tuviste un 'pánico gay/hetero' repentino?", opts: ["Nunca, soy un libro abierto.", "A veces me pregunto si no seré 100% de un lado.", "Todos los días dudo de qué me gusta realmente."] },
  { q: "Si pudieras tener un trío, sería:", opts: ["Yo y dos chicas, el sueño.", "Yo y dos hombres, si me pinta.", "Mixto. Un poco de todo, como en el buffet."] },
  { q: "¿Qué hacés con las manos cuando estás nervioso?", opts: ["Las meto en los bolsillos.", "Hablo un poco con las manos.", "Hago pistolitas o el signo de la paz."] },
  { q: "¿Cómo usás los puños de la camisa?", opts: ["Normales, cerrados.", "Arremangados hasta el codo.", "Arremangados justo a la mitad del antebrazo."] },
  { q: "Si pudieras elegir un porcentaje de atracción en tu vida, ¿cuál es?", opts: ["100% mujeres o 100% hombres.", "80/20. Tiro mucho más para un lado.", "50/50 y cambia drásticamente cada semana."] },
  { q: "Ves al protagonista masculino de una película de acción:", opts: ["Pienso 'ojalá tener ese físico'.", "Admiro su carisma y estilo.", "Me pregunto a qué sabrán sus labios."] },
  { q: "Sobre 'salir del clóset':", opts: ["Soy hétero, no necesito eso.", "Mis amigos íntimos saben que fluyo.", "Literalmente salgo y vuelvo a entrar al clóset cada mes."] },
  { q: "En una fiesta, con un par de tragos de más:", opts: ["Trato de encarar chicas solamente.", "Bailo con mis amigos y me río.", "Beso a cualquier cosa linda que respire."] },
  { q: "¿Qué música domina tu playlist?", opts: ["Trap, Reggaeton o Rock pesado.", "Pop comercial o Indie tranqui.", "The Neighbourhood, Arctic Monkeys o Frank Ocean."] },
  { q: "¿Qué chiste interno te define mejor?", opts: ["No tengo uno específico.", "Chistes de borrachos o tíos.", "'No sé sentarme ni tomar decisiones en la vida'."] },
  { q: "Tu estética visual preferida en redes:", opts: ["Fotos normales, asados o mi auto.", "Ropa aesthetic urbana.", "Eboy, ranas, hongos o luces de neón moradas/rosas."] },
  { q: "¿Qué tipo de lentes de sol usás?", opts: ["Ray-Ban clásicos o ninguno.", "Gafas deportivas o de colores.", "Lentes con marco metálico finito, tipo retro."] },
  { q: "Sobre los villanos de las películas:", opts: ["Los odio, quiero que gane el héroe.", "Son divertidos a veces.", "Tienen una energía bisexual increíble."] },
  { q: "La de fuego: ¿Con quién pasarías la noche?", opts: ["Con la mujer de mis sueños.", "Principalmente uno, pero acepto un comodín.", "Si hay química, me da igual lo que haya abajo."] },
  { q: "¿Qué hacés cuando ves a un chico lindo con estilo?", opts: ["No le doy importancia.", "Pienso 'qué bien se ve'.", "Me pongo nervioso y no sé dónde mirar."] },
  { q: "Tu plan perfecto para un sábado a la noche:", opts: ["Juntada con los pibes.", "Salir a bailar o a un bar.", "Cena romántica con alguien especial."] },
  { q: "¿Qué tipo de música te gusta más?", opts: ["Rock pesado o Metal.", "Pop o Reggaeton.", "Electrónica o Indie."] },
  { q: "La de fuego: ¿Por 1 millón de dólares te acostarías con un varón?", opts: ["No hay plata que me haga hacerlo.", "Cierro los ojos y que sea rápido.", "Lo hago hasta gratis."] }
];

const poolsMujer = [
  { q: "Ves a una pareja donde ambos son hermosos. ¿Qué pensás?", opts: ["Miro al chico y pienso 'qué lindo que es'.", "Miro a los dos y digo 'hacen re linda pareja'.", "Entro en pánico porque no sé a cuál quiero más."] },
  { q: "¿Te pasó preguntarte '¿Quiero SER ella o quiero ESTAR con ella?'", opts: ["No, siempre sé que solo envidio su ropa o pelo.", "A veces admiro tanto a una mujer que me confundo.", "Esa pregunta atormenta mi cabeza el 90% del tiempo."] },
  { q: "Tu tipo de pantalón favorito es:", opts: ["Calzas o jeans ajustados.", "Jeans mom o rectos.", "Cargo pants, corduroy o cualquier pantalón arremangado."] },
  { q: "Respecto a tu cabello:", opts: ["Lo llevo largo y natural.", "Me lo tiño o corto normal.", "Tuve un bob, un mullet o me lo teñí a medias en crisis."] },
  { q: "Tu crush animado de la infancia fue:", opts: ["El Príncipe Eric o Aladdin.", "Kim Possible o Mulan.", "Shego de Kim Possible... definitivamente."] },
  { q: "Cuando tenés que saludar a alguien y te ponés incómoda:", opts: ["Doy un beso en la mejilla.", "Abrazo medio rápido.", "Hago la seña de la paz ✌️ y me río nerviosa."] },
  { q: "Sobre tus amistades femeninas cercanas:", opts: ["Las quiero como hermanas.", "Somos muy unidas y cariñosas.", "A veces hay tanta tensión que no sé si somos amigas o qué."] },
  { q: "Tu artista musical de confort es:", opts: ["Taylor Swift, Ariana o Tini.", "Dua Lipa o Doja Cat.", "Clairo, The Neighbourhood o Girl in Red."] },
  { q: "¿Cómo usás tus anillos?", opts: ["Ninguno o solo uno de oro.", "Varios anillos finitos y delicados.", "Múltiples anillos gruesos de plata en varios dedos."] },
  { q: "Tu calzado del día a día:", opts: ["Zapatos altos o zapatillas blancas.", "Zapatillas deportivas comunes.", "Vans, Converse gastadas o Doc Martens."] },
  { q: "¿Cuál es tu dinámica con 'chicos lindos' vs 'chicas lindas'?", opts: ["Los chicos me atraen, las chicas son amigas.", "Me caen bien todos, pero busco novio.", "Los chicos me gustan en teoría, pero las chicas me dan pánico."] },
  { q: "¿Cómo te sentás cuando estás relajada?", opts: ["Derechita o piernas cruzadas.", "Normal, como caiga.", "Como si no tuviera huesos o rodillas al pecho."] },
  { q: "Tu tipo de humor en internet es:", opts: ["Memes de Facebook o normales.", "Tik Toks de baile o comedia.", "Humor roto, irónico y chistes sobre no poder elegir nada."] },
  { q: "Si te dan a elegir entre un 'chico skater alt' o una 'chica alt/gótica':", opts: ["El chico skater toda la vida.", "Ninguno, me gustan más 'normales'.", "Cualquiera de los dos tiene el poder de arruinarme la vida."] },
  { q: "En un libro o película, te enamorás de:", opts: ["El héroe valiente.", "La protagonista fuerte.", "El villano incomprendido... o la villana sádica."] },
  { q: "¿Cómo es tu estilo de ropa en la semana?", opts: ["Siempre combinada y femenina.", "Ropa deportiva cómoda o tomboy.", "Me visto como Adam Sandler un día y como un hada al siguiente."] },
  { q: "¿Gatos o Perros?", opts: ["Perros 100%.", "Gatos 100%.", "Soy bisexual... me gustan ambos."] },
  { q: "Sobre morderse el labio o mover las manos:", opts: ["No tengo esos tics.", "A veces cuando dudo de algo.", "Literalmente no sé estar quieta."] },
  { q: "¿Qué opinás de la estética de los vampiros?", opts: ["Me dan miedo.", "Son interesantes en las películas.", "Crepúsculo me hizo dudar de toda mi existencia."] },
  { q: "¿Qué hacés cuando ves a una chica linda con estilo?", opts: ["La ignoro.", "La observo y pienso 'qué lindo outfit'.", "Me pongo nerviosa y no sé dónde mirar."] },
  { q: "¿Cuál es tu plan ideal para un fin de semana?", opts: ["Salir de fiesta con amigos.", "Netflix y pizza.", "Ir a una feria de plantas y después a un café de especialidad."] },
  { q: "¿Qué tipo de música te gusta más?", opts: ["Rock o Metal.", "Pop o Reggaeton.", "Indie o Alternativo."] },
  { q: "¿Cómo reaccionás ante una situación incómoda?", opts: ["Me pongo seria y cortante.", "Hago una broma para aliviar.", "Me río nerviosamente."] },
  { q: "La de fuego: ¿Qué te importa más en una persona para salir con ella?", opts: ["Que sea un buen hombre.", "Su personalidad.", "Me enamoro del alma, no importa lo que haya abajo."] }
];

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getRandomQuestions(pool, total = 22) {
  const shuffled = shuffleArray([...pool]);
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
    const pool = sesion.genero === 'hombre' ? poolsHombre : poolsMujer;
    sesion.preguntas = getRandomQuestions(pool, total);
    sesion.totalPreguntas = sesion.preguntas.length;
  }
  return sesion.preguntas;
}

export default new ZenCommand('testbisexual')
  .addAlias('soybisexual', 'soybi')
  .setCooldown(5)
  .setCategory('Juegos')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const sender = ctx.sender;

    if (partidas.has(sender)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *TEST EN CURSO*\n\n> Ya tenés un test activo. Respondé o escribí *cancelar* 🙂`);
    }

    partidas.set(sender, {
      genero: null,
      paso: 0,
      puntaje: 0,
      calculando: false,
      chatId: ctx.chat,
      preguntas: [],
      totalPreguntas: 0,
      timer: setTimeout(() => { partidas.delete(sender); }, 60000)
    });

    await ctx.react('💜');
    return ctx.reply(
      `『 💜 』 *TEST DE BISEXUALIDAD*\n\n` +
      `> Serán *22 preguntas aleatorias* adaptadas a tu género 😄\n` +
      `> Cada vez que hagas el test, las preguntas cambiarán.\n\n` +
      `> Antes de empezar, decime tu género:\n\n` +
      `✦ *[ 1 ]* Soy Varón 👨\n` +
      `✦ *[ 2 ]* Soy Mujer 👩\n\n` +
      `> _Respondé con 1 o 2 sin prefijo._`
    );
  });

export const bisexualListener = {
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
      return ctx.reply(`『 🛑 』 *TEST CANCELADO*\n\n> Huiste de la verdad 😵`);
    }

    const num = parseInt(txt);
    if (isNaN(num)) return;

    if (!sesion.genero) {
      if (num === 1 || num === 2) {
        sesion.genero = num === 1 ? 'hombre' : 'mujer';
        clearTimeout(sesion.timer);
        sesion.timer = setTimeout(() => { partidas.delete(sender); }, 60000);
        await enviarPreguntaBi(sock, ctx.chat, sender, sesion);
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
      const diagnostic = getDiagnostico(porcentaje);

      await ctx.react('⏳');
      await ctx.reply(`『 ⏳ 』 *ANALIZANDO...*\n\n> Calculando tu bi-panic... 🔮`);

      setTimeout(async () => {
        await ctx.reply(
          `『 💜 』 *EL VEREDICTO BISEXUAL*\n\n` +
          `✦ *Porcentaje:* ${porcentaje}%\n\n` +
          `${diagnostic.text}`
        );
        partidas.delete(sender);
      }, 3000);
    } else {
      sesion.timer = setTimeout(() => { partidas.delete(sender); }, 60000);
      await enviarPreguntaBi(sock, ctx.chat, sender, sesion);
    }
  }
};

async function enviarPreguntaBi(sock, chatId, sender, sesion) {
  const preguntas = generarPreguntasUnicas(sesion);
  const preg = preguntas[sesion.paso];
  let texto = `『 💜 』 *TEST BISEXUAL — ${sesion.paso + 1}/${preguntas.length}*\n> Progreso: ${generarBarra(sesion.paso, preguntas.length)}\n\n*${preg.q}*\n\n`;
  preg.opts.forEach((o, i) => {
    const emojis = ['❶', '❷', '❸'];
    texto += `✦ *[ ${emojis[i]} ]* ${o.text}\n`;
  });
  texto += `\n> _Respondé con 1, 2 o 3 sin prefijo 😉_\n> _Escribí "cancelar" para salir._`;

  await sock.sendMessage(chatId, { text: texto, mentions: [sender] });
}