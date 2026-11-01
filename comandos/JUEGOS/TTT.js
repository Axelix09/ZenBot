import { ZenCommand } from '../../lib/core/factory.js';
import { resolveTargetJid, findRegisteredUser } from '../../lib/core/targetResolver.js';
import { ZenConfig } from '../../zen.config.js';

const COOLDOWN_MS = 30000;
const MIN_BET = 100;
const MAX_BET = 10000;
const ACCEPT_TIMEOUT = 60000;

const AI_LEVELS = {
  facil: {
    name: '🤖 Fácil',
    mistakeChance: 0.35,
    lookAhead: 3,
    emoji: '😊',
    dialogues: {
      start: ['¡Comencemos! 😊', 'No me voy a rendir fácilmente.', 'Vamos a divertirnos.'],
      move: ['Buena jugada... creo. 😅', '¿Qué hago?', 'Tengo miedo. 🥺'],
      win: ['¡Gané! Espera... ¿cómo?', '¡Sorpresa!', 'Increíble.'],
      lose: ['¡No! ¿Cómo perdí?', 'Bien jugado humano.', 'La próxima será mía.'],
    }
  },
  medio: {
    name: '🤖 Medio',
    mistakeChance: 0.05,
    lookAhead: 9,
    emoji: '🧐',
    dialogues: {
      start: ['El juego comienza. 🧐', 'Prepara tus mejores movimientos.', 'Esto va a ser interesante.'],
      move: ['Interesante... 🤔', 'No esperaba eso.', 'Bien pensado.', 'Eres astuto.'],
      win: ['Victoria merecida.', 'Te superé.', 'Buena partida.'],
      lose: ['Reconozco tu superioridad.', 'Aprendí algo hoy.', 'Bien jugado.'],
    }
  },
  dificil: {
    name: '🤖 Difícil',
    mistakeChance: 0.0,
    lookAhead: 9,
    emoji: '😈',
    dialogues: {
      start: ['Ya he analizado tus patrones. 😈', '¿Listo para perder?', 'Esto va a ser rápido.'],
      move: ['¿Eso es todo?', 'Patético.', 'Error humano.', 'Predecible.'],
      win: ['Como siempre.', 'La IA nunca pierde.', '¿Quién es el mejor ahora?'],
      lose: ['No puede ser...', 'Imposible.', 'La IA falló.'],
    }
  },
  imposible: {
    name: '🤖 Imposible',
    mistakeChance: 0.0,
    lookAhead: 9,
    emoji: '👾',
    dialogues: {
      start: ['He calculado todas las variables. 👾', 'Tu derrota es inevitable.', 'Prepárate para lo peor.'],
      move: ['Calculado.', 'Inevitable.', 'Predecible.', 'Inútil.'],
      win: ['Inevitable.', 'La perfección existe.', 'He ganado antes de comenzar.'],
      lose: ['ERROR. ERROR. ERROR.', 'Reiniciando...', 'Esto no es posible.'],
    }
  }
};

const WIN_MESSAGES = [
  '🏆 ¡Victoria absoluta!',
  '✨ Eres imparable hoy.',
  '🎯 ¡Jugada magistral!',
  '👑 El rey del Tic-Tac-Toe.',
  '⚡ ¡Dominación completa!',
  '🎉 Has demostrado tu superioridad.'
];

const LOSE_MESSAGES = [
  '💀 Derrota aceptable.',
  '😅 La IA era demasiado fuerte.',
  '📉 Buen intento, pero no suficiente.',
  '😤 La suerte no estuvo de tu lado.',
  '🔄 La próxima será tuya.',
  '🤖 La IA te ha superado.'
];

const DRAW_MESSAGES = [
  '🤝 ¡Empate! Bien jugado.',
  '😌 Nadie gana, nadie pierde.',
  '⚖️ Un equilibrio perfecto.',
  '🔄 La lucha fue intensa.',
  '🤷 Podría haber sido peor.'
];

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

global.tttGames = global.tttGames || new Map();
global.tttPendingChallenges = global.tttPendingChallenges || new Map();
global.tttProcessedMessages = global.tttProcessedMessages || new Map();

function checkWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

function isBoardFull(board) {
  return board.every(cell => cell !== null);
}

function getEmptyCells(board) {
  return board.map((cell, index) => cell === null ? index : null).filter(i => i !== null);
}

function minimax(board, depth, isMaximizing, aiSymbol, playerSymbol) {
  const winner = checkWinner(board);
  if (winner === aiSymbol) return 10 - depth;
  if (winner === playerSymbol) return depth - 10;
  if (isBoardFull(board)) return 0;

  const emptyCells = getEmptyCells(board);
  const scores = [];

  for (const cell of emptyCells) {
    board[cell] = isMaximizing ? aiSymbol : playerSymbol;
    const score = minimax(board, depth + 1, !isMaximizing, aiSymbol, playerSymbol);
    board[cell] = null;
    scores.push({ score, cell });
  }

  if (isMaximizing) {
    const best = Math.max(...scores.map(s => s.score));
    const bestMoves = scores.filter(s => s.score === best);
    return pickRandom(bestMoves);
  } else {
    const best = Math.min(...scores.map(s => s.score));
    const bestMoves = scores.filter(s => s.score === best);
    return pickRandom(bestMoves);
  }
}

