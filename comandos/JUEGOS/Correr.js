import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { 
  OBSTACULOS, 
  getRandomObstaculo, 
  getRandomVariante,
  CATEGORIAS 
} from '../../lib/database/games/obstaculos-data.js';
import { getItemById, ITEMS_CARRERA } from '../../lib/database/games/correr-items.js';
import { checkTitulosCarrera, getTituloById, TITULOS_CARRERA } from '../../lib/database/games/correr-titulos.js';

const MIN_BET = 100;
const MAX_BET = 10000;
const RONDAS_TOTALES = 3;
const COOLDOWN_MS = 30000;

const PATH_EMOJIS = {
  izquierda: '⬅️',
  centro: '⬆️',
  derecha: '➡️'
};

const PATH_NOMBRES = {
  izquierda: 'IZQUIERDA',
  centro: 'CENTRO',
  derecha: 'DERECHA'
};

const PATH_DESCRIPCIONES = {
  izquierda: [
    'Sendero oscuro y misterioso 🌑',
    'Camino entre árboles centenarios 🌲',
    'Ruta llena de sombras 🌘',
    'Sendero de tierra roja 🏜️',
    'Camino de hojas secas 🍂',
    'Vía cubierta de musgo 🌿',
    'Sendero de piedras brillantes 💎',
    'Camino de flores venenosas 🌺'
  ],
  centro: [
    'Camino recto y despejado 🛤️',
    'Vía principal bien iluminada 💡',
    'Sendero de piedra blanca 🪨',
    'Ruta directa al final 🎯',
    'Camino de adoquines antiguos 🏛️',
    'Vía de mármol pulido ✨',
    'Sendero de cristal transparente 💎',
    'Camino de luz solar ☀️'
  ],
  derecha: [
    'Puente colgante sobre el abismo 🌉',
    'Camino junto al acantilado 🏔️',
    'Sendero de arena movediza 🏖️',
    'Ruta entre rocas afiladas ⛰️',
    'Camino de cascadas 🌊',
    'Vía de hielo resbaladizo ❄️',
    'Sendero de niebla espesa 🌫️',
    'Camino de dunas cambiantes 🏜️'
  ]
};

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

global.carrerasActivas = global.carrerasActivas || new Map();

function getDificultadMultiplicador(dificultad) {
  const map = {
    'baja': 0.85,
    'media': 0.60,
    'alta': 0.40,
    'muy_alta': 0.25
  };
  return map[dificultad] || 0.50;
}

function calcularExito(obstaculo, usuario, ronda) {
  const base = getDificultadMultiplicador(obstaculo.dificultad);
  
  let bonus = 0;
  
  const stats = usuario.carreraStats || {};
  bonus += Math.min(stats.totalRuns || 0, 50) * 0.002;
  bonus += Math.min((stats.currentStreak || 0) * 0.03, 0.15);
  
  const inventario = usuario.inventory || {};
  if (inventario.item_botas && ronda === 1) {
    bonus += 0.20;
  }
  if (inventario.item_amuleto) {
    bonus += 0.15;
  }
  
  const probabilidad = Math.min(0.95, Math.max(0.10, base + bonus));
  return Math.random() < probabilidad;
}

function generarCaminoDescripcion(path) {
  const descs = PATH_DESCRIPCIONES[path] || ['Camino desconocido'];
  return pickRandom(descs);
}

