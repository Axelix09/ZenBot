import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

const MEDALLAS_NUM = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
const MEDALLAS_CUPS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];

const TEXTOS_TOP = {
  lindos: {
    emoji: '💖', titulo: 'LINDOS/AS',
    frases: [
      'Belleza natural', 'Tallado por los dioses', 'Rompiendo corazones',
      'Imposible no mirarle', 'Demasiada facha', 'Nivel modelo',
      'Se nota el gimnasio... o la genética', 'Cara de portada',
      'Ojos que enamoran', 'Sonrisa que desarma', 'El/la del grupo que todos miran',
      'Facha de otro nivel', 'Podría ser influencer', 'Un cuadro andante',
      'La genética le hizo un favor'
    ]
  },
  feos: {
    emoji: '🤢', titulo: 'FEOS',
    frases: [
      'Te pisó un tren', 'Rompes los espejos', 'Susto a medianoche',
      'Complicado de mirar', 'Solo te quiere tu mamá', 'Filtro obligatorio siempre',
      'La cámara sufre', 'Cara de velorio', 'Espantapájaros con wifi',
      'Ni Photoshop te salva', 'El espejo pide disculpas', 'Contraseña del router: no me mires',
      'Directo a la carpeta de recuerdos que no', 'Alarma para los perros del barrio'
    ]
  },
  otakus: {
    emoji: '🎌', titulo: 'OTAKUS',
    frases: [
      'No se baña hace 3 días', 'Su novia es 2D', 'Respira anime',
      'Huele a cebolla', 'Naruto runner', 'Tiene más figuras que amigos',
      'Sabe todos los openings de memoria', 'Llora con cada arco final',
      'Su fondo de pantalla es waifu', 'Vive maratoneando temporadas',
      'Colección de mangas más grande que su ropero', 'Discute subtítulos vs doblaje a muerte',
      'Sueña en formato 16:9 con opening incluido'
    ]
  },
  gays: {
    emoji: '🏳️‍🌈', titulo: 'GAYS',
    frases: [
      'Súper diva', 'Le encanta', 'Reina suprema', 'Se le moja la canoa',
      'Bate para el otro lado', 'Radar activado 100%', 'Sabe de moda más que nadie',
      'El más brillante del grupo', 'Con más pluma que gallinero',
      'Se le nota hasta en la forma de caminar', 'Reina indiscutida',
      'Detector de crush a distancia', 'Nivel diva: máximo'
    ]
  },
  lesbianas: {
    emoji: '✂️', titulo: 'LESBIANAS',
    frases: [
      'Reyna de las tijeras', 'Amante de los gatos', 'Usa camisa a cuadros',
      'Camionera ofical', 'Solo le gustan las chicas', 'Radar sáfico encendido',
      'Corte de pelo que lo confirma todo', 'Tiene más plantas que citas con hombres',
      'Energía de camioneta 4x4', 'Fan número uno de Shane de The L Word',
      'Con la tijera siempre lista', 'Directora del club de fans femenino'
    ]
  },
  putos: {
    emoji: '🍆', titulo: 'PUTOS',
    frases: [
      'Más regalado imposible', 'Le entra a todo', 'No perdona una',
      'Cobras caro', 'Goloso/a', 'Directo al chat privado siempre',
      'Ya tiene el DM listo para cualquiera', 'Le gusta la variedad',
      'Coleccionista de números', 'No respeta ni el toque de queda',
      'Fama que lo precede', 'Corazón (y otra cosa) abierto 24/7'
    ]
  },
  putas: {
    emoji: '🍑', titulo: 'PUTAS',
    frases: [
      'Se regala siempre', 'Facturando', 'Rompe camas', 'Nadie se salva',
      'Buscando colágeno', 'Agenda más llena que la del médico',
      'Reina de la noche sin descanso', 'No dice que no ni por casualidad',
      'Ya perdió la cuenta', 'Siempre lista para la fiesta',
      'El chisme del grupo empieza y termina acá', 'Trabajando horas extra'
    ]
  },
  cornudos: {
    emoji: '🦌', titulo: 'CORNUDOS',
    frases: [
      'Asta al techo', 'El reno del grupo', 'Bambi se queda corto',
      'Le adornaron la cabeza', 'No pasa por la puerta', 'Último en enterarse siempre',
      'Certificado de fidelidad vencido', 'Rodolfo le tiene envidia',
      'La corona le queda perfecta', 'El único que no vio las pruebas',
      'Referente nacional del tema', 'Con cuernos de exportación'
    ]
  },
  borrachos: {
    emoji: '🍺', titulo: 'BORRACHOS',
    frases: [
      'Hígado de acero', 'Vive en el bar', 'Toma hasta el agua del florero',
      'Siempre en pedo', 'Auspiciado por Quilmes', 'El kiosco lo conoce por el nombre',
      'Empieza temprano y no para', 'Ya tiene mesa reservada en el boliche',
      'Campeón nacional de la previa', 'No hay evento sin su litrona',
      'El after party le queda chico', 'Fiel amigo del vermú de las 6'
    ]
  },
  idiotas: {
    emoji: '🤡', titulo: 'IDIOTAS',
    frases: [
      'No suma 2+2', 'Falta materia gris', 'Se cae solo',
      'Habla sin pensar', 'Un milagro que respire', 'Pregunta lo obvio siempre',
      'Se pierde en su propia casa', 'Cree todo lo que lee en internet',
      'El meme del grupo, literal', 'Contesta antes de leer',
      'Su cerebro está en modo avión', 'Confunde izquierda con derecha siempre'
    ]
  }
};