function getAIMove(board, aiSymbol, playerSymbol, level) {
  const emptyCells = getEmptyCells(board);
  if (emptyCells.length === 0) return null;

  if (Math.random() < level.mistakeChance && emptyCells.length > 1) {
    const randomCells = emptyCells.filter(i => {
      const testBoard = [...board];
      testBoard[i] = aiSymbol;
      const wouldWin = checkWinner(testBoard) === aiSymbol;
      const wouldBlock = emptyCells.some(j => {
        const blockBoard = [...board];
        blockBoard[j] = playerSymbol;
        return checkWinner(blockBoard) === playerSymbol;
      });
      return !wouldWin && !wouldBlock;
    });
    if (randomCells.length > 0) {
      return pickRandom(randomCells);
    }
  }

  const result = minimax([...board], 0, true, aiSymbol, playerSymbol);
  if (!result) return pickRandom(emptyCells);
  return result.cell;
}

function renderBoard(board, playerSymbol, aiSymbol) {
  const numbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
  const display = board.map((cell, index) => {
    if (cell === 'X') return '❌';
    if (cell === 'O') return '⭕';
    return numbers[index];
  });
  
  return '┌───┬───┬───┐\n' +
    '│ ' + display[0] + ' │ ' + display[1] + ' │ ' + display[2] + ' │\n' +
    '├───┼───┼───┤\n' +
    '│ ' + display[3] + ' │ ' + display[4] + ' │ ' + display[5] + ' │\n' +
    '├───┼───┼───┤\n' +
    '│ ' + display[6] + ' │ ' + display[7] + ' │ ' + display[8] + ' │\n' +
    '└───┴───┴───┘';
}

function buildGameMessage(game, dialogue, isPlayerTurn) {
  let msg = '『 🎮 』 *TIC-TAC-TOE VS IA*\n\n' +
    '✦ *IA:* ' + game.levelData.emoji + ' ' + game.levelData.name + '\n' +
    '✦ *Tú:* ' + game.player1Name + ' (' + game.playerSymbol + ')\n' +
    '✦ *IA:* ' + game.levelData.name + ' (' + game.aiSymbol + ')\n\n';
  
  if (dialogue) {
    msg += '📖 *' + dialogue + '*\n\n';
  }
  
  msg += renderBoard(game.board, game.playerSymbol, game.aiSymbol) + '\n\n';
  
  if (isPlayerTurn) {
    msg += '🎯 *Responde con el número de la casilla (1-9):*';
  }
  
  return msg;
}

export default new ZenCommand('ttt')
  .addAlias('tresenraya', 'tateti', 'gato')
  .setCooldown(0)
  .setCategory('Juegos')
  .requireRegistration()
  .setUsage('@usuario <apuesta>')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const [target, betRaw] = ctx.args;

    if (!target) {
      await ctx.react('🎮');
      return ctx.reply(
        '『 🎮 』 *TIC-TAC-TOE*\n\n' +
        '✦ *Modos:*\n' +
        `  • *vs IA:* ${ZenConfig.prefix}${ctx.commandName} ia [facil|medio|dificil|imposible]\n` +
        `  • *vs Usuario:* ${ZenConfig.prefix}${ctx.commandName} @usuario [apuesta]\n\n` +
        '✦ *IA disponible:*\n' +
        '  • 🤖 Fácil - Aprendiz\n' +
        '  • 🤖 Medio - Competente\n' +
        '  • 🤖 Difícil - Experta\n' +
        '  • 🤖 Imposible - Leyenda\n\n' +
        '✦ *Apuesta vs Usuario:* ' + MIN_BET + ' - ' + MAX_BET + ' ' + ZenConfig.currencies.zencoins.emoji + '\n' +
        '✦ *Tiempo de aceptación:* 1 minuto'
      );
    }

    if (target.toLowerCase() === 'ia') {
      return handleAI(ctx, user, betRaw);
    }

    return handlePVP(ctx, user, target, betRaw);
  });

