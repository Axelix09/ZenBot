import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

const PROPOSAL_TIMEOUT_MS = 5 * 60 * 1000;

function getMarriageTier(days) {
  if (days >= 365) return '👑 Leyenda del Amor Eterno (1+ Año)';
  if (days >= 180) return '💍 Almas Gemelas (6+ Meses)';
  if (days >= 90) return '🔥 Inseparables (3+ Meses)';
  if (days >= 30) return '👩‍❤️‍👨 Pareja Consolidada (1+ Mes)';
  if (days >= 7) return '✨ Luna de Miel (1+ Semana)';
  return '💖 Recién Casados';
}

export default new ZenCommand('casar')
  .addAlias('casarse', 'proponer', 'marry')
  .setCooldown(10)
  .setCategory('Social')
  .requireRegistration()
  .setUsage('@usuario')
  .onExecute(async (ctx) => {
    const [subcmd] = ctx.args;
    const prefix = ZenConfig.prefix;

    if (!subcmd && !ctx.mentions?.length) {
      await ctx.react('💍');
      return ctx.reply(
        `『 💍 』 *SISTEMA DE PAREJA*\n\n` +
        `✦ *Comandos:*\n` +
        `  • ${prefix}casar @usuario ➜ Proponer matrimonio\n` +
        `  • ${prefix}pareja ➜ Ver tarjeta de tu pareja\n` +
        `  • ${prefix}besar ➜ Demostrar cariño (Bono diario)\n` +
        `  • ${prefix}divorciar ➜ Terminar relación`
      );
    }

    const mentioned = ctx.mentions?.[0];
    if (!mentioned) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *MENCIÓN REQUERIDA*\n\n` +
        `> Mencioná a alguien para proponerle matrimonio 🤔\n` +
        `> _Ejemplo: ${prefix}casar @usuario_`
      );
    }

    if (await ctx.isSameUser(mentioned, ctx.sender)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *AUTO-PROCESO*\n\n> No podés casarte con vos mismo 😌`);
    }

    const user = await ctx.getUser();
    const target = await ctx.getUserById(mentioned);
    const targetName = target.name || mentioned.split('@')[0];

    if (!target.registered) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *USUARIO NO REGISTRADO*\n\n` +
        `> *${targetName}* todavía no se registró 🥲`
      );
    }

    if (user.marriedWith) {
      const myPartnerName = (await ctx.getUserById(user.marriedWith))?.name || 'alguien';
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *YA CASADO*\n\n` +
        `> Ya estás casada/o con *${myPartnerName}* 😅\n` +
        `> Primero divorciate: *${prefix}divorciar*`
      );
    }

    if (target.marriedWith) {
      const targetPartnerName = (await ctx.getUserById(target.marriedWith))?.name || 'alguien';
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *YA COMPROMETIDO*\n\n` +
        `> *${targetName}* ya está casada/o con *${targetPartnerName}* 😏`
      );
    }

    if (target.proposal?.from && Date.now() - target.proposal.at < PROPOSAL_TIMEOUT_MS) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *PROPUESTA PENDIENTE*\n\n> *${targetName}* ya tiene una propuesta pendiente 😌`);
    }

    target.proposal = { from: user.id, name: user.name, at: Date.now() };

    await target.save();
    await user.save();

    await ctx.react('💍');

    const proposalText =
      `『 💍 』 *PROPUESTA DE MATRIMONIO*\n\n` +
      `> ¡*${user.name}* le ha propuesto matrimonio a *${targetName}*! 🙂\n\n` +
      `✦ *${targetName}*, tienes 5 minutos para responder.`;

    const buttons = [
      { type: 'quick_reply', text: '✅ ACEPTAR MATRIMONIO', id: `${prefix}aceptarcasar` },
      { type: 'quick_reply', text: '❌ RECHAZAR', id: `${prefix}rechazarcasar` }
    ];

    return ctx.sock.sendButtons(ctx.chat, {
      text: proposalText,
      footer: ZenConfig.botName,
      buttons
    });
  });

