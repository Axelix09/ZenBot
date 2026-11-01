import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';

const COOLDOWN_SECONDS = 1200;

const CRIMES = [
  { t: "Robo al Banco Central", g: 4000, p: 0.15, h: "Entraste con un equipo de hackers informáticos y saliste por la puerta grande." },
  { t: "Hackeo de Cajero Automático", g: 1800, p: 0.35, h: "Instalaste un malware y el cajero comenzó a expulsar billetes sin parar." },
  { t: "Robo a un niño", g: 120, p: 0.95, h: "Fue fácil, pero te sientes un poco mal... o no, el dulce estaba delicioso." },
  { t: "Estafa Piramidal", g: 5000, p: 0.10, h: "Les vendiste criptomonedas inexistentes. Eres un genio del mal." },
  { t: "Hurto en un Centro Comercial", g: 700, p: 0.65, h: "Le quitaste el sensor a una chamarra costosa y saliste silbando del lugar." },
  { t: "Robo de un Tesla", g: 2500, p: 0.25, h: "Hackeaste el modo autónomo y el automóvil llegó conduciéndose solo a tu casa." },
  { t: "Asalto a Joyería de Lujo", g: 3500, p: 0.20, h: "Rompiste el cristal de seguridad, tomaste los diamantes y escapaste velozmente en una motocicleta." },
  { t: "Hurto de iPhone de Exhibición", g: 900, p: 0.55, h: "Cortaste el cable de seguridad de la mesa de exhibición con una pinza y desapareciste." },
  { t: "Combustible sin pagar", g: 400, p: 0.80, h: "Llenaste el tanque de gasolina y aceleraste antes de que el despachador pudiera reaccionar." },
  { t: "Robo de Bicicleta de Repartidor", g: 300, p: 0.85, h: "El pobre repartidor subió a entregar un pedido al quinto piso y se quedó sin su medio de transporte." },
  { t: "Saqueo de Yate abandonado", g: 3200, p: 0.20, h: "Lo remolcaste sigilosamente hasta un puerto clandestino para desmantearlo." },
  { t: "Filtración de Datos Militares", g: 4500, p: 0.12, h: "Interceptaste una señal satelital encriptada y vendiste los secretos al mejor postor." },
  { t: "Robo en Museo de Arte", g: 3800, p: 0.18, h: "Cambiaste una pintura original de Picasso por un dibujo escolar de tu primo." },
  { t: "Robo de Cartera de marca", g: 600, p: 0.70, h: "Un tirón rápido en el vagón del metro y te hiciste con un bolso costoso de diseñador." },
  { t: "Hurto de Reloj de Turista", g: 1100, p: 0.45, h: "Le preguntaste la hora amablemente y le quitaste el reloj de la muñeca sin que lo notara." },
  { t: "Robo de Fórmula Secreta", g: 2200, p: 0.30, h: "Robaste la receta de una famosa bebida gaseosa, pero resultó ser solo agua con azúcar." },
  { t: "Alteración de Votos Falsos", g: 1400, p: 0.40, h: "Alteraste los resultados digitales de un concurso de belleza para mascotas de alta sociedad." },
  { t: "Acceso sin pagar al Cine", g: 150, p: 0.90, h: "Pasaste desapercibido por la puerta de salida de la sala y viste la película gratis." },
  { t: "Secuestro de Perro con Pedigrí", g: 2000, p: 0.30, h: "Lo devolviste a sus dueños tres horas después para cobrar la generosa recompensa." },
  { t: "Robo de Guitarra de Rock", g: 2600, p: 0.25, h: "Era la guitarra autografiada de una leyenda musical histórica, o al menos eso decía el anuncio de venta." },
  { t: "Hurto de Uvas en el Supermercado", g: 50, p: 0.98, h: "Te comiste medio kilo de uvas finas antes de llegar a la fila de pago." },
  { t: "Robo de Correo del Vecino", g: 200, p: 0.80, h: "Había una tarjeta de regalo digital de una plataforma de compras. Le diste las gracias mentalmente." },
  { t: "Robo de Llantas de Patrulla", g: 500, p: 0.60, h: "Dejaste al vehículo policial apoyado sobre bloques de concreto en la vía pública." },
  { t: "Fraude Fiscal Avanzado", g: 3100, p: 0.22, h: "Declaraste formalmente ante la entidad tributaria que tu botín es una organización sin fines de lucro." },
  { t: "Hurto de Queso Importado", g: 250, p: 0.85, h: "Lograste ocultar un trozo de queso gourmet de dos kilogramos bajo tu abrigo." },
  { t: "Robo de Pollo Rostizado", g: 180, p: 0.88, h: "Te fuiste del establecimiento de comida con el almuerzo caliente en la mano." },
  { t: "Hurto de Lentes de Sol", g: 550, p: 0.75, h: "Te los probaste frente al espejo del probador, sonreíste y saliste caminando tranquilamente." },
  { t: "Robo de Consola PlayStation 5", g: 1300, p: 0.40, h: "Te hiciste pasar por personal de paquetería express y te llevaste un cargamento de almacén." },
  { t: "Hurto de Paquete de Amazon", g: 450, p: 0.78, h: "Estaba en la entrada de la casa de alguien. Contenía herramientas electrónicas muy valiosas." },
  { t: "Robo de Regalos Navideños", g: 800, p: 0.65, h: "Te llevaste las cajas de regalo de debajo del árbol antes de la medianoche." },
  { t: "Evasión de Cuenta en Cena de Gala", g: 1200, p: 0.40, h: "Comiste platillos exóticos y te escapaste ágilmente por la ventana del baño de damas." },
  { t: "Robo de Escoba de Barrendero", g: 80, p: 0.92, h: "No tiene un valor real de reventa muy alto, pero la vendiste a un vecino perezoso." },
  { t: "Estafa de Oso de Felpa Gigante", g: 350, p: 0.80, h: "Lo ganaste en un puesto de feria usando dardo modificados magnéticamente." },
  { t: "Saqueo de Farmacia de Guardia", g: 1600, p: 0.35, h: "Robaste suministros de primeros auxilios y los vendiste en el mercado clandestino." },
  { t: "Reventa de Entradas Falsificadas", g: 2100, p: 0.28, h: "Diseñaste boletos falsificados para el concierto más cotizado del año y los vendiste afuera del estadio." },
  { t: "Hurto de Ropa de Tendedero", g: 150, p: 0.90, h: "Te llevaste tres prendas de vestir finas de seda que se secaban en el jardín trasero." },
  { t: "Robo de Canoa del Lago", g: 750, p: 0.60, h: "La desataste del muelle municipal y te la llevaste remando silenciosamente a otro pueblo." },
  { t: "Robo de Autoestéreo Antiguo", g: 300, p: 0.82, h: "Forzaste la puerta del coche clásico con un gancho de alambre. Un método tradicional de asalto." },
  { t: "Hurto de Perfumes en Duty Free", g: 1400, p: 0.38, h: "Te llenaste los bolsillos interiores de fragancias importadas de diseñadores de renombre." },
  { t: "Apropiación de Pizza ajena", g: 120, p: 0.95, h: "El repartidor de comida se equivocó de dirección, te entregó la orden y decidiste no aclarar el error." },
  { t: "Robo de Patineta de Skater", g: 400, p: 0.75, h: "El joven cayó intentando un truco arriesgado y decidiste irte a toda prisa con su costosa tabla." },
  { t: "Hurto de Caja de Herramientas profesional", g: 650, p: 0.68, h: "Sustraída sigilosamente del taller abierto de un mecánico automotriz retirado." },
  { t: "Robo de Linterna Táctica militar", g: 200, p: 0.85, h: "La sacaste sigilosamente de una mochila desatendida en el campamento del parque nacional." },
  { t: "Robo de Cometa de un Niño", g: 50, p: 0.98, h: "Se le soltó el hilo conductor del viento, tú la atrapaste en el aire y decidiste conservarla." },
  { t: "Hurto de Abrigo de Piel", g: 2800, p: 0.20, h: "Pertenecía a una mujer de la alta sociedad que se distrajo leyendo el menú en un restaurante fino." },
  { t: "Apropiación de Libros Universitarios", g: 950, p: 0.50, h: "Los estudiantes pagan sumas muy elevadas por estas ediciones agotadas hoy en día." },
  { t: "Hurto de Micrófono de Karaoke profesional", g: 450, p: 0.72, h: "Te lo llevaste guardado en la chaqueta después de interpretar tu canción preferida de la noche." },
  { t: "Robo de Botella de Whisky de colección", g: 1100, p: 0.42, h: "Una reserva de licor añejado de 18 años que sustrajiste del bar de un hotel de cinco estrellas." },
  { t: "Hurto de Monopatín Eléctrico", g: 850, p: 0.58, h: "No tenía bloqueador de seguridad colocado en la rueda delantera. Ahora es tu medio de transporte diario." },
  { t: "Asalto a Reliquia del Templo antiguo", g: 5000, p: 0.08, h: "Sustrajiste una estatuilla religiosa de jade pura de la vitrina central. Los monjes te han maldecido." }
];

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export default new ZenCommand('crimen')
  .addAlias('crime')
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

    const lastUsed = user.cooldowns.crimen;
    const cooldownAmount = COOLDOWN_SECONDS * 1000;

    if (lastUsed) {
      const expirationTime = lastUsed + cooldownAmount;
      if (now < expirationTime) {
        const timeLeftSec = (expirationTime - now) / 1000;
        const m = Math.floor(timeLeftSec / 60);
        const s = Math.floor(timeLeftSec % 60);
        const timeStr = m > 0 ? `${m}m ${s}s` : `${s}s`;
        await ctx.react('⏳');
        return ctx.reply(`『 ⏳ 』 *ENFRIAMIENTO*\n\n> Esperá *${timeStr}* para planear otro delito 😅`);
      }
    }

    if (!user.inventory) user.inventory = {};
    if (!user.dailyStats) user.dailyStats = {};

    let successChance = 0.45;
    let usedBuff = false;

    if (user.inventory.mask && !user.dailyStats.maskUsed) {
      successChance = 0.75;
      user.dailyStats.maskUsed = true;
      if (typeof user.markModified === 'function') {
        user.markModified('dailyStats');
      }
      usedBuff = true;
    }

    const plan = pickRandom(CRIMES);
    user.cooldowns.crimen = now;
    if (typeof user.markModified === 'function') {
      user.markModified('cooldowns');
    }

    if (Math.random() < successChance) {
      await ctx.react('💰');
      const botin = plan.g + (user.level * 40);
      user.zencoins = (user.zencoins || 0) + botin;

      await user.save();

      let lines = [
        `『 🔥 』 *EXPEDIENTE CRIMINAL*`,
        ``,
        `✦ *Operación:* ${plan.t}`,
        `✦ *Crónica:* _${plan.h}_`,
        ``,
        `✦ *Botín:* ${plan.g} ${ZenConfig.currencies.zencoins.emoji}`,
        `✦ *Bono de nivel (+${user.level}):* +${user.level * 40} ${ZenConfig.currencies.zencoins.emoji}`
      ];

      if (usedBuff) {
        lines.push(`✦ *Bono de infiltración:* +30% éxito 👺`);
      }

      lines.push(
        ``,
        `✦ *Total:* ${botin} ${ZenConfig.currencies.zencoins.emoji}`
      );

      return ctx.reply(lines.join('\n'));
    } else {
      await ctx.react('👮');
      const multa = Math.floor(plan.g / 2);
      const loss = Math.min(user.zencoins, multa);
      user.zencoins = Math.max(0, user.zencoins - loss);

      await user.save();

      return ctx.reply(
        `『 👮 』 *EXPEDIENTE CRIMINAL*\n\n` +
        `✦ *Operación:* ${plan.t}\n✦ *Estado:* Arrestado en el acto\n\n` +
        `✦ *Sanción:* -${loss} ${ZenConfig.currencies.zencoins.emoji}\n\n` +
        `> _La policía confiscó tus fondos como compensación fiscal 😉_`
      );
    }
  });