async function handleAI(ctx, user, levelRaw) {
  if (!levelRaw) {
    await ctx.react('🎮');
    return ctx.reply(
      '『 🎮 』 *SELECCIONA DIFICULTAD*\n\n' +
      '✦ *Niveles disponibles:*\n' +
      '  • *facil* - Aprendiz 😊\n' +
      '  • *medio* - Competente 🧐\n' +
      '  • *dificil* - Experta 😈\n' +
      '  • *imposible* - Leyenda 👾\n\n' +
      `> _Uso: ${ZenConfig.prefix}${ctx.commandName} ia [facil|medio|dificil|imposible]_\n` +
      `> _Ejemplo: ${ZenConfig.prefix}${ctx.commandName} ia medio_`
    );
  }

  const levelKey = levelRaw?.toLowerCase() || 'medio';
  const level = AI_LEVELS[levelKey];
  
  if (!level) {
    await ctx.react('⚠️');
    return ctx.reply('『 ⚠️ 』 *NIVEL INVÁLIDO*\n\n> Eso no me cierra 😵‍💫\n> Opciones: facil, medio, dificil, imposible');
  }

  const gameId = 'ai_' + ctx.sender + '_' + Date.now();
  
  const esX = Math.random() < 0.5;
  const playerSymbol = esX ? 'X' : 'O';
  const aiSymbol = esX ? 'O' : 'X';
  const empiezaJugador = Math.random() < 0.5;
  
  const game = {
    id: gameId,
    type: 'ai',
    player1: ctx.sender,
    player1Name: user.name,
    player2: 'ai',
    player2Name: level.name,
    board: Array(9).fill(null),
    currentTurn: empiezaJugador ? 'player' : 'ai',
    playerSymbol: playerSymbol,
    aiSymbol: aiSymbol,
    level: levelKey,
    levelData: level,
    bet: 0,
    isAI: true,
    status: 'playing',
    startedAt: Date.now(),
    lastMove: null,
    dialogue: pickRandom(level.dialogues.start),
    chatId: ctx.chat,
    processing: false,
    isFirstAIMove: true,
    lastMsgKey: null,
    msgSent: false
  };

  global.tttGames.set(gameId, game);

  const isPlayerTurn = game.currentTurn === 'player';
  const msgText = buildGameMessage(game, game.dialogue, isPlayerTurn);
  
  const sentMsg = await ctx.reply(msgText);
  if (sentMsg?.key) {
    game.lastMsgKey = sentMsg.key;
    game.msgSent = true;
  }

  if (game.currentTurn === 'ai') {
    setTimeout(async () => {
      await hacerMovimientoIA(ctx, gameId);
    }, 800);
  }
}

async function hacerMovimientoIA(ctx, gameId) {
  const gameNow = global.tttGames.get(gameId);
  if (!gameNow || gameNow.status !== 'playing') return;
  if (gameNow.processing) return;
  
  gameNow.processing = true;

  const aiMove = getAIMove(gameNow.board, gameNow.aiSymbol, gameNow.playerSymbol, gameNow.levelData);
  
  if (aiMove === null) {
    gameNow.status = 'finished';
    gameNow.result = 'draw';
    gameNow.processing = false;
    const msgDraw = '『 🤝 』 *EMPATE*\n\n' +
      renderBoard(gameNow.board, gameNow.playerSymbol, gameNow.aiSymbol) + '\n\n' +
      '💬 ' + pickRandom(DRAW_MESSAGES);
    await ctx.reply(msgDraw);
    global.tttGames.delete(gameId);
    return;
  }

  const cellNumber = aiMove + 1;
  
  if (gameNow.isFirstAIMove && gameNow.lastMsgKey && gameNow.msgSent) {
    gameNow.isFirstAIMove = false;
    gameNow.board[aiMove] = gameNow.aiSymbol;
    gameNow.currentTurn = 'player';
    
    const dialogue = pickRandom(gameNow.levelData.dialogues.move);
    const newMsg = buildGameMessage(gameNow, dialogue, true);
    
    try {
      await ctx.sock.sendMessage(ctx.chat, {
        edit: gameNow.lastMsgKey,
        text: newMsg
      });
      gameNow.processing = false;
      return;
    } catch (e) {}
  }
  
  await ctx.reply('🤖 ' + cellNumber);
  gameNow.board[aiMove] = gameNow.aiSymbol;
  gameNow.lastMove = aiMove;

  const winnerAI = checkWinner(gameNow.board);
  if (winnerAI) {
    gameNow.status = 'finished';
    gameNow.result = 'lose';
    gameNow.winner = 'ai';
    gameNow.processing = false;
    
    const dialogue = pickRandom(gameNow.levelData.dialogues.win);
    const msgLose = '『 💀 』 *DERROTA*\n\n> Qué mala suerte 😢\n\n' +
      renderBoard(gameNow.board, gameNow.playerSymbol, gameNow.aiSymbol) + '\n\n' +
      '✦ *Ganador:* ' + gameNow.player2Name + '\n' +
      '✦ *Perdedor:* ' + gameNow.player1Name + '\n\n' +
      '📖 *' + dialogue + '*\n\n' +
      '💬 ' + pickRandom(LOSE_MESSAGES);

    await ctx.reply(msgLose);
    global.tttGames.delete(gameId);
    return;
  }

  if (isBoardFull(gameNow.board)) {
    gameNow.status = 'finished';
    gameNow.result = 'draw';
    gameNow.processing = false;
    const msgDraw = '『 🤝 』 *EMPATE*\n\n' +
      renderBoard(gameNow.board, gameNow.playerSymbol, gameNow.aiSymbol) + '\n\n' +
      '💬 ' + pickRandom(DRAW_MESSAGES);
    await ctx.reply(msgDraw);
    global.tttGames.delete(gameId);
    return;
  }

  gameNow.currentTurn = 'player';
  gameNow.processing = false;
  
  const dialogue = pickRandom(gameNow.levelData.dialogues.move);
  const msgText = buildGameMessage(gameNow, dialogue, true);
  
  await ctx.reply(msgText);
}