export const cmdAceptarCasar = new ZenCommand('aceptarcasar')
  .addAlias('acceptcasar', 'aceptarmatrimonio')
  .setCooldown(5)
  .setCategory('Social')
  .setHidden(true)
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();

    if (!user.proposal?.from) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SIN PROPUESTA*\n\n> No tenés ninguna propuesta pendiente 🥲`);
    }

    if (user.marriedWith) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *YA CASADO*\n\n> Ya estás casado con otra persona 😅`);
    }

    if (Date.now() - user.proposal.at > PROPOSAL_TIMEOUT_MS) {
      user.proposal = { from: null, name: null, at: null };
      await user.save();
      await ctx.react('⏳');
      return ctx.reply(`『 ⏳ 』 *PROPUESTA EXPIRADA*\n\n> Ya pasaron los 5 minutos 😴`);
    }

    const proposerJid = user.proposal.from;
    const proposer = await ctx.getUserById(proposerJid);
    const proposerName = user.proposal.name;

    if (!proposer || !proposer.registered) {
      user.proposal = { from: null, name: null, at: null };
      await user.save();
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *USUARIO INEXISTENTE*\n\n> El usuario que te propuso matrimonio ya no está disponible 🥲`);
    }

    if (proposer.marriedWith) {
      user.proposal = { from: null, name: null, at: null };
      await user.save();
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *PROPUESTA ANULADA*\n\n> *${proposerName}* ya contrajo matrimonio con otra persona 😅`);
    }

    const originalProposerMarriedWith = proposer.marriedWith;
    const originalProposerMarriedSince = proposer.marriedSince;

    proposer.marriedWith = user.id;
    proposer.marriedSince = Date.now();

    try {
      await proposer.save();
    } catch (err) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *ERROR DE SISTEMA*\n\n> No pude procesar el enlace matrimonial 😤`);
    }

    user.marriedWith = proposer.id;
    user.marriedSince = proposer.marriedSince;
    user.proposal = { from: null, name: null, at: null };

    try {
      await user.save();
    } catch (err) {
      proposer.marriedWith = originalProposerMarriedWith;
      proposer.marriedSince = originalProposerMarriedSince;
      await proposer.save().catch(() => {});
      
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *ERROR DE SISTEMA*\n\n> La operación fue revertida 😤`);
    }

    await ctx.react('💍');
    return ctx.reply(
      `『 💍 』 *¡UNIÓN SELLADA!* 🎉\n\n` +
      `> *${proposerName}* y *${user.name}* han unido sus caminos 😉\n` +
      `> ¡Que viva el amor! ✨`,
      { mentions: [proposer.id, user.id] }
    );
  });

export const cmdRechazarCasar = new ZenCommand('rechazarcasar')
  .addAlias('rejectcasar', 'rechazarmatrimonio')
  .setCooldown(5)
  .setCategory('Social')
  .setHidden(true)
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();

    if (!user.proposal?.from) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SIN PROPUESTA*\n\n> No tenés ninguna propuesta pendiente 🥲`);
    }

    const proposerJid = user.proposal.from;
    const proposerName = user.proposal.name;

    user.proposal = { from: null, name: null, at: null };
    await user.save();

    await ctx.react('💔');
    return ctx.reply(`『 💔 』 *PROPUESTA RECHAZADA*\n\n> *${user.name}* rechazó la propuesta de *${proposerName}* 😢`, { mentions: [proposerJid] });
  });

export const cmdDivorciar = new ZenCommand('divorciar')
  .addAlias('divorcio', 'divorce')
  .setCooldown(10)
  .setCategory('Social')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const [subcmd] = ctx.args;
    const prefix = ZenConfig.prefix;

    if (!user.marriedWith) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SIN PAREJA*\n\n> No estás casada/o con nadie 🫤`);
    }

    if (subcmd?.toLowerCase() !== 'confirmar') {
      const currentPartnerName = (await ctx.getUserById(user.marriedWith))?.name || 'tu pareja';
      await ctx.react('⚠️');

      const buttons = [
        { type: 'quick_reply', text: '💔 SI, DIVORCIARME', id: `${prefix}divorciar confirmar` }
      ];

      return ctx.sock.sendButtons(ctx.chat, {
        text: `『 ⚠️ 』 *CONFIRMAR DIVORCIO*\n\n> ¿Segura/o que querés divorciarte de *${currentPartnerName}*? 😌`,
        footer: ZenConfig.botName,
        buttons
      });
    }

    const partnerJid = user.marriedWith;
    const userName = user.name;
    const partner = await ctx.getUserById(partnerJid);
    const partnerName = partner?.name || 'tu ex pareja';

    let partnerRevertNeeded = false;
    let originalPartnerMarriedWith = null;
    let originalPartnerMarriedSince = null;

    if (partner && partner.marriedWith && await ctx.isSameUser(partner.marriedWith, user.id)) {
      originalPartnerMarriedWith = partner.marriedWith;
      originalPartnerMarriedSince = partner.marriedSince;
      partner.marriedWith = null;
      partner.marriedSince = null;
      partnerRevertNeeded = true;

      try {
        await partner.save();
      } catch (err) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *ERROR DE RED*\n\n> No pude desconectar a tu pareja 😢`);
      }
    }

    user.marriedWith = null;
    user.marriedSince = null;

    try {
      await user.save();
    } catch (err) {
      if (partner && partnerRevertNeeded) {
        partner.marriedWith = originalPartnerMarriedWith;
        partner.marriedSince = originalPartnerMarriedSince;
        await partner.save().catch(() => {});
      }
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *ERROR DE SISTEMA*\n\n> La operación fue anulada 😤`);
    }

    await ctx.react('💔');
    return ctx.reply(`『 💔 』 *DIVORCIO CONFIRMADO*\n\n> *${userName}* y *${partnerName}* han terminado su relación 😉`);
  });

