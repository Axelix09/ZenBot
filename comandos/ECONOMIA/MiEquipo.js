import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { WEAPONS } from '../../lib/game/weapons.js';
import { PICKAXES } from '../../lib/game/pickaxes.js';
import { resolveTargetJid, findRegisteredUser, extractRawTarget } from '../../lib/core/targetResolver.js';
import { ZenConfig } from '../../zen.config.js';
import { EQUIPMENT_BAG_IMAGE } from '../../lib/game/assetUrls.js';

const WEAPON_LORES = {
  lanza_rustica: [
    'Literalmente una rama afilada amarrada con cinta adhesiva que encontraste detras de un contenedor. Tiene una nota pegada que dice: Propiedad de un cavernicola flojo, no tocar.',
    'Tallada apresuradamente durante un tutorial de supervivencia que decidiste saltarte a la mitad. El mango todavia huele a desesperacion y resina de pino.',
    'Parece el resultado de un proyecto escolar de historia de primaria que fue calificado con la nota minima.'
  ],
  arco_recursivo: [
    'Fue disenado por un elfo obsesivo-compulsivo que calculo cada milimetro de tension usando fisica de particulas. La cuerda esta tan tensa que si la rozas, suena la melodia de tu juego favorito.',
    'Lo obtuviste tras derrotar a un arquero presumido que aseguraba tener punteria perfecta. Le añadiste miras telescopicas de plastico baratas que pegaste con pegamento escolar.',
    'La madera fue curvada usando vapor de agua hirviendo de un radiador viejo. No tiene precision cientifica, pero funciona si cierras un ojo al disparar.'
  ],
  ballesta_pesada: [
    'Forjada en la cocina de un alquimista que intento usar su horno de microondas como fundidora de acero. El gatillo rechina de una forma que recuerda vagamente al grito de un ganso furioso.',
    'Construida con partes recicladas de una montaña rusa abandonada. Tiene un cartel apenas legible en el lateral que advierte: No apuntar a los ojos, ni a los globos, ni al sentido comun.',
    'Es tan pesada que llevarla equipada cuenta como una sesion intensiva de gimnasio. Dispara virotes de acero capaces de atravesar una enciclopedia de tapa dura.'
  ],
  rifle_cerrojo: [
    'Fue contrabandeado en una caja de lechugas por un pinguino espia de Madagascar.',
    'Creado por un cientifico ermitano que intentaba inventar una maquina para destapar canerias con precision milimetrica.',
    'Tiene grabado un numero de telefono que si llamas, te atiende una operadora preguntando si quieres agrandar tu combo por 2 monedas.'
  ]
};

const PICKAXE_LORES = {
  pico_madera: [
    'El clasico instrumento inicial que todo aventurero rompe en los primeros tres minutos de juego. Fue fabricado con la madera de una mesa vieja que tu tia abuela usaba para apoyar plantas.',
    'Literalmente un palo cruzado con otro palo. No se le puede pedir mucho a una herramienta que parece sacada de un video de manualidades de internet.',
    'Se desgasta tan rapido que a veces da la sensacion de que estas intentando picar piedra usando una cuchara de ensalada.'
  ],
  pico_piedra: [
    'Una mejora sustancial con respecto a la madera, aunque sigue luciendo como un trozo de escombro amarrado con cordones de zapato gastados. Pertenecio a un minero que se rindio al encontrar su primer bloque de carbon.',
    'La piedra de la punta proviene de un monumento historico que alguien destruyo por accidente mientras intentaba atrapar un insecto virtual en su telefono.',
    'Tan tosco y pesado que si fallas el golpe contra la roca, el rebote te hara dudar de todas las decisiones que te llevaron a la mineria.'
  ],
  pico_hierro: [
    'Forjado con el metal de una señal de transito que se cayo misteriosamente durante una tormenta. Es lo suficientemente firme como para no doblarse, pero hace un ruido metalico ensordecedor.',
    'Lleva un grabado en la empuñadura que advierte de forma sombria: No utilizar para rascarse la espalda mientras este en funcionamiento.',
    'El estandar de la mineria confiable. Huele a oxido, grasa de maquina y a las interminables horas que pasaras buscando algo mas valioso que el carbon.'
  ],
  pico_oro: [
    'Espectacular a la vista, sumamente inutil para la mineria pesada debido a la maleabilidad del oro. Es la herramienta preferida de los mineros presumidos que quieren lucir ricos antes de doblar la punta contra la caliza.',
    'Brilla tanto bajo la luz de las antorchas que los murcielagos de la cueva se ponen gafas de sol cuando te aproximas a picar.',
    'Es tan blando que si golpeas un bloque de hierro, lo mas probable es que termines con un hermoso y costoso adorno de pared aplastado.'
  ],
  pico_diamante: [
    'La cuspide de la ingenieria de excavacion. El diamante de la punta fue tallado bajo la intensa presion de entregar un proyecto de programacion de tres meses en tan solo tres horas de cafe y panico.',
    'Un pico tan resistente y legendario que los fisicos teoricos prefieren ignorar su existencia para no tener que rediseñar las leyes de la termodinámica desde cero.',
    'Su punta fue pulida con las lagrimas de un acaparador de tarjetas graficas frustrado. Rompe la roca como si fuera mantequilla tibia.'
  ]
};