function generarNarrativa(obstaculo, path, exito, ronda, esUltima) {
  const nombre = obstaculo.nombre || 'Obstáculo';
  const emoji = obstaculo.emoji || '❓';
  const desc = obstaculo.escena?.descripcion || obstaculo.descripcion || 'Un obstáculo se interpone en tu camino.';
  const pista = obstaculo.escena?.pista || 'No hay pistas claras.';
  
  const pathNombre = PATH_NOMBRES[path] || 'desconocido';
  const pathEmoji = PATH_EMOJIS[path] || '❓';
  
  const variante = getRandomVariante(exito ? 'exito' : 'fallo');
  
  const rondaLabel = esUltima ? '🔥 ÚLTIMA RONDA' : `🏃 Ronda ${ronda}`;
  
  if (exito) {
    const narrativas = [
      `『 ${pathEmoji} 』 *${rondaLabel} - Camino ${pathNombre}*\n\n> Te adentras y te encuentras con 🙂\n${emoji} *${nombre}*\n\n📖 "${desc}"\n\n💡 "${pista}"\n\n${variante}\n\n✅ *¡OBSTÁCULO SUPERADO!*`,
      `『 ${pathEmoji} 』 *${rondaLabel} - Camino ${pathNombre}*\n\n${desc}\n\n${variante}\n\n✨ *¡SIGUES EN LA CARRERA!*`
    ];
    return pickRandom(narrativas);
  } else {
    const narrativas = [
      `『 ${pathEmoji} 』 *${rondaLabel} - Camino ${pathNombre}*\n\n${desc}\n\n${variante}\n\n💀 *¡HAS PERDIDO!*`,
      `『 ${pathEmoji} 』 *${rondaLabel} - Camino ${pathNombre}*\n\nTe topas con ${emoji} *${nombre}*\n\n📖 "${desc}"\n\n${variante}\n\n💀 *LA CARRERA TERMINA AQUÍ*`
    ];
    return pickRandom(narrativas);
  }
}

function generarMenuCaminos(ronda, esUltima) {
  const paths = ['izquierda', 'centro', 'derecha'];
  
  const caminos = paths.map(p => {
    const emoji = PATH_EMOJIS[p];
    const nombre = PATH_NOMBRES[p];
    const desc = generarCaminoDescripcion(p);
    return `  ${emoji} *${nombre}*\n     ${desc}`;
  });
  
  const rondaLabel = esUltima ? '🔥 ¡ÚLTIMA RONDA!' : `🏃 Ronda ${ronda} de ${RONDAS_TOTALES}`;
  
  return `『 🏃 』 *${rondaLabel}*\n\n${caminos.join('\n\n')}\n\n📝 *Elige tu camino:*\n• ${ZenConfig.prefix}izquierda\n• ${ZenConfig.prefix}centro\n• ${ZenConfig.prefix}derecha\n\n⏳ *Tienes 20 segundos para decidir.*\n💡 *Cada camino tiene un obstáculo diferente.*`;
}

function generarObstaculosRonda() {
  const obstaculos = [];
  const idsUsados = new Set();
  
  for (let i = 0; i < 3; i++) {
    let intentos = 0;
    let obstaculo = null;
    
    while (intentos < 50) {
      const temp = getRandomObstaculo();
      const key = `${temp.categoria}-${temp.id}`;
      
      if (!idsUsados.has(key)) {
        idsUsados.add(key);
        obstaculo = temp;
        break;
      }
      intentos++;
    }
    
    if (!obstaculo) {
      obstaculo = getRandomObstaculo();
    }
    
    obstaculos.push(obstaculo);
  }
  
  return obstaculos;
}