export const cmdPareja = new ZenCommand('pareja')
  .addAlias('partner', 'conyuge')
  .setCooldown(5)
  .setCategory('Social')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();

    if (!user.marriedWith) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SIN PAREJA*\n\n> No estás casada/o con nadie 🫤`);
    }

    const partner = await ctx.getUserById(user.marriedWith);

    if (!partner || !partner.registered) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *PAREJA NO ENCONTRADA*\n\n> Tu pareja ya no está en el sistema 😕`);
    }

    await ctx.react('💍');
    const display = partner.nickname ? `${partner.name} *(${partner.nickname})*` : partner.name;
    const days = user.marriedSince ? Math.floor((Date.now() - user.marriedSince) / 86400000) : 0;
    const marriageTier = getMarriageTier(days);

    let partnerPfp = null;
    try {
      partnerPfp = await ctx.sock.profile.pictureUrl(user.marriedWith, 'image');
    } catch (_) {
      partnerPfp = 'https://i.ibb.co/nNkgRQjK/images-4.jpg';
    }

    const textCard =
      `『 💍 』 *PERFIL DE TU PAREJA*\n\n` +
      `✦ *Nombre:* ${display}\n` +
      `✦ *Estado:* ${marriageTier}\n` +
      `✦ *Juntos:* ${days} días\n\n` +
      `✦ *Rango:* ${partner.role}\n` +
      `✦ *Nivel:* ${partner.level}\n` +
      `✦ *${ZenConfig.currencies.zencoins.name}:* ${partner.zencoins} ${ZenConfig.currencies.zencoins.emoji}\n` +
      `✦ *Biografía:* _"${partner.bio}"_`;

    return ctx.sock.sendMessage(ctx.chat, {
      image: { url: partnerPfp },
      caption: textCard,
      mentions: [user.marriedWith]
    }, { quoted: ctx.rawMsg });
  });

export const cmdBesar = new ZenCommand('besar')
  .addAlias('mimar', 'beso')
  .setCooldown(3600)
  .setCategory('Social')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();

    if (!user.marriedWith) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SIN PAREJA*\n\n> Solo podés enviarle cariño a tu pareja registrada 🫤`);
    }

    const partner = await ctx.getUserById(user.marriedWith);
    if (!partner || !partner.registered) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *PAREJA NO DISPONIBLE*\n\n> Tu pareja no está registrada actualmente 🫤`);
    }

    const bonus = Math.floor(Math.random() * 200) + 100;
    user.zencoins += bonus;
    partner.zencoins += bonus;

    await user.save();
    await partner.save();

    await ctx.react('💖');
    return ctx.reply(
      `『 💖 』 *DEMOSTRACIÓN DE CARIÑO*\n\n` +
      `> *${user.name}* le envió un fuerte beso y abrazo a *${partner.name}* 😌\n\n` +
      `✦ *Bono de Amor:* +${bonus} ${ZenConfig.currencies.zencoins.emoji} para cada uno.`,
      { mentions: [user.marriedWith] }
    );
  });