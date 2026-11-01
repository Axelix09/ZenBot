import { ZenConfig } from '../../zen.config.js';
import { getRandomReplyQuoted } from './fakeQuoted.js';

const E = ZenConfig.emojis;

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const frame = (emoji, title, lines) => `『 ${emoji} 』 *${title}*\n\n${lines.filter((line) => typeof line === 'string').join('\n')}`;
const quote = (text) => `> ${text}`;
const hint = (text) => `> _${text}_`;
const bullet = (text) => `  • ${text}`;

const kogenName = () => ZenConfig.currencies.kogen.name;
const kogenEmoji = () => ZenConfig.currencies.kogen.emoji;

const kogenBox = (title, line) => `┌─「🩵 *${title}* 🩵」\n│ ⟡ ${line}\n└────────────`;

const kogen = {
  insufficient: (action = 'descargar', cost = 1) =>
    kogenBox(`${kogenName().toUpperCase()} INSUFICIENTE`, pick([
      `Uy, necesitás *${cost} ${kogenName()}* para ${action} 🥺`,
      `Te falta ${kogenName()}: necesitás *${cost}* para ${action} 😅`,
      `Ay no, sin *${cost} ${kogenName()}* no puedo ${action} 😬`,
      `Casi... pero necesitás *${cost} ${kogenName()}* para ${action} 🫣`
    ])),
  charged: (cost = 1) =>
    kogenBox('DESCARGA EXITOSA', pick([
      `Listo, usaste *${cost} ${kogenEmoji()}* 😎`,
      `Todo salió bien, gastaste *${cost} ${kogenEmoji()}* 😉`,
      `Misión cumplida, usaste *${cost} ${kogenEmoji()}* 🤩`,
      `Descarga lista, costó *${cost} ${kogenEmoji()}* 😄`
    ])),
  missing: (action, cost = 1) =>
    frame('⚠️', `${kogenName().toUpperCase()} INSUFICIENTE`, [
      quote(pick([
        `Necesitás *${cost} ${kogenName()}* para ${action} 🥺`,
        `Te falta ${kogenName()}: ${action} cuesta *${cost}* 😅`,
        `Sin *${cost} ${kogenName()}* no puedo ${action} 😬`
      ]))
    ]),
  spent: (cost = 1) =>
    frame('✦', `USASTE ${cost} ${kogenName()}`, [
      quote(pick(['Listo, ya está 😎', 'Todo en orden 😉', 'Hecho, a disfrutar 😄']))
    ]),
  used: () =>
    kogenBox(`${kogenName().toUpperCase()} USADO`, pick([
      `Usaste 1 ${kogenName()} ${kogenEmoji()} 😌`,
      `Listo, se fue 1 ${kogenName()} ${kogenEmoji()} 😉`,
      `1 ${kogenName()} ${kogenEmoji()} menos, pero valió la pena 😎`
    ]))
};

const permFrame = (text) => frame('❌', 'SIN PERMISOS', [quote(text)]);

const lines = {
  owner: (numero, action) =>
    pick([
      `Solo el dueño (+${numero}) puede ${action} 🙅‍♂️`,
      `Eso es solo del dueño (+${numero}): ${action} 😅`,
      `Uy no, para ${action} tiene que ser el dueño (+${numero}) 🫢`
    ]),
  mainOwner: (action) =>
    pick([
      `Solo el dueño principal puede ${action} 🙅‍♂️`,
      `Eso solo lo hace el dueño principal: ${action} 😬`
    ]),
  admin: (action) =>
    pick([
      `Solo un admin del grupo puede ${action} 😅`,
      `Eso es cosa de admins: ${action} 🙅‍♂️`,
      `Ey, para ${action} tenés que ser admin 😉`
    ]),
  botAdmin: (action) =>
    pick([
      `Necesito ser admin del grupo para ${action} 🥺`,
      `Dame admin y lo hago al toque, así no puedo ${action} 😔`,
      `Sin admin no puedo ${action} 😢`
    ]),
  nsfwOff: () => pick(['Acá está apagado 🙈', 'Este grupo lo tiene apagado 😳', 'Shhh, acá no se puede 🤫'])
};

const perm = {
  owner: (numero, action) => permFrame(lines.owner(numero, action)),
  mainOwner: (action) => permFrame(lines.mainOwner(action)),
  admin: (action) => permFrame(lines.admin(action)),
  botAdmin: (action) => permFrame(lines.botAdmin(action))
};