export default new ZenCommand('correr')
  .addAlias('carrera', 'race', 'obstaculos')
  .setCooldown(0)
  .setCategory('Juegos')
  .requireRegistration()
  .setUsage('<apuesta>')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const [betRaw] = ctx.args;
    
    const now = Date.now();
    if (!user.cooldowns) user.cooldowns = {};
    const lastRun = user.cooldowns.correr || 0;
    if (now - lastRun < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - lastRun)) / 1000);
      await ctx.react('⏳');
      return ctx.reply(`『 ⏳ 』 *DESCANSANDO*\n\n> Esperá *${remaining}s* para correr de nuevo 😉`);
    }
    
    if (global.carrerasActivas.has(ctx.sender)) {
      await ctx.react('🏃');
      return ctx.reply(
        `『 🏃 』 *CARRERA ACTIVA*\n\n> Ya hay una carrera en marcha 😅\n\n` +
        `> *${ZenConfig.prefix}abandonar* ➜ Rendirte (pierdes la apuesta)\n` +
        `> *${ZenConfig.prefix}cashout* ➜ Retirarte y conservar lo ganado`
      );
    }
    
    if (!betRaw) {
      await ctx.react('🏃');
      return ctx.reply(
        `『 🏃 』 *CARRERA DE OBSTÁCULOS*\n\n` +
        `> Supera *${RONDAS_TOTALES}* rondas eligiendo el camino correcto 🙂\n\n` +
        `✦ *Apuesta:* ${MIN_BET} - ${MAX_BET} ${ZenConfig.currencies.zencoins.emoji}\n` +
        `✦ *Premio:* Apuesta × 2.5\n` +
        `✦ *Riesgo:* Pierdes tu apuesta\n\n` +
        `✦ *Opciones:*\n` +
        `  • ${ZenConfig.prefix}cashout ➜ Retirarte con lo ganado\n` +
        `  • ${ZenConfig.prefix}abandonar ➜ Rendirte (pierdes la apuesta)\n\n` +
        `✦ *Items:*\n` +
        `  🛡️ Escudo - Salva de 1 obstáculo (3,000 ZC)\n` +
        `  👟 Botas - +20% éxito 1ra ronda (2,000 ZC)\n` +
        `  🔮 Amuleto - +15% éxito toda la carrera (5,000 ZC)\n\n` +
        `> _Uso: ${ZenConfig.prefix}${ctx.commandName} [apuesta]_\n` +
        `> _Ejemplo: ${ZenConfig.prefix}${ctx.commandName} 1000_`
      );
    }
    
    const bet = parseInt(betRaw, 10);
    if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *APUESTA INVÁLIDA*\n\n> Tiene que ser entre *${MIN_BET}* y *${MAX_BET}* ${ZenConfig.currencies.zencoins.emoji} 😵‍💫`);
    }
    
    if (user.zencoins < bet) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SALDO INSUFICIENTE*\n\n> Solo tenés ${user.zencoins} ${ZenConfig.currencies.zencoins.emoji} 😬`);
    }
    
    if (!user.carreraStats) {
      user.carreraStats = {
        totalRuns: 0,
        totalWins: 0,
        totalLosses: 0,
        currentStreak: 0,
        bestStreak: 0,
        obstaclesSurvived: 0,
        obstaclesFailed: 0,
        favoritePath: null,
        path_izquierda: 0,
        path_centro: 0,
        path_derecha: 0,
        path_correctos: 0,
        path_incorrectos: 0,
        totalEarned: 0,
        totalLost: 0,
        lastRun: null
      };
    }
    
    const stats = user.carreraStats;
    const obstaculos = generarObstaculosRonda();
    
    const partida = {
      usuario: ctx.sender,
      apuesta: bet,
      rondaActual: 0,
      obstaculos: obstaculos,
      sobrevivio: true,
      rondasSuperadas: 0,
      caminoElegido: null,
      itemsUsados: {
        escudo: false,
        botas: false,
        amuleto: false
      },
      premioAcumulado: 0,
      timestamp: now,
      timeout: now + 20000,
      retirado: false,
      abandonado: false
    };
    
    global.carrerasActivas.set(ctx.sender, partida);
    user.cooldowns.correr = now;
    await user.save();
    
    await ctx.react('🏃');
    const menu = generarMenuCaminos(1, false);
    await ctx.reply(menu);
    
    setTimeout(async () => {
      const partidaActual = global.carrerasActivas.get(ctx.sender);
      if (partidaActual && partidaActual.rondaActual === 0) {
        global.carrerasActivas.delete(ctx.sender);
        await ctx.reply(`『 ⏳ 』 *TIEMPO AGOTADO*\n\n> No elegiste un camino a tiempo. La carrera fue cancelada 😴`);
      }
    }, 20000);
  });