const BENEFITS = {
  rifle_cerrojo: `✦ *Tiro Perfecto:* 15% de duplicar ${ZenConfig.currencies.zencoins.name} y ${ZenConfig.currencies.lux.name} en caza.`,
  pico_diamante: `✦ *Fortuna:* 15% de duplicar ${ZenConfig.currencies.zencoins.name} y ${ZenConfig.currencies.lux.name} en minería.`
};

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export default new ZenCommand('miequipo')
  .addAlias('miarma', 'mipico', 'equipo', 'myweapon', 'mypickaxe')
  .setCooldown(5)
  .setCategory('Perfil')
  .requireRegistration()
  .setUsage('@usuario (opcional)')
  .onExecute(async (ctx) => {
    await ctx.react('🎒');

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

    const rawTarget = extractRawTarget(ctx);
    const targetJid = rawTarget ? await resolveTargetJid(ctx, rawTarget) : (user.id || ctx.sender);
    const targetUser = rawTarget
      ? await findRegisteredUser(ctx, targetJid)
      : (user.registered ? user : null);

    const pushName = targetUser?.name || targetJid.split('@')[0];

    if (!targetUser || !targetUser.registered) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *USUARIO NO REGISTRADO*\n\n> *${pushName}* todavía no se registró 🥲`);
    }

    const weapon = WEAPONS[targetUser.currentWeapon] || WEAPONS.lanza_rustica;
    const weaponMaxD = weapon.maxDurability || 100;
    const weaponCurrentD = targetUser.weaponDurability ?? weaponMaxD;
    const weaponAttack = weapon.baseAttack + (targetUser.weaponLevel * 5);
    const weaponSpeed = weapon.baseSpeed + (targetUser.weaponLevel * 3);
    const weaponBenefit = BENEFITS[weapon.id] ? `\n${BENEFITS[weapon.id]}` : '';

    const pickaxe = PICKAXES[targetUser.currentPickaxe] || PICKAXES.pico_madera;
    const pickaxeMaxD = pickaxe.maxDurability || 100;
    const pickaxeCurrentD = targetUser.pickaxeDurability ?? pickaxeMaxD;
    const pickaxeEfficiency = pickaxe.baseEfficiency + (targetUser.pickaxeLevel * 6);
    const pickaxeLuck = pickaxe.baseLuck + (targetUser.pickaxeLevel * 4);
    const pickaxeBenefit = BENEFITS[pickaxe.id] ? `\n${BENEFITS[pickaxe.id]}` : '';

    const weaponLore = pickRandom(WEAPON_LORES[weapon.id] || ['Origen desconocido.']);
    const pickaxeLore = pickRandom(PICKAXE_LORES[pickaxe.id] || ['Origen desconocido.']);

    const minWeaponUses = Math.floor(weaponCurrentD / 12);
    const maxWeaponUses = Math.floor(weaponCurrentD / 8);
    const avgWeaponUses = Math.floor(weaponCurrentD / 10);
    const weaponUsesText = weaponCurrentD <= 0 
      ? '0 (¡Roto!) ❌' 
      : `~${avgWeaponUses} (${minWeaponUses}-${maxWeaponUses} cazas)`;

    const minPickaxeUses = Math.floor(pickaxeCurrentD / 12);
    const maxPickaxeUses = Math.floor(pickaxeCurrentD / 8);
    const avgPickaxeUses = Math.floor(pickaxeCurrentD / 10);
    const pickaxeUsesText = pickaxeCurrentD <= 0 
      ? '0 (¡Roto!) ❌' 
      : `~${avgPickaxeUses} (${minPickaxeUses}-${maxPickaxeUses} minadas)`;

    const inv = targetUser.inventory || {};
    const hasSuit = inv.suit ? 'Equipada 👔' : 'No poseída';
    const hasMask = inv.mask ? 'Equipada 👺' : 'No poseída';

    const lines = [
      `『 🎒 』 *EQUIPO DE ${pushName.toUpperCase()}*`,
      ``,
      `✦ *ARMA EQUIPADA*`,
      `  • ${weapon.name} [Nvl. ${targetUser.weaponLevel || 1}]`,
      `  • ${weaponAttack} ATK  |  ${weaponSpeed} SPD`,
      `  • ${weaponCurrentD}/${weaponMaxD} ⚙️  |  ${weaponUsesText}`,
      weaponBenefit,
      `  📖 _${weaponLore}_`,
      ``,
      `✦ *PICO EQUIPADO*`,
      `  • ${pickaxe.name} [Nvl. ${targetUser.pickaxeLevel || 1}]`,
      `  • ${pickaxeEfficiency} EFC  |  ${pickaxeLuck} LCK`,
      `  • ${pickaxeCurrentD}/${pickaxeMaxD} ⚙️  |  ${pickaxeUsesText}`,
      pickaxeBenefit,
      `  📖 _${pickaxeLore}_`,
      ``,
      `✦ *INVENTARIO*`,
      `  ⚔️ Espadas: ${inv.sword || 0}`,
      `  🧪 Pociones: ${inv.potion || 0}`,
      `  👔 Capa de Magnate: ${hasSuit}`,
      `  👺 Máscara Hacker: ${hasMask}`
    ];

    const now = Date.now();
    const activeBuffs = [];

    if (targetUser.cooldowns?.buff_precision_until && targetUser.cooldowns.buff_precision_until > now) {
      const minLeft = Math.ceil((targetUser.cooldowns.buff_precision_until - now) / 60000);
      activeBuffs.push(`  ⚡ Astucia: +15% éxito (${minLeft}m)`);
    }

    if (targetUser.cooldowns?.buff_codicia_until && targetUser.cooldowns.buff_codicia_until > now) {
      const minLeft = Math.ceil((targetUser.cooldowns.buff_codicia_until - now) / 60000);
      activeBuffs.push(`  💰 Codicia: +15% botín (${minLeft}m)`);
    }

    if (targetUser.cooldowns?.buff_escudo_activo_until && targetUser.cooldowns.buff_escudo_activo_until > now) {
      const minLeft = Math.ceil((targetUser.cooldowns.buff_escudo_activo_until - now) / 60000);
      activeBuffs.push(`  🛡️ Refugio: Escudo automático (${minLeft}m)`);
    }

    if (activeBuffs.length > 0) {
      lines.push(
        ``,
        `✦ *EFECTOS ACTIVOS*`,
        ...activeBuffs
      );
    }

    const text = lines.join('\n');
    try {
      return await ctx.sock.sendMessage(ctx.chat, {
        image: { url: EQUIPMENT_BAG_IMAGE },
        caption: text,
        mentions: [targetJid]
      }, { quoted: ctx.rawMsg });
    } catch (error) {
      if (process.env.DEBUG) console.debug('[equipment bag] fallback:', error.message);
      return ctx.reply(text);
    }
  });