const CATEGORIA_MAP = {
  lindo: 'lindos', linda: 'lindos', lindos: 'lindos', lindas: 'lindos',
  feo: 'feos', fea: 'feos', feos: 'feos', feas: 'feos',
  otaku: 'otakus', otakus: 'otakus',
  gay: 'gays', gays: 'gays',
  lesbiana: 'lesbianas', lesbi: 'lesbianas', lesbianas: 'lesbianas',
  puto: 'putos', putos: 'putos',
  puta: 'putas', putas: 'putas',
  cornudo: 'cornudos', cornuda: 'cornudos', cornudos: 'cornudos',
  borracho: 'borrachos', borracha: 'borrachos', borrachos: 'borrachos',
  idiota: 'idiotas', idiotas: 'idiotas'
};

const EMOJIS_GENERICOS = [
  '🔥', '🦄', '😈', '🍕', '😅', '😂', '😍', '👹', '💩', '🐸',
  '🤡', '👑', '🛸', '🦖', '🤠', '🧟', '😱', '🥵', '👻', '🙈',
  '😎', '🦋', '⚡', '🌟', '🧸', '🍀', '🎉', '🎃', '🐻', '🤖', '😜'
];

const pickN = (arr, n) => {
  const pool = [...arr];
  const result = [];
  while (result.length < n && pool.length) {
    result.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return result;
};

const normalizar = (text) =>
  (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

export default new ZenCommand('top5')
  .addAlias('topcinco', 'top')
  .setCooldown(8)
  .setCategory('Juegos')
  .requireGroup()
  .setUsage('<categoria>')
  .onExecute(async (ctx) => {
    const motivo = ctx.args.join(' ').trim();

    if (!motivo) {
      const disponibles = [...new Set(Object.values(CATEGORIA_MAP))]
        .map(t => TEXTOS_TOP[t].titulo.toLowerCase())
        .join(', ');

      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *ELEGÍ UNA CATEGORÍA*\n\n` +
        `> Uso: ${ZenConfig.prefix}${ctx.commandName} <categoria>\n` +
        `> Atajos ya creados: ${disponibles}\n` +
        `> También podés inventar la tuya: _${ZenConfig.prefix}${ctx.commandName} los más activos 😄_`
      );
    }

    const tipo = CATEGORIA_MAP[normalizar(motivo)];

    await ctx.react('🏆');

    const metadata = await ctx.sock.groupMetadata(ctx.chat).catch(() => null);
    if (!metadata) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *ERROR DE GRUPO*\n\n> No pude obtener la información del grupo 😵`);
    }

    const participantes = metadata.participants
      .filter(p => !p.admin && p.id !== ctx.sock.user.id && !p.id.includes('broadcast'))
      .map(p => p.id);

    if (participantes.length < 5) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *POCOS MIEMBROS*\n\n> Se necesitan al menos 5 miembros para armar el top 🙂`);
    }

    const top = [...participantes].sort(() => Math.random() - 0.5).slice(0, 5);

    if (tipo) {
      const tipoData = TEXTOS_TOP[tipo];
      const medallas = ['gays', 'lesbianas', 'putos', 'putas'].includes(tipo) ? MEDALLAS_CUPS : MEDALLAS_NUM;
      const frasesPool = [...tipoData.frases].sort(() => Math.random() - 0.5);

      const lineas = top
        .map((jid, i) => `${medallas[i]} @${jid.split('@')[0]} — ${frasesPool[i] ?? rnd(tipoData.frases)}`)
        .join('\n');

      return ctx.sock.sendMessage(ctx.chat, {
        text: `『 ${tipoData.emoji} 』 *TOP 5 ${tipoData.titulo}*\n\n${lineas}`,
        mentions: top
      }, { quoted: ctx.rawMsg });
    }

    if (motivo.length < 3) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *CATEGORÍA MUY CORTA*\n\n> Escribí algo un poco más claro para tu top 😌`);
    }

    const emojis = pickN(EMOJIS_GENERICOS, 5);
    const lineas = top
      .map((jid, i) => `${MEDALLAS_NUM[i]} @${jid.split('@')[0]} ${emojis[i]}`)
      .join('\n');

    return ctx.sock.sendMessage(ctx.chat, {
      text: `『 ${rnd(EMOJIS_GENERICOS)} 』 *TOP 5 ${motivo.toUpperCase()}*\n\n${lineas}`,
      mentions: top
    }, { quoted: ctx.rawMsg });
  });