async function handlePVP(ctx, user, target, betRaw) {
  const targetJid = await resolveTargetJid(ctx, target);
  if (!targetJid || await ctx.isSameUser(targetJid, ctx.sender)) {
    await ctx.react('⚠️');
    return ctx.reply('『 ⚠️ 』 *USUARIO INVÁLIDO*\n\n> Uy, algo no cuadra 🤨\n\n> Tenés que mencionar a otro usuario válido 🧐');
  }

  const opponent = await findRegisteredUser(ctx, targetJid);
  if (!opponent || !opponent.registered) {
    await ctx.react('⚠️');
    return ctx.reply('『 ⚠️ 』 *USUARIO NO REGISTRADO*\n\n> El usuario no está registrado 🫤');
  }

  if (global.tttPendingChallenges.has(targetJid)) {
    await ctx.react('⏳');
    return ctx.reply('『 ⏳ 』 *DESAFÍO PENDIENTE*\n\n> ' + opponent.name + ' ya tiene un desafío pendiente.');
  }

  if (global.tttGames.has(targetJid) || global.tttGames.has(ctx.sender)) {
    await ctx.react('⏳');
    return ctx.reply('『 ⏳ 』 *PARTIDA ACTIVA*\n\n> Alguien ya está en una partida activa 😅');
  }

  let bet = 0;
  if (betRaw) {
    bet = parseInt(betRaw, 10);
    if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET) {
      await ctx.react('⚠️');
      return ctx.reply('『 ⚠️ 』 *APUESTA INVÁLIDA*\n\n> Eso no me cierra 😵‍💫\n\n> Tiene que ser entre ' + MIN_BET + ' y ' + MAX_BET + ' ' + ZenConfig.currencies.zencoins.emoji);
    }
  }

  if (bet > 0) {
    if (user.zencoins < bet) {
      await ctx.react('⚠️');
      return ctx.reply('『 ⚠️ 』 *SALDO INSUFICIENTE*\n\n> Ay, te falta un poco 🥺\n\n> Necesitás ' + bet + ' ' + ZenConfig.currencies.zencoins.emoji);
    }
    if (opponent.zencoins < bet) {
      await ctx.react('⚠️');
      return ctx.reply('『 ⚠️ 』 *OPONENTE SIN FONDOS*\n\n> Uy, no te alcanza 😅\n\n> ' + opponent.name + ' tiene ' + opponent.zencoins + ' ' + ZenConfig.currencies.zencoins.emoji);
    }
  }

  const challengeId = 'challenge_' + Date.now();
  const challenge = {
    id: challengeId,
    challenger: ctx.sender,
    challengerName: user.name,
    opponent: targetJid,
    opponentName: opponent.name,
    bet: bet,
    timestamp: Date.now(),
    timeout: Date.now() + ACCEPT_TIMEOUT,
    accepted: false
  };

  global.tttPendingChallenges.set(targetJid, challenge);

  const msg = '『 🎮 』 *DESAFÍO DE TIC-TAC-TOE*\n\n' +
    '✦ *Retador:* ' + user.name + '\n' +
    '✦ *Oponente:* ' + opponent.name + '\n' +
    '✦ *Apuesta:* ' + bet + ' ' + ZenConfig.currencies.zencoins.emoji + '\n\n' +
    '⏳ *Tienes 1 minuto para responder.*\n\n' +
    `✅ *Para aceptar:* ${ZenConfig.prefix}ttt_aceptar\n` +
    `❌ *Para rechazar:* ${ZenConfig.prefix}ttt_rechazar`;

  await ctx.reply(msg);

  await ctx.sock.sendMessage(targetJid, {
    text: '『 🎮 』 *' + user.name + ' te ha retado a Tic-Tac-Toe!*\n\n' +
      '✦ *Apuesta:* ' + bet + ' ' + ZenConfig.currencies.zencoins.emoji + '\n' +
      '⏳ *Tienes 1 minuto para aceptar.*\n\n' +
      `✅ *Para aceptar:* ${ZenConfig.prefix}ttt_aceptar\n` +
      `❌ *Para rechazar:* ${ZenConfig.prefix}ttt_rechazar`,
    mentions: [targetJid, ctx.sender]
  });

  setTimeout(async () => {
    const pending = global.tttPendingChallenges.get(targetJid);
    if (pending && !pending.accepted) {
      global.tttPendingChallenges.delete(targetJid);
      await ctx.reply('『 ⏳ 』 *DESAFÍO EXPIRADO*\n\n> Se pasó el tiempo 😴\n\n> ' + opponent.name + ' no respondió a tiempo.');
      await ctx.sock.sendMessage(targetJid, {
        text: '『 ⏳ 』 *DESAFÍO EXPIRADO*\n\n> Se pasó el tiempo 😴\n\n> No respondiste al desafío de ' + user.name + '.',
        mentions: [targetJid, ctx.sender]
      });
    }
  }, ACCEPT_TIMEOUT);

  const handler = async (message) => {
    if (!message.message) return;
    const body = message.message.conversation || message.message.extendedTextMessage?.text || '';
    if (!body) return;

    if (body === `${ZenConfig.prefix}ttt_aceptar` || body === `${ZenConfig.prefix}acceptttt`) {
      const pending = global.tttPendingChallenges.get(message.key.participant);
      if (!pending) return;
      if (pending.accepted) return;
      if (Date.now() > pending.timeout) {
        global.tttPendingChallenges.delete(message.key.participant);
        await ctx.reply('『 ⏳ 』 *DESAFÍO EXPIRADO*');
        return;
      }

      pending.accepted = true;
      global.tttPendingChallenges.delete(message.key.participant);

      const gameId = 'pvp_' + pending.challenger + '_' + pending.opponent + '_' + Date.now();
      const game = {
        id: gameId,
        type: 'pvp',
        player1: pending.challenger,
        player1Name: pending.challengerName,
        player2: pending.opponent,
        player2Name: pending.opponentName,
        board: Array(9).fill(null),
        currentTurn: pending.challenger,
        player1Symbol: 'X',
        player2Symbol: 'O',
        bet: pending.bet,
        status: 'playing',
        startedAt: Date.now(),
        lastMove: null
      };

      global.tttGames.set(gameId, game);

      const boardStr = renderBoard(game.board, game.player1Symbol, game.player2Symbol);
      const msgStart = '『 🎮 』 *TIC-TAC-TOE PVP*\n\n' +
        '✦ *' + game.player1Name + '* (' + game.player1Symbol + ') vs *' + game.player2Name + '* (' + game.player2Symbol + ')\n' +
        '✦ *Apuesta:* ' + game.bet + ' ' + ZenConfig.currencies.zencoins.emoji + '\n\n' +
        '🎯 *Turno de:* ' + (game.currentTurn === game.player1 ? game.player1Name : game.player2Name) + '\n\n' +
        boardStr + '\n\n' +
        '🎯 *Responde con el número de la casilla (1-9):*';

      await ctx.reply(msgStart);
      return;
    }

    if (body === `${ZenConfig.prefix}ttt_rechazar` || body === `${ZenConfig.prefix}rejectttt`) {
      const pending = global.tttPendingChallenges.get(message.key.participant);
      if (!pending) return;
      if (pending.accepted) return;

      global.tttPendingChallenges.delete(message.key.participant);
      await ctx.reply('『 ❌ 』 *DESAFÍO RECHAZADO*\n\n> Qué mala suerte 😢\n\n> ' + pending.opponentName + ' ha rechazado el desafío.');
      await ctx.sock.sendMessage(pending.challenger, {
        text: '『 ❌ 』 *DESAFÍO RECHAZADO*\n\n> Qué mala suerte 😢\n\n> ' + pending.opponentName + ' ha rechazado tu desafío.',
        mentions: [pending.challenger]
      });
      return;
    }

    const cell = parseInt(body.trim(), 10);
    if (isNaN(cell) || cell < 1 || cell > 9) return;

    const msgId = message.key.id;
    if (global.tttProcessedMessages.has(msgId)) return;
    global.tttProcessedMessages.set(msgId, Date.now());
    setTimeout(() => global.tttProcessedMessages.delete(msgId), 2000);

    let gameIdFound = null;
    let gameFound = null;
    for (const [id, g] of global.tttGames) {
      if ((g.player1 === ctx.sender || g.player2 === ctx.sender) && g.status === 'playing') {
        gameIdFound = id;
        gameFound = g;
        break;
      }
    }

    if (!gameFound) return;
    if (gameFound.type !== 'pvp') return;

    const sender = message.key.participant || message.key.remoteJid;
    if (sender !== gameFound.currentTurn) {
      await ctx.react('⏳');
      await ctx.reply('『 ⏳ 』 *NO ES TU TURNO*\n\n> Hmm, eso no aparece 🤔\n\n> Esperá a que ' + (gameFound.currentTurn === gameFound.player1 ? gameFound.player1Name : gameFound.player2Name) + ' juegue.');
      return;
    }

    const cellIndex = cell - 1;
    if (gameFound.board[cellIndex] !== null) {
      await ctx.react('⚠️');
      await ctx.reply('『 ⚠️ 』 *CASILLA OCUPADA*\n\n> Calma que recién hiciste eso 😅\n\n> La casilla *' + cell + '* ya está ocupada. Elige otra.');
      return;
    }

    const isPlayer1 = sender === gameFound.player1;
    const symbol = isPlayer1 ? gameFound.player1Symbol : gameFound.player2Symbol;
    gameFound.board[cellIndex] = symbol;
    gameFound.lastMove = cellIndex;

    const winner = checkWinner(gameFound.board);
    if (winner) {
      gameFound.status = 'finished';
      const winnerId = winner === gameFound.player1Symbol ? gameFound.player1 : gameFound.player2;
      const loserId = winner === gameFound.player1Symbol ? gameFound.player2 : gameFound.player1;
      gameFound.winner = winnerId;

      const winnerUser = await ctx.getUserById(winnerId);
      const loserUser = await ctx.getUserById(loserId);

      if (gameFound.bet > 0) {
        winnerUser.zencoins += gameFound.bet * 2;
        loserUser.zencoins -= gameFound.bet;
                await winnerUser.save();
        await loserUser.save();
      }

      const boardStrFinal = renderBoard(gameFound.board, gameFound.player1Symbol, gameFound.player2Symbol);
      const msgWin = '『 🎉 』 *¡VICTORIA!*\n\n> ¡Listo! 🤩\n\n' +
        boardStrFinal + '\n\n' +
        '✦ *Ganador:* ' + winnerUser.name + '\n' +
        '✦ *Perdedor:* ' + loserUser.name + '\n' +
        (gameFound.bet > 0 ? '✦ *Premio:* ' + (gameFound.bet * 2) + ' ' + ZenConfig.currencies.zencoins.emoji + '\n' : '') +
        '\n💬 ' + pickRandom(WIN_MESSAGES);

      await ctx.reply(msgWin);
      global.tttGames.delete(gameIdFound);
      return;
    }

    if (isBoardFull(gameFound.board)) {
      gameFound.status = 'finished';
      gameFound.result = 'draw';

      if (gameFound.bet > 0) {
        const p1 = await ctx.getUserById(gameFound.player1);
        const p2 = await ctx.getUserById(gameFound.player2);
        p1.zencoins += gameFound.bet;
        p2.zencoins += gameFound.bet;
        await p1.save();
        await p2.save();
      }

      const boardStrDraw = renderBoard(gameFound.board, gameFound.player1Symbol, gameFound.player2Symbol);
      const msgDraw = '『 🤝 』 *EMPATE*\n\n' +
        boardStrDraw + '\n\n' +
        (gameFound.bet > 0 ? '✦ *Reembolso:* ' + gameFound.bet + ' ' + ZenConfig.currencies.zencoins.emoji + ' para ambos\n\n' : '') +
        '💬 ' + pickRandom(DRAW_MESSAGES);

      await ctx.reply(msgDraw);
      global.tttGames.delete(gameIdFound);
      return;
    }

    gameFound.currentTurn = gameFound.currentTurn === gameFound.player1 ? gameFound.player2 : gameFound.player1;

    const boardStrNew = renderBoard(gameFound.board, gameFound.player1Symbol, gameFound.player2Symbol);
    const msgTurn = '『 🎮 』 *TIC-TAC-TOE PVP*\n\n' +
      '✦ *' + gameFound.player1Name + '* (' + gameFound.player1Symbol + ') vs *' + gameFound.player2Name + '* (' + gameFound.player2Symbol + ')\n' +
      '✦ *Apuesta:* ' + gameFound.bet + ' ' + ZenConfig.currencies.zencoins.emoji + '\n\n' +
      '🎯 *Turno de:* ' + (gameFound.currentTurn === gameFound.player1 ? gameFound.player1Name : gameFound.player2Name) + '\n\n' +
      boardStrNew + '\n\n' +
      '🎯 *Responde con el número de la casilla (1-9):*';

    await ctx.reply(msgTurn);
  };

  ctx.sock.ev.on('messages.upsert', handler);
}

