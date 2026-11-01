import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';

const COOLDOWN_SECONDS = 600;

const JOBS = [
  { n: "Limpiador de la NASA", h: "Limpiaste los cristales del telescopio James Webb y encontraste una moneda pegada." },
  { n: "Doble de riesgo", h: "Saltaste de un edificio de 20 pisos. Sobreviviste, pero el presupuesto solo alcanzó para esto." },
  { n: "Instructor de abuelos", h: "Le explicaste a diez abuelos que el Wi-Fi no es magia negra. Te dieron propina." },
  { n: "Vendedor de arena", h: "Lograste venderle arena a un jeque árabe. Eres un genio del marketing." },
  { n: "Moderador de grupos", h: "Sobreviviste diez minutos en un grupo de debates políticos sin enloquecer. Te mereces un aumento." },
  { n: "Traductor de hackers", h: "Ayudaste a descifrar un mensaje secreto que decía 'Admin123'. Fue un trabajo sumamente duro." },
  { n: "Paseador de perros Pitbull", h: "Los perros te pasearon a ti por todo el vecindario, pero al menos te pagaron el servicio." },
  { n: "Estatua viviente", h: "No te moviste en ocho horas continuas. Un niño te confundió con un monumento, pero la paga fue buena." },
  { n: "Escritor de perfiles de Tinder", h: "Redactaste la descripción de perfil de un cliente difícil y consiguió tres emparejamientos. Eres un héroe." },
  { n: "Guardián de Servidores", h: "Evitaste que el servidor central colapsara cuando el desarrollador intentó instalar un módulo defectuoso." },
  { n: "Extra en película de Marvel", h: "Interpretaste el rol de un civil que huye despavorido. Tu actuación de dos segundos fue notable." },
  { n: "Podólogo de la Red Profunda", h: "Es mejor no preguntar qué tipo de pies examinaste hoy. La paga es lo único rescatable." },
  { n: "Reparador de Nokia antiguo", h: "Intentaste arreglar un teléfono indestructible y rompiste la mesa del taller. El dispositivo sigue intacto." },
  { n: "Jinete de Unicornios de feria", h: "Realmente era un burro viejo con un cono de cartón adherido, pero los niños se divirtieron mucho." },
  { n: "Streamer de Buscaminas", h: "Tuviste dos espectadores activos, pero uno de ellos era un bot automático que te envió una donación." },
  { n: "Embotellador de aire de montaña", h: "Vendiste botellas de 'Esencia de la Naturaleza'. Realmente era aire tomado de tu propio ventilador." },
  { n: "Niñero de osos de peluche", h: "Custodiaste la valiosa colección privada de un millonario excéntrico. Ningún muñeco intentó escapar." },
  { n: "Payaso de temática gótica", h: "Moldeaste globos con forma de ataúd en una fiesta infantil. Fue una experiencia bastante diferente." },
  { n: "Sujeto de pruebas de laboratorio", h: "Probaste un prototipo de bebida energética experimental y ahora aseguras ver el color de la música." },
  { n: "Crítico de piña en la pizza", h: "Te pagaron por decidir si la piña pertenece a la receta italiana. Dijiste que sí y te despidieron de inmediato." },
  { n: "Entrenador de hormigas", h: "Construyeron una pirámide biológica ordenada. Fue el acontecimiento del año en el jardín." },
  { n: "Contador de votos aislado", h: "Contaste boletas electorales en una isla desierta. El escrutinio dio por ganador a un coco seco." },
  { n: "Asistente del Hada de los Dientes", h: "Te quedaste sin cambio de madrugada y tuviste que dejar un pagaré formal debajo de la almohada del niño." },
  { n: "Especialista en aguacates", h: "Seleccionaste deis frutos en el mercado y todos estaban en su punto de madurez perfecto. Eres un experto." },
  { n: "Aprendiz de mago callejero", h: "Hiciste desaparecer la totalidad de tu salario en un segundo. Realmente un truco asombroso." },
  { n: "Avistador de OVNIs nocturno", h: "Divisaste una luz misteriosa sobrevolando el campo; resultó ser la linterna del vigilante expulsándote." },
  { n: "Buscador de calcetines perdidos", h: "Encontraste la prenda izquierda que habías extraviado en el año 2015. Es un milagro doméstico." },
  { n: "Limpiador de cumbres de montaña", h: "Removiste un chicle pegado con fuerza en la cima del Everest." },
  { n: "Estilista de cebras del zoológico", h: "Le retocaste las rayas oscuras a una cebra que estaba perdiendo el color de su piel." },
  { n: "Masajista de vacas lecheras", h: "El producto lácteo salió con burbujas de lo relajado que dejaste al animal tras la sesión." },
  { n: "Probador de cajas de cartón", h: "Te sentaste sobre cincuenta cajas para validar su resistencia industrial. Te dormiste en la quinta." },
  { n: "Instructor de meditación para rocas", h: "Le enseñaste relajación mental a una piedra lisa. Fue el alumno más silencioso y aplicado de la clase." },
  { n: "Recolector de polvo lunar", h: "Trajiste una muestra fina de polvo de luna adherida a la suela de tus zapatos tras un viaje simulado y la vendiste." },
  { n: "Fabricante de velas aromáticas", h: "Diseñaste velas artesanales con fragancia a 'computadora recién encendida'. Se agotaron al instante." },
  { n: "Evaluador de perfumes de lujo", h: "Oliste tantas muestras que ahora tu sentido del olfato solo registra olor a cebolla fresca." },
  { n: "Repartidor de pizza veloz", h: "Llegaste a la dirección en 29 minutos. El cliente quería que tardaras 31 para recibir el pedido gratis." },
  { n: "Gondolero de alcantarilla", h: "Transportaste en una pequeña barca a una rata en su primera cena romántica." },
  { n: "Músico urbano de semáforo", h: "Interpretaste acordes usando un triángulo metálico. Un conductor te dio dinero para que te detuvieras." },
  { n: "Investigador privado de vecindarios", h: "Descubriste que la vecina del piso superior utiliza una peluca costosa. Una revelación valiosa." },
  { n: "Apagafuegos de parrilladas", h: "Lograste salvar la carne de quemarse, pero terminaste cubierto de salsa y ceniza." },
  { n: "Piloto de cometas de papel", h: "Llevaste un mensaje romántico a través del cielo. La pareja se separó a los dos días." },
  { n: "Tejedor de nubes de algodón", h: "Confeccionaste un abrigo usando algodón de azúcar puro. Se lo devoró un ave en pleno vuelo." },
  { n: "Lustrador de estatuas de bronce", h: "Los monumentos de la plaza histórica nunca habían tenido los pies tan brillantes." },
  { n: "Evaluador de sabores de helado", h: "Sufriste un breve congelamiento cerebral por el frío, pero valió la pena cada bocado." },
  { n: "Inflador de globos de fiesta", h: "Inflaste quinientos globos usando tus pulmones. Ahora tu voz suena extremadamente aguda." },
  { n: "Cosechador de memes antiguos", h: "Encontraste una imagen humorística del año 2012 que todavía genera risas. Oro puro de internet." },
  { n: "Transportador de caracoles de jardín", h: "Levaste a uno de una hoja a otra de forma segura. El trayecto demoró cuatro días enteros." },
  { n: "Maletero de hormigas obreras", h: "Cargaste una miga de pan integral durante dos metros. Fue un esfuerzo físico titánico." },
  { n: "Bañador de felinos salvajes", h: "Saliste del baño con más deis cicatrices que un guerrero medieval, pero lograste dejar limpio al animal." },
  { n: "Ayudante auxiliar del Bot", h: "Preparaste el café caliente para los demás deis procesos del sistema. Te dejaron beber las sobras." }
];

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export default new ZenCommand('trabajar')
  .addAlias('work', 'w', 'laburar', 'chamba')
  .setCooldown(0)
  .setCategory('Economía')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();

    if (user.loans?.blockedPermanently) {
      await ctx.react('🚫');
      return ctx.reply(
        V.blocked.permanent(user)
      );
    }

    if (user.loans?.isBlocked && !user.loans?.isPromised) {
      await ctx.react('🔒');
      return ctx.reply(
        V.blocked.debt(user)
      );
    }

    const now = Date.now();
    if (!user.cooldowns) {
      user.cooldowns = {};
    }

    const lastUsed = user.cooldowns.trabajar;
    const cooldownAmount = COOLDOWN_SECONDS * 1000;

    if (lastUsed) {
      const expirationTime = lastUsed + cooldownAmount;
      if (now < expirationTime) {
        const timeLeftSec = (expirationTime - now) / 1000;
        const m = Math.floor(timeLeftSec / 60);
        const s = Math.floor(timeLeftSec % 60);
        const timeStr = m > 0 ? `${m}m ${s}s` : `${s}s`;
        await ctx.react('⏳');
        return ctx.reply(`『 ⏳ 』 *ENFRIAMIENTO*\n\n> Esperá *${timeStr}* para trabajar de nuevo 😴`);
      }
    }

    if (!user.inventory) user.inventory = {};
    if (!user.dailyStats) user.dailyStats = {};

    const job = pickRandom(JOBS);
    const base = Math.floor(Math.random() * 300) + 300;
    const bonusLevel = user.level * 25;
    const subtotal = base + bonusLevel;

    let bonusSuit = 0;
    let usedBuff = false;
    user.cooldowns.trabajar = now;
    if (typeof user.markModified === 'function') {
      user.markModified('cooldowns');
    }

    if (user.inventory.suit && !user.dailyStats.suitUsed) {
      bonusSuit = Math.floor(subtotal * 0.20);
      user.dailyStats.suitUsed = true;
      if (typeof user.markModified === 'function') {
        user.markModified('dailyStats');
      }
      usedBuff = true;
    }

    let luxGained = 0;
    if (Math.random() < 0.15) {
      luxGained = Math.floor(Math.random() * 3) + 1;
    }

    const total = subtotal + bonusSuit;
    user.zencoins = (user.zencoins || 0) + total;
    user.lux = (user.lux || 0) + luxGained;

    await user.save();
    await ctx.react('💼');

    let lines = [
      `『 💼 』 *REGISTRO LABORAL*`,
      ``,
      `✦ *Puesto:* ${job.n}`,
      `✦ *Detalle:* _${job.h}_`,
      ``,
      `✦ *Pago base:* ${base} ${ZenConfig.currencies.zencoins.emoji}`,
      `✦ *Bono de nivel (+${user.level}):* +${bonusLevel} ${ZenConfig.currencies.zencoins.emoji}`
    ];

    if (usedBuff) {
      lines.push(`✦ *Bono Traje de Magnate:* +${bonusSuit} ${ZenConfig.currencies.zencoins.emoji} ✅`);
    }

    if (luxGained > 0) {
      lines.push(`✦ *Bono extra:* +${luxGained} ${ZenConfig.currencies.lux.emoji} ✨`);
    }

    lines.push(
      ``,
      `✦ *Total:* ${total} ${ZenConfig.currencies.zencoins.emoji}` +
      (luxGained > 0 ? ` + ${luxGained} ${ZenConfig.currencies.lux.emoji}` : '')
    );

    return ctx.reply(lines.join('\n'));
  });