function handlePathChoice(path) {
  return async function(ctx) {
    const user = await ctx.getUser();
    const partida = global.carrerasActivas.get(ctx.sender);
    
    if (!partida) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SIN CARRERA ACTIVA*\n\n> Usá *${ZenConfig.prefix}correr [apuesta]* para empezar 🤔`);
    }
    
    if (partida.retirado) {
      global.carrerasActivas.delete(ctx.sender);
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *YA RETIRADO*\n\n> Usá *${ZenConfig.prefix}correr* para empezar otra 😏`);
    }
    
    if (partida.abandonado) {
      global.carrerasActivas.delete(ctx.sender);
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *CARRERA ABANDONADA*\n\n> Usá *${ZenConfig.prefix}correr* para empezar otra 🙂`);
    }
    
    if (partida.rondaActual >= RONDAS_TOTALES) {
      global.carrerasActivas.delete(ctx.sender);
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *CARRERA COMPLETADA*\n\n> Usá *${ZenConfig.prefix}correr* para empezar otra 🤩`);
    }
    
    if (partida.caminoElegido) {
      await ctx.react('⏳');
      return ctx.reply(`『 ⏳ 』 *CAMINO ELEGIDO*\n\n> Esperá a que se procese 🙂`);
    }
    
    partida.caminoElegido = path;
    partida.rondaActual++;
    
    const ronda = partida.rondaActual;
    const esUltima = ronda === RONDAS_TOTALES;
    const obstaculo = partida.obstaculos[ronda - 1];
    
    const stats = user.carreraStats;
    
    const inv = user.inventory || {};
    const tieneEscudo = inv.item_escudo > 0;
    let exito = calcularExito(obstaculo, user, ronda);
    let mensajeEscudo = '';
    
    if (!exito && tieneEscudo && !partida.itemsUsados.escudo) {
      user.inventory.item_escudo = (user.inventory.item_escudo || 0) - 1;
      partida.itemsUsados.escudo = true;
      exito = true;
      mensajeEscudo = '\n\n🛡️ *¡ESCUDO ACTIVADO!* Te salvaste del obstáculo. El escudo se ha consumido.';
    }
    
    const narrativa = generarNarrativa(obstaculo, path, exito, ronda, esUltima);
    
    stats[`path_${path}`] = (stats[`path_${path}`] || 0) + 1;
    if (exito) {
      stats.path_correctos = (stats.path_correctos || 0) + 1;
      stats.obstaclesSurvived = (stats.obstaclesSurvived || 0) + 1;
      partida.rondasSuperadas++;
    } else {
      stats.path_incorrectos = (stats.path_incorrectos || 0) + 1;
      stats.obstaclesFailed = (stats.obstaclesFailed || 0) + 1;
      partida.sobrevivio = false;
    }
    
    const paths = ['izquierda', 'centro', 'derecha'];
    let maxCount = 0;
    let favorite = 'izquierda';
    for (const p of paths) {
      const count = stats[`path_${p}`] || 0;
      if (count > maxCount) {
        maxCount = count;
        favorite = p;
      }
    }
    stats.favoritePath = favorite;
    
    partida.caminoElegido = null;
    await user.save();
    
    if (!exito) {
      global.carrerasActivas.delete(ctx.sender);
      
      stats.totalRuns = (stats.totalRuns || 0) + 1;
      stats.totalLosses = (stats.totalLosses || 0) + 1;
      stats.currentStreak = 0;
      stats.totalLost = (stats.totalLost || 0) + partida.apuesta;
      stats.lastRun = Date.now();
      
      user.zencoins -= partida.apuesta;
      await user.save();
      
      await ctx.react('💀');
      return ctx.reply(
        `${narrativa}\n\n` +
        `💸 *Pérdida:* ${partida.apuesta} ${ZenConfig.currencies.zencoins.emoji}\n` +
        `📊 *Rondas superadas:* ${partida.rondasSuperadas}/${RONDAS_TOTALES}\n` +
        `🏆 *Racha:* ${stats.currentStreak} victorias\n\n` +
        `> _¿Intentarlo de nuevo? ${ZenConfig.prefix}correr [apuesta]_`
      );
    }
    
    if (partida.rondasSuperadas >= RONDAS_TOTALES) {
      let premio = Math.floor(partida.apuesta * 2.5);
      
      if (!partida.itemsUsados.escudo && !partida.itemsUsados.botas && !partida.itemsUsados.amuleto) {
        premio += Math.floor(premio * 0.10);
      }
      
      partida.premioAcumulado = premio;
      
      stats.totalRuns = (stats.totalRuns || 0) + 1;
      stats.totalWins = (stats.totalWins || 0) + 1;
      stats.currentStreak = (stats.currentStreak || 0) + 1;
      if (stats.currentStreak > stats.bestStreak) {
        stats.bestStreak = stats.currentStreak;
      }
      stats.totalEarned = (stats.totalEarned || 0) + premio;
      stats.lastRun = Date.now();
      
      user.zencoins += premio;
      
      const nuevosTitulos = checkTitulosCarrera(stats, user.titles || []);
      let mensajeTitulos = '';
      if (nuevosTitulos.length > 0) {
        const titulosList = nuevosTitulos.map(id => {
          const t = getTituloById(id);
          if (t) {
            if (!user.titles.includes(t.id)) {
              user.titles.push(t.id);
            }
            return t.nombre;
          }
          return '';
        }).filter(Boolean);
        
        if (titulosList.length > 0) {
          mensajeTitulos = `\n\n🏆 *¡NUEVOS TÍTULOS!*\n  ${titulosList.join('\n  ')}`;
        }
      }
      
      global.carrerasActivas.delete(ctx.sender);
      await user.save();
      
      await ctx.react('🎉');
      return ctx.reply(
        `『 🎉 』 *¡CARRERA COMPLETADA!*\n\n` +
        `> ${narrativa.split('\n')[0]} 😉\n\n` +
        `✦ *Apuesta:* ${partida.apuesta} ${ZenConfig.currencies.zencoins.emoji}\n` +
        `✦ *Premio:* ${premio} ${ZenConfig.currencies.zencoins.emoji}\n` +
        `✦ *Ganancia:* +${premio - partida.apuesta} ${ZenConfig.currencies.zencoins.emoji}\n` +
        `✦ *Racha:* ${stats.currentStreak} victorias\n` +
        `✦ *Mejor racha:* ${stats.bestStreak} victorias\n` +
        `✦ *Caminos correctos:* ${stats.path_correctos || 0}\n` +
        `✦ *Caminos incorrectos:* ${stats.path_incorrectos || 0}` +
        mensajeTitulos +
        `\n\n> _¿Otra carrera? ${ZenConfig.prefix}correr [apuesta]_`
      );
    }
    
    await ctx.reply(
      `${narrativa}${mensajeEscudo}\n\n` +
      `✦ *Ronda ${ronda}/${RONDAS_TOTALES} superada*\n` +
      `✦ *Apuesta:* ${partida.apuesta} ${ZenConfig.currencies.zencoins.emoji}\n` +
      `✦ *Racha:* ${stats.currentStreak || 0} victorias\n\n` +
      `✦ *Opciones:*\n` +
      `  • ${ZenConfig.prefix}cashout ➜ Retirarte con lo ganado\n` +
      `  • ${ZenConfig.prefix}abandonar ➜ Rendirte (pierdes la apuesta)`
    );
    
    const siguienteMenu = generarMenuCaminos(ronda + 1, ronda + 1 === RONDAS_TOTALES);
    await ctx.reply(siguienteMenu);
    
    setTimeout(async () => {
      const partidaActual = global.carrerasActivas.get(ctx.sender);
      if (partidaActual && partidaActual.rondaActual === ronda) {
        global.carrerasActivas.delete(ctx.sender);
        await ctx.reply(`『 ⏳ 』 *TIEMPO AGOTADO*\n\n> No elegiste un camino a tiempo. La carrera fue cancelada 😴`);
      }
    }, 20000);
  };
}