const nsfw = {
  off: () =>
    frame('⛔', 'NSFW DESHABILITADO', [
      quote(lines.nsfwOff()),
      quote(`Un admin lo prende con: ${ZenConfig.prefix}nsfw on`)
    ])
};

const reason = (user) => quote(`Razón: ${user.loans.blockedReason || 'Deuda impaga'}`);
const debt = (user) => quote(`Deuda: ${user.loans.totalDebt} ${ZenConfig.currencies.zencoins.emoji}`);

const permanentLines = (user) => [
  quote(pick(['Tu cuenta quedó bloqueada para siempre 😭', 'Esta cuenta ya no se puede recuperar 😞'])),
  reason(user),
  '',
  quote('*Ya no hay vuelta atrás* 😔'),
  quote('Si creés que es un error, hablá con soporte.')
];

const debtLines = (user) => [
  quote(pick(['Tu cuenta está frenada por una deuda pendiente 😬', 'Uy, tenés una deuda pendiente y se frenó tu cuenta 😅'])),
  reason(user),
  debt(user),
  '',
  quote('*Opciones:*'),
  bullet(`Pagar: *${ZenConfig.prefix}prestamo pagar [monto/all]*`),
  bullet(`Promesa: *${ZenConfig.prefix}promesa [días]* - Te reactiva los comandos`)
];

const blocked = {
  permanent: (user) =>
    frame('🚫', 'CUENTA BLOQUEADA PERMANENTEMENTE', [
      ...permanentLines(user),
      '',
      quote('*Comandos disponibles:*'),
      bullet(`${ZenConfig.prefix}balance - Ver saldo`)
    ]),
  permanentShort: (user) => frame('🚫', 'CUENTA BLOQUEADA PERMANENTEMENTE', permanentLines(user)),
  debt: (user) =>
    frame('🔒', 'CUENTA BLOQUEADA', [
      ...debtLines(user),
      '',
      quote('*Comandos disponibles:*'),
      bullet(`${ZenConfig.prefix}balance - Ver saldo`),
      bullet(`${ZenConfig.prefix}transferir - Para pagar la deuda`)
    ]),
  debtShort: (user) => frame('🔒', 'CUENTA BLOQUEADA', debtLines(user)),
  bank: (user) =>
    frame('🚫', 'CUENTA BLOQUEADA', [reason(user), quote('Regularizá tu situación para usar el banco 🥺')])
};

export const V = { pick, frame, quote, hint, kogen, perm, nsfw, blocked, lines };

const LEVEL_UP_MESSAGES = [
  (user, lv, role) => `${E.levelUp} @${user} llegó al nivel ${lv}.\n${role}\n✨ ¡Bien ahí, seguí así! 😎`,
  (user, lv, role) => `${E.levelUp} @${user} subió a nivel ${lv}.\n${role}\n🔥 ¡Vas con todo! 🤩`,
  (user, lv, role) => `${E.levelUp} Felicidades @${user}, nivel ${lv}.\n${role}\n⭐ Buen trabajo 🥳`,
  (user, lv, role) => `${E.levelUp} @${user} ahora es nivel ${lv}.\n${role}\n🚀 Seguí metiéndole 😄`,
  (user, lv, role) => `${E.levelUp} @${user} llegó a ${lv}.\n${role}\n💪 Se nota el esfuerzo 😌`,
  (user, lv, role) => `${E.levelUp} @${user} alcanzó el ${lv}.\n${role}\n👏 Bien merecido 🥹`,
  (user, lv, role) => `${E.levelUp} @${user} ya va por ${lv}.\n${role}\n⚡ No parás, ¿eh? 😏`,
  (user, lv, role) => `${E.levelUp} @${user} subió al ${lv}.\n${role}\n🌱 Y va por más 😉`,
  (user, lv, role) => `${E.levelUp} @${user} llegó a ${lv}.\n${role}\n🎯 Dale que podés más 😤`,
  (user, lv, role) => `${E.levelUp} @${user} ya está en ${lv}.\n${role}\n⚔️ Bien jugado 😎`,
  (user, lv, role) => `${E.levelUp} @${user} nivel ${lv}.\n${role}\n👑 Se viene la cima 🤩`,
  (user, lv, role) => `${E.levelUp} @${user} llegó al ${lv}.\n${role}\n🌟 Brillá, loco 😄`,
  (user, lv, role) => `${E.levelUp} @${user} subió a ${lv}.\n${role}\n⚜️ Un pasito más 😌`,
  (user, lv, role) => `${E.levelUp} @${user} ya tiene ${lv}.\n${role}\n✨ Buen nivel, seguí así 😊`
];