export const acceptTtt = new ZenCommand('ttt_aceptar')
  .addAlias('acceptttt')
  .setCategory('Juegos')
  .setHidden(true)
  .requireRegistration()
  .onExecute(async (ctx) => {
    const pending = global.tttPendingChallenges.get(ctx.sender);
    if (!pending) {
      await ctx.react('⚠️');
      return ctx.reply('『 ⚠️ 』 *SIN DESAFÍO*\n\n> No tenés ningún desafío pendiente 🥲');
    }

    if (pending.accepted) {
      await ctx.react('⚠️');
      return ctx.reply('『 ⚠️ 』 *DESAFÍO YA ACEPTADO*\n\n> Este desafío ya fue aceptado 🤨');
    }

    if (Date.now() > pending.timeout) {
      global.tttPendingChallenges.delete(ctx.sender);
      await ctx.react('⏳');
      return ctx.reply('『 ⏳ 』 *DESAFÍO EXPIRADO*\n\n> El desafío expiró 😬');
    }

    pending.accepted = true;
    global.tttPendingChallenges.delete(ctx.sender);

    const gameId = 'pvp_' + pending.challenger + '_' + pending.opponent + '_' + Date.now();
    const game = {
      id: gameId,
      type: 'pvp',
      player1: pending.challenger,
      player1Name: pending.challengerName,
      player2: pending.opponent,
      player2Name: pending.opponentName,
      board: Array(9).fill(null),
      currentTurn: pending.challenger,
      player1Symbol: 'X',
      player2Symbol: 'O',
      bet: pending.bet,
      status: 'playing',
      startedAt: Date.now(),
      lastMove: null
    };

    global.tttGames.set(gameId, game);

    const boardStr = renderBoard(game.board, game.player1Symbol, game.player2Symbol);
    const msgStart = '『 🎮 』 *TIC-TAC-TOE PVP*\n\n' +
      '✦ *' + game.player1Name + '* (' + game.player1Symbol + ') vs *' + game.player2Name + '* (' + game.player2Symbol + ')\n' +
      '✦ *Apuesta:* ' + game.bet + ' ' + ZenConfig.currencies.zencoins.emoji + '\n\n' +
      '🎯 *Turno de:* ' + (game.currentTurn === game.player1 ? game.player1Name : game.player2Name) + '\n\n' +
      boardStr + '\n\n' +
      '🎯 *Responde con el número de la casilla (1-9):*';

    await ctx.reply(msgStart);
  });

