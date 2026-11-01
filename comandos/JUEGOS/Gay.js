import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

const GAY_MESSAGES = [
  (name, percent) => `『 🌈 』 *MEDIDOR GAY*\n\n> *${name}* es ${percent}% gay 🏳️‍🌈\n\n> _No hay cura para esto. Aceptalo._`,
  (name, percent) => `『 🌈 』 *MEDIDOR GAY*\n\n> *${name}* tiene ${percent}% de homosexualidad confirmada 😄\n\n> _El armario es de cristal._`,
  (name, percent) => `『 🌈 』 *MEDIDOR GAY*\n\n> *${name}* es ${percent}% gay 😄\n\n> _La comunidad te acepta. 🌈_`,
  (name, percent) => `『 🌈 』 *MEDIDOR GAY*\n\n> *${name}* dio positivo con ${percent}% de gay 😄\n\n> _No hay vuelta atrás._`,
  (name, percent) => `『 🌈 』 *MEDIDOR GAY*\n\n> *${name}* es ${percent}% gay 😄\n\n> _🏳️‍🌈 Orgullo._`
];

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const GAY_API_URL = 'https://zone.api.br/canvas/gay';
const FALLBACK_AVATAR = 'https://i.ibb.co/nNkgRQjK/images-4.jpg';
const safeDisplayName = (value, fallback) => {
  const name = String(value || '').trim();
  return name && !/^\d{10,}$/.test(name) ? name : fallback;
};

export default new ZenCommand('gay')
  .addAlias('medirgay', 'gaytest', 'que tan gay')
  .setCooldown(5)
  .setCategory('Juegos')
  .requireRegistration()
  .setUsage('@usuario (opcional)')
  .onExecute(async (ctx) => {
    const explicitTarget = ctx.mentions?.find(Boolean) || ctx.quotedParticipant || null;
    const target = explicitTarget || ctx.sender;
    const isSelf = !explicitTarget || await ctx.isSameUser(target, ctx.sender);

    let targetName = 'Tú';
    let avatarUrl = null;

    if (isSelf) {
      targetName = safeDisplayName(ctx.rawMsg.pushName, 'Tú');
      try {
        const pp = await ctx.sock.profile.pictureUrl(ctx.sender, 'image');
        avatarUrl = pp;
      } catch {
        avatarUrl = FALLBACK_AVATAR;
      }
    } else {
      try {
        const pp = await ctx.sock.profile.pictureUrl(target, 'image');
        avatarUrl = pp;
        const user = await ctx.getUserById(target);
        targetName = safeDisplayName(user?.name, 'Usuario mencionado');
      } catch {
        targetName = 'Usuario mencionado';
        avatarUrl = FALLBACK_AVATAR;
      }
    }

    await ctx.react('🌈');

    const percent = Math.floor(Math.random() * 101);

    try {
      const params = new URLSearchParams({
        nama: targetName,
        avatar: avatarUrl || FALLBACK_AVATAR,
        num: String(percent)
      });
      const res = await fetch(`${GAY_API_URL}?${params}`, {
        signal: AbortSignal.timeout(15000)
      });
      if (!res.ok) throw new Error(`La API respondió ${res.status}`);
      const json = await res.json();

      if (!json.status || !json.imagem) {
        throw new Error('Error en la API');
      }

      const resImg = await fetch(json.imagem, {
        signal: AbortSignal.timeout(15000)
      });
      if (!resImg.ok) throw new Error(`La imagen respondió ${resImg.status}`);
      const buf = Buffer.from(await resImg.arrayBuffer());

      const message = pickRandom(GAY_MESSAGES)(targetName, percent);

      await ctx.sock.sendMessage(ctx.chat, {
        image: buf,
        caption: message,
        mentions: [target, ctx.sender]
      }, { quoted: ctx.rawMsg });

    } catch {
      const message = pickRandom(GAY_MESSAGES)(targetName, percent);
      await ctx.reply(message);
    }
  });