const COOLDOWN_MESSAGES = [
  (sec) => `${E.loading} Esperá un tanto 😅\nTe quedan ${sec}s para usar esto de nuevo.`,
  (sec) => `${E.loading} Tranqui 😌 esperá ${sec}s y probá de nuevo.`,
  (sec) => `${E.loading} Todavía no 😴 faltan ${sec}s.`,
  (sec) => `${E.loading} No tan rápido 😏 esperá ${sec}s.`,
  (sec) => `${E.loading} Dale tiempo 🥱 en ${sec}s podés usar de nuevo.`
];

const ERROR_MESSAGES = [
  (msg) => `${E.error} Algo falló 😵‍💫\n${msg || 'Probá de nuevo en un rato 🙏'}`,
  (msg) => `${E.error} Se complicó 😬\n${msg || 'Reintentá más tarde 🕐'}`,
  (msg) => `${E.error} Error 😢\n${msg || 'Si sigue pasando, avisame 🥺'}`,
  (msg) => `${E.error} Uy, algo pasó 😳\n${msg || 'Probá de nuevo, a veces funciona 🤞'}`
];

const STREAK_MESSAGES = [
  (streak, bonus) => `🔥 *Racha de ${streak} días* 😎\n✧ +${bonus} ${ZenConfig.currencies.zencoins.emoji}`,
  (streak, bonus) => `🔥 ${streak} días seguidos 🥳\n✧ Ganaste ${bonus} ${ZenConfig.currencies.zencoins.emoji}`,
  (streak, bonus) => `🔥 Ya llevás ${streak} días 🤩\n✧ +${bonus} ${ZenConfig.currencies.zencoins.emoji}`,
  (streak, bonus) => `🔥 ${streak} días sin falta 😏\n✧ Bonus: ${bonus} ${ZenConfig.currencies.zencoins.emoji}`
];

export const Dialogues = {
  cooldown: (sec) => pick(COOLDOWN_MESSAGES)(sec),

  error: (safeMessage) => pick(ERROR_MESSAGES)(safeMessage),

  levelUp: (user, lv, role) => {
    const num = (user || '').split('@')[0];
    const msg = pick(LEVEL_UP_MESSAGES);
    return msg(num, lv, role);
  },

  streak: (streak, bonus) => pick(STREAK_MESSAGES)(streak, bonus),

  onlyOwner: () => `${E.lock} ${V.lines.mainOwner('usar este comando')}`,

  onlyGroup: () => `${E.group} Este comando es solo para grupos 😅`,

  onlyPrivate: () => `${E.private} Este comando solo funciona en el chat privado 🤫`,

  onlyAdmin: () => `${E.admin} ${V.lines.admin('usar este comando')}`,

  needBotAdmin: () => `${E.botAdmin} ${V.lines.botAdmin('hacer esto')}`,

  nsfwDisabled: () => `${E.nsfw} ${V.lines.nsfwOff()}\nUn admin lo prende con: ${ZenConfig.prefix}nsfw on`,

  underageNsfw: () => `${E.nsfw} Acceso denegado 🙅‍♂️ Solo para mayores de 18 años.`,

  notRegistered: (cmd) =>
    `${E.register} Para usar *${ZenConfig.prefix}${cmd}* primero tenés que registrarte 😉\n` +
    `💡 Comando: *${ZenConfig.prefix}registro Nombre, Edad, H/M/O*`
};

export async function sendAlert(ctx, text, title = `${ZenConfig.botName} — AVISO`) {
  const clean = (text || '').trim();
  const formatted = `*『 ⚠️ 』 ${title}*\n\n> ${clean.replace(/\n/g, '\n> ')}`;

  const pushName = ctx.rawMsg?.pushName || 'Usuario';
  const fakeQuoted = getRandomReplyQuoted(ctx.sender, pushName);

  const contextInfo = {
    isForwarded: true,
    forwardingScore: 999,
    forwardedNewsletterMessageInfo: {
      newsletterJid: ZenConfig.newsletterJid,
      serverMessageId: 100,
      newsletterName: ZenConfig.newsletterName || '🥀 𝓩𝓮𝓷𝓑𝓸𝓽 • 𝒪𝒻𝒻𝒾𝒸𝒾𝒶𝓁 𝓒𝓱𝓪𝓷𝓷𝓮𝓵 ✦'
    }
  };

  try {
    return await ctx.sock.sendMessage(
      ctx.chat,
      {
        text: formatted,
        contextInfo
      },
      { quoted: fakeQuoted }
    );
  } catch (_) {
    return ctx.reply(formatted);
  }
}