export const rejectTtt = new ZenCommand('ttt_rechazar')
  .addAlias('rejectttt')
  .setCategory('Juegos')
  .setHidden(true)
  .requireRegistration()
  .onExecute(async (ctx) => {
    const pending = global.tttPendingChallenges.get(ctx.sender);
    if (!pending) {
      await ctx.react('⚠️');
      return ctx.reply('『 ⚠️ 』 *SIN DESAFÍO*\n\n> No tenés ningún desafío pendiente 🥲');
    }

    if (pending.accepted) {
      await ctx.react('⚠️');
      return ctx.reply('『 ⚠️ 』 *DESAFÍO YA ACEPTADO*\n\n> Este desafío ya fue aceptado 🤨');
    }

    global.tttPendingChallenges.delete(ctx.sender);
    await ctx.react('❌');

    await ctx.reply('『 ❌ 』 *DESAFÍO RECHAZADO*\n\n> Qué mala suerte 😢\n\n> Rechazaste el desafío de ' + pending.challengerName + '.');
    await ctx.sock.sendMessage(pending.challenger, {
      text: '『 ❌ 』 *DESAFÍO RECHAZADO*\n\n> Qué mala suerte 😢\n\n> ' + pending.opponentName + ' ha rechazado tu desafío.',
      mentions: [pending.challenger]
    });
  });