export const cmdIzquierda = new ZenCommand('izquierda')
  .addAlias('left', 'izq')
  .setCategory('Juegos')
  .setHidden(true)
  .requireRegistration()
  .onExecute(handlePathChoice('izquierda'));

export const cmdCentro = new ZenCommand('centro')
  .addAlias('center', 'cen')
  .setCategory('Juegos')
  .setHidden(true)
  .requireRegistration()
  .onExecute(handlePathChoice('centro'));

export const cmdDerecha = new ZenCommand('derecha')
  .addAlias('right', 'der')
  .setCategory('Juegos')
  .setHidden(true)
  .requireRegistration()
  .onExecute(handlePathChoice('derecha'));

export const cmdRetirarse = new ZenCommand('cashout')
  .addAlias('retirarse', 'withdraw', 'salir')
  .setCategory('Juegos')
  .setHidden(true)
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const partida = global.carrerasActivas.get(ctx.sender);
    
    if (!partida) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SIN CARRERA ACTIVA*\n\n> No tenés una carrera activa 🤔`);
    }
    
    if (partida.retirado) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *YA RETIRADO*\n\n> Ya te retiraste de esta carrera 😏`);
    }
    
    if (partida.rondasSuperadas === 0) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *SIN RONDAS SUPERTADAS*\n\n` +
        `> Si te retiras ahora, pierdes tu apuesta 🫤\n\n` +
        `> ¿Seguro? *${ZenConfig.prefix}abandonar* para rendirte.`
      );
    }
    
    const proporcion = partida.rondasSuperadas / RONDAS_TOTALES;
    let premio = Math.floor(partida.apuesta * (1 + proporcion * 0.5));
    
    if (!partida.itemsUsados.escudo && !partida.itemsUsados.botas && !partida.itemsUsados.amuleto) {
      premio += Math.floor(premio * 0.05);
    }
    
    const stats = user.carreraStats;
    stats.totalRuns = (stats.totalRuns || 0) + 1;
    stats.totalWins = (stats.totalWins || 0) + 1;
    stats.currentStreak = 0;
    stats.totalEarned = (stats.totalEarned || 0) + premio;
    stats.lastRun = Date.now();
    
    user.zencoins += premio;
    
    partida.retirado = true;
    partida.premioAcumulado = premio;
    
    await user.save();
    global.carrerasActivas.delete(ctx.sender);
    
    await ctx.react('💰');
    return ctx.reply(
      `『 💰 』 *TE HAS RETIRADO*\n\n` +
      `> Decidiste retirarte con lo ganado 😌\n\n` +
      `✦ *Apuesta inicial:* ${partida.apuesta} ${ZenConfig.currencies.zencoins.emoji}\n` +
      `✦ *Premio retirado:* ${premio} ${ZenConfig.currencies.zencoins.emoji}\n` +
      `✦ *Ganancia:* +${premio - partida.apuesta} ${ZenConfig.currencies.zencoins.emoji}\n` +
      `✦ *Rondas superadas:* ${partida.rondasSuperadas}/${RONDAS_TOTALES}\n\n` +
      `> _¿Otra carrera? ${ZenConfig.prefix}correr [apuesta]_`
    );
  });

export const cmdAbandonar = new ZenCommand('abandonar')
  .addAlias('rendirse', 'quit', 'abortar')
  .setCategory('Juegos')
  .setHidden(true)
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const partida = global.carrerasActivas.get(ctx.sender);
    
    if (!partida) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SIN CARRERA ACTIVA*\n\n> No tenés una carrera activa 🤔`);
    }
    
    if (partida.abandonado) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *YA ABANDONADA*\n\n> Ya abandonaste esta carrera 😅`);
    }
    
    const stats = user.carreraStats;
    stats.totalRuns = (stats.totalRuns || 0) + 1;
    stats.totalLosses = (stats.totalLosses || 0) + 1;
    stats.currentStreak = 0;
    stats.totalLost = (stats.totalLost || 0) + partida.apuesta;
    stats.lastRun = Date.now();
    
    user.zencoins -= partida.apuesta;
    
    partida.abandonado = true;
    await user.save();
    global.carrerasActivas.delete(ctx.sender);
    
    await ctx.react('❌');
    return ctx.reply(
      `『 ❌ 』 *HAS ABANDONADO*\n\n` +
      `> Decidiste rendirte 😉\n\n` +
      `💸 *Pérdida:* ${partida.apuesta} ${ZenConfig.currencies.zencoins.emoji}\n` +
      `📊 *Rondas superadas:* ${partida.rondasSuperadas}/${RONDAS_TOTALES}\n\n` +
      `> _¿Intentarlo de nuevo? ${ZenConfig.prefix}correr [apuesta]_`
    );
  });

export const cmdEstadisticasCarrera = new ZenCommand('estadisticascarrera')
  .addAlias('statsrace', 'carrerastats', 'misestadisticas', 'carreraestadisticas')
  .setCategory('Juegos')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const stats = user.carreraStats || {};
    
    const totalRuns = stats.totalRuns || 0;
    const totalWins = stats.totalWins || 0;
    const totalLosses = stats.totalLosses || 0;
    const currentStreak = stats.currentStreak || 0;
    const bestStreak = stats.bestStreak || 0;
    const winRate = totalRuns > 0 ? Math.round((totalWins / totalRuns) * 100) : 0;
    const totalEarned = stats.totalEarned || 0;
    const totalLost = stats.totalLost || 0;
    const netProfit = totalEarned - totalLost;
    const profitEmoji = netProfit >= 0 ? '📈' : '📉';
    
    const pathCorrectos = stats.path_correctos || 0;
    const pathIncorrectos = stats.path_incorrectos || 0;
    const totalPaths = pathCorrectos + pathIncorrectos;
    const pathRate = totalPaths > 0 ? Math.round((pathCorrectos / totalPaths) * 100) : 0;
    
    const favoritePath = stats.favoritePath || 'Ninguno';
    const pathEmoji = {
      'izquierda': '⬅️',
      'centro': '⬆️',
      'derecha': '➡️'
    }[favoritePath] || '❓';
    
    const pathCounts = {
      izquierda: stats.path_izquierda || 0,
      centro: stats.path_centro || 0,
      derecha: stats.path_derecha || 0
    };
    
    const maxPath = Math.max(...Object.values(pathCounts));
    const pathBar = (count, total) => {
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      const filled = Math.floor(pct / 5);
      return '█'.repeat(Math.min(filled, 20)) + '░'.repeat(Math.max(0, 20 - filled));
    };
    
    const titulosObtenidos = [];
    for (const t of TITULOS_CARRERA) {
      if (user.titles && user.titles.includes(t.id)) {
        titulosObtenidos.push(t.nombre);
      }
    }
    
    const titulosTexto = titulosObtenidos.length > 0 
      ? titulosObtenidos.join('\n  ')
      : 'Ninguno aún';
    
    await ctx.react('📊');
    return ctx.reply(
      `『 📊 』 *ESTADÍSTICAS DE CARRERA*\n\n` +
      `✦ *DATOS GENERALES*\n` +
      `  • Carreras: ${totalRuns}\n` +
      `  • Victorias: ${totalWins} 🏆\n` +
      `  • Derrotas: ${totalLosses} 💀\n` +
      `  • Tasa de victoria: ${winRate}%\n\n` +
      `✦ *RACHAS*\n` +
      `  • Actual: ${currentStreak} victorias\n` +
      `  • Mejor: ${bestStreak} victorias\n\n` +
      `✦ *ECONOMÍA*\n` +
      `  • Ganado: ${totalEarned} ${ZenConfig.currencies.zencoins.emoji}\n` +
      `  • Perdido: ${totalLost} ${ZenConfig.currencies.zencoins.emoji}\n` +
      `  • Balance: ${profitEmoji} ${netProfit} ${ZenConfig.currencies.zencoins.emoji}\n\n` +
      `✦ *CAMINOS*\n` +
      `  • Correctos: ${pathCorrectos} ✅\n` +
      `  • Incorrectos: ${pathIncorrectos} ❌\n` +
      `  • Precisión: ${pathRate}%\n` +
      `  • Favorito: ${pathEmoji} ${favoritePath}\n\n` +
      `✦ *DISTRIBUCIÓN*\n` +
      `  ⬅️ Izquierda: ${pathBar(pathCounts.izquierda, totalRuns)} ${pathCounts.izquierda}\n` +
      `  ⬆️ Centro:    ${pathBar(pathCounts.centro, totalRuns)} ${pathCounts.centro}\n` +
      `  ➡️ Derecha:   ${pathBar(pathCounts.derecha, totalRuns)} ${pathCounts.derecha}\n\n` +
      `✦ *TÍTULOS OBTENIDOS*\n  ${titulosTexto}`
    );
  });