export const tttListener = {
  before: async (msg, sock, ctx) => {
    if (!msg.message) return;
    
    const sender = msg.key.participant || msg.key.remoteJid;
    const botJid = sock.user.id;
    if (sender === botJid) return;
    if (sender && botJid && sender.split('@')[0] === botJid.split('@')[0]) return;
    
    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    if (!body) return;

    if (body.startsWith('🤖') || body.startsWith('👤') || body.startsWith('⏳') || body.startsWith('⚠️')) return;

    const cell = parseInt(body.trim(), 10);
    if (isNaN(cell) || cell < 1 || cell > 9) return;

    const msgId = msg.key.id;
    if (global.tttProcessedMessages.has(msgId)) return;
    global.tttProcessedMessages.set(msgId, Date.now());
    setTimeout(() => global.tttProcessedMessages.delete(msgId), 2000);

    let gameId = null;
    let game = null;
    
    for (const [id, g] of global.tttGames) {
      if (g.player1 === ctx.sender && g.status === 'playing' && g.type === 'ai') {
        gameId = id;
        game = g;
        break;
      }
    }

    if (!game) return;

    if (game.currentTurn !== 'player') {
      await sock.sendMessage(ctx.chat, {
        text: '『 ⏳ 』 *ESPERA TU TURNO*\n\n> La IA está pensando 😅'
      });
      return;
    }

    if (game.processing) return;
    game.processing = true;

    const cellIndex = cell - 1;
    if (game.board[cellIndex] !== null) {
      game.processing = false;
      await sock.sendMessage(ctx.chat, {
        text: '『 ⚠️ 』 *CASILLA OCUPADA*\n\n> Calma que recién hiciste eso 😅\n\n> La casilla *' + cell + '* ya está ocupada. Elige otra.'
      });
      return;
    }

    game.board[cellIndex] = game.playerSymbol;
    game.lastMove = cellIndex;

    const winner = checkWinner(game.board);
    if (winner) {
      game.status = 'finished';
      game.result = 'win';
      game.winner = ctx.sender;
      game.processing = false;
      
      const dialogue = pickRandom(game.levelData.dialogues.lose);
      const msgWin = '『 🎉 』 *¡VICTORIA!*\n\n> ¡Listo! 🤩\n\n' +
        renderBoard(game.board, game.playerSymbol, game.aiSymbol) + '\n\n' +
        '✦ *Ganador:* ' + game.player1Name + '\n' +
        '✦ *Perdedor:* ' + game.player2Name + '\n\n' +
        '📖 *' + dialogue + '*\n\n' +
        '🏆 *' + pickRandom(WIN_MESSAGES);

      await sock.sendMessage(ctx.chat, { text: msgWin });
      global.tttGames.delete(gameId);
      return;
    }

    if (isBoardFull(game.board)) {
      game.status = 'finished';
      game.result = 'draw';
      game.processing = false;
      
      const msgDraw = '『 🤝 』 *EMPATE*\n\n' +
        renderBoard(game.board, game.playerSymbol, game.aiSymbol) + '\n\n' +
        '💬 ' + pickRandom(DRAW_MESSAGES);

      await sock.sendMessage(ctx.chat, { text: msgDraw });
      global.tttGames.delete(gameId);
      return;
    }

    game.currentTurn = 'ai';
    game.processing = false;

    setTimeout(async () => {
      const gameNow = global.tttGames.get(gameId);
      if (!gameNow || gameNow.status !== 'playing') return;
      if (gameNow.processing) return;
      
      gameNow.processing = true;

      const aiMove = getAIMove(gameNow.board, gameNow.aiSymbol, gameNow.playerSymbol, gameNow.levelData);
      if (aiMove === null) {
        gameNow.status = 'finished';
        gameNow.result = 'draw';
        gameNow.processing = false;
        const msgDraw = '『 🤝 』 *EMPATE*\n\n' +
          renderBoard(gameNow.board, gameNow.playerSymbol, gameNow.aiSymbol) + '\n\n' +
          '💬 ' + pickRandom(DRAW_MESSAGES);
        await sock.sendMessage(ctx.chat, { text: msgDraw });
        global.tttGames.delete(gameId);
        return;
      }

      const cellNumber = aiMove + 1;
      
      if (gameNow.isFirstAIMove && gameNow.lastMsgKey && gameNow.msgSent) {
        gameNow.isFirstAIMove = false;
        gameNow.board[aiMove] = gameNow.aiSymbol;
        gameNow.currentTurn = 'player';
        
        const dialogue = pickRandom(gameNow.levelData.dialogues.move);
        const newMsg = buildGameMessage(gameNow, dialogue, true);
        
        try {
          await sock.sendMessage(ctx.chat, {
            edit: gameNow.lastMsgKey,
            text: newMsg
          });
          gameNow.processing = false;
          return;
        } catch (e) {}
      }
      
      await sock.sendMessage(ctx.chat, { text: '🤖 ' + cellNumber });
      gameNow.board[aiMove] = gameNow.aiSymbol;
      gameNow.lastMove = aiMove;

      const winnerAI = checkWinner(gameNow.board);
      if (winnerAI) {
        gameNow.status = 'finished';
        gameNow.result = 'lose';
        gameNow.winner = 'ai';
        gameNow.processing = false;
        
        const dialogue = pickRandom(gameNow.levelData.dialogues.win);
        const msgLose = '『 💀 』 *DERROTA*\n\n> Qué mala suerte 😢\n\n' +
          renderBoard(gameNow.board, gameNow.playerSymbol, gameNow.aiSymbol) + '\n\n' +
          '✦ *Ganador:* ' + gameNow.player2Name + '\n' +
          '✦ *Perdedor:* ' + gameNow.player1Name + '\n\n' +
          '📖 *' + dialogue + '*\n\n' +
          '💬 ' + pickRandom(LOSE_MESSAGES);

        await sock.sendMessage(ctx.chat, { text: msgLose });
        global.tttGames.delete(gameId);
        return;
      }

      if (isBoardFull(gameNow.board)) {
        gameNow.status = 'finished';
        gameNow.result = 'draw';
        gameNow.processing = false;
        const msgDraw = '『 🤝 』 *EMPATE*\n\n' +
          renderBoard(gameNow.board, gameNow.playerSymbol, gameNow.aiSymbol) + '\n\n' +
          '💬 ' + pickRandom(DRAW_MESSAGES);
        await sock.sendMessage(ctx.chat, { text: msgDraw });
        global.tttGames.delete(gameId);
        return;
      }

      gameNow.currentTurn = 'player';
      gameNow.processing = false;
      
      const dialogue = pickRandom(gameNow.levelData.dialogues.move);
      const msgText = buildGameMessage(gameNow, dialogue, true);
      
      await sock.sendMessage(ctx.chat, { text: msgText });
    }, 800);
  }
};
