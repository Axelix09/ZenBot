import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { PREDEFINED_TAGS, GENDERS, SEEKING_OPTIONS } from '../../lib/database/zenmatch-data.js';
import { checkNsfwImage, getDefaultAgeRange } from '../../lib/database/zenmatch-helpers.js';

export const cmdMatchCrear = new ZenCommand('matchcrear')
  .setCategory('Social')
  .requireRegistration()
  .setUsage('<Edad>, <M/F/O>, <Busco M/F/BOTH>, <Nombre>')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const rawInput = ctx.args.join(' ');

    if (!rawInput.includes(',')) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *FORMATO INCORRECTO*\n\n` +
        `> Eso no me cierra 😵‍💫\n> Usá: *${ZenConfig.prefix}matchcrear Edad, Género, Busco, Nombre*\n` +
        `> _Ejemplo: ${ZenConfig.prefix}matchcrear 21, M, F, Lucas_`
      );
    }

    const parts = rawInput.split(',').map(p => p.trim());
    if (parts.length < 4) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *FALTAN DATOS*\n\n> Eso no me cierra 😵‍💫\n> Tenés que proporcionar: Edad, Género (M/F/O), Busco (M/F/BOTH), Nombre.`);
    }

    const age = parseInt(parts[0], 10);
    const gender = parts[1].toUpperCase();
    const seeking = parts[2].toUpperCase();
    const name = parts[3];

    if (isNaN(age) || age < 18 || age > 99) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *EDAD INVÁLIDA*\n\n> Tenés que tener al menos 18 años para usar ZenMatch 🤔`);
    }

    if (!['M', 'F', 'O'].includes(gender)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *GÉNERO INVÁLIDO*\n\n> Uy, algo no cuadra 🤨\n> Opciones: M (Hombre), F (Mujer), O (Otro).`);
    }

    if (!['M', 'F', 'BOTH'].includes(seeking)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *BÚSQUEDA INVÁLIDA*\n\n> Creo que te faltó algo 🤔\n> Opciones: M (Hombres), F (Mujeres), BOTH (Ambos).`);
    }

    if (!user.zenmatch) user.zenmatch = {};

    const defaultRange = getDefaultAgeRange(age);

    user.zenmatch.active = true;
    user.zenmatch.name = name;
    user.zenmatch.age = age;
    user.zenmatch.gender = gender;
    user.zenmatch.seeking = seeking;
    user.zenmatch.bio = '¡Hola! Estoy usando ZenMatch.';
    user.zenmatch.filters = { minAge: defaultRange.min, maxAge: defaultRange.max };
    user.zenmatch.likesReceived = user.zenmatch.likesReceived || [];
    user.zenmatch.likesSent = user.zenmatch.likesSent || [];
    user.zenmatch.passed = user.zenmatch.passed || [];
    user.zenmatch.matches = user.zenmatch.matches || [];
    user.zenmatch.chatRequests = user.zenmatch.chatRequests || [];
    user.zenmatch.tags = user.zenmatch.tags || ['#videojuegos', '#musica'];

    if (typeof user.markModified === 'function') user.markModified('zenmatch');
    await user.save();

    await ctx.react('✨');
    return ctx.reply(
      `『 ✨ 』 *PERFIL CREADO EN ZENMATCH*\n\n> ¡Qué crack! 🥳\n\n` +
      `✦ *Nombre:* ${name}\n✦ *Edad:* ${age} años\n✦ *Género:* ${GENDERS[gender]}\n✦ *Buscas:* ${SEEKING_OPTIONS[seeking]}\n✦ *Rango de edad por defecto:* ${defaultRange.min} - ${defaultRange.max} años\n\n` +
      `> Usá *${ZenConfig.prefix}matchperfil foto <URL_Directa>* para subir tu foto 😄\n` +
      `> Usá *${ZenConfig.prefix}zenmatch* para ir a tu panel.`
    );
  });

export const cmdMatchPerfil = new ZenCommand('matchperfil')
  .setCategory('Social')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const zm = user.zenmatch || {};
    const prefix = ZenConfig.prefix;

    if (!zm.active) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *SIN CUENTA*\n\n> Primero crea tu cuenta con *${prefix}matchcrear* 😕`);
    }

    const [action, ...args] = ctx.args;
    const value = args.join(' ').trim();

    if (!action) {
      await ctx.react('⚙️');
      return ctx.reply(
        `『 ⚙️ 』 *EDICIÓN DE PERFIL ZENMATCH*\n\n` +
        `✦ *${prefix}matchperfil bio <texto>* ➜ Cambiar biografía\n` +
        `✦ *${prefix}matchperfil foto <URL_imagen>* ➜ Cambiar foto (Protegido con IA NSFW)\n` +
        `✦ *${prefix}matchperfil pais <país>* ➜ Cambiar nacionalidad\n` +
        `✦ *${prefix}matchperfil hobbies <texto>* ➜ Cambiar pasatiempos\n` +
        `✦ *${prefix}matchperfil tags* ➜ Configurar etiquetas`
      );
    }

    const sub = action.toLowerCase();

    if (sub === 'bio') {
      if (!value) return ctx.reply(`『 ⚠️ 』 Contame tu nueva biografía 😄`);
      zm.bio = value.substring(0, 150);
      if (typeof user.markModified === 'function') user.markModified('zenmatch');
      await user.save();
      await ctx.react('✅');
      return ctx.reply(`『 ✅ 』 *BIOGRAFÍA ACTUALIZADA*\n\n> ¡Listo! 🤩\n\n> _"${zm.bio}"_`);
    }

    if (sub === 'foto') {
      if (!value || !/^https?:\/\//i.test(value)) {
        return ctx.reply(`『 ⚠️ 』 Pasame una URL directa válida 🤨 (ej. https://i.ibb.co/...).`);
      }

      await ctx.react('🔍');
      const nsfwResult = await checkNsfwImage(value);

      if (!nsfwResult.safe) {
        await ctx.react('🔞');
        return ctx.reply(
          `『 🔞 』 *IMAGEN RECHAZADA POR SEGURIDAD*\n\n` +
          `> Nuestro sistema de IA detectó contenido inapropiado (*${nsfwResult.label}* - ${nsfwResult.confidence}%) 😤\n` +
          `> Para mantener ZenMatch seguro, solo se permiten imágenes aptas para todo público.`
        );
      }

      zm.photo = value;
      if (typeof user.markModified === 'function') user.markModified('zenmatch');
      await user.save();
      await ctx.react('✅');
      return ctx.reply(`『 ✅ 』 *FOTO DE PERFIL APROBADA Y ACTUALIZADA*`);
    }

    if (sub === 'pais' || sub === 'nacionalidad') {
      if (!value) return ctx.reply(`『 ⚠️ 』 Decime de qué país sos 😄`);
      zm.nationality = value;
      if (typeof user.markModified === 'function') user.markModified('zenmatch');
      await user.save();
      await ctx.react('✅');
      return ctx.reply(`『 ✅ 』 *PAÍS ACTUALIZADO:* ${zm.nationality}`);
    }

    if (sub === 'hobbies') {
      if (!value) return ctx.reply(`『 ⚠️ 』 Contame tus pasatiempos 😎`);
      zm.hobbies = value;
      if (typeof user.markModified === 'function') user.markModified('zenmatch');
      await user.save();
      await ctx.react('✅');
      return ctx.reply(`『 ✅ 』 *PASATIEMPOS ACTUALIZADOS:* ${zm.hobbies}`);
    }

    if (sub === 'tags' || sub === 'etiquetas') {
      if (!value) {
        return ctx.reply(
          `『 🏷️ 』 *ETIQUETAS DISPONIBLES*\n\n` +
          `${PREDEFINED_TAGS.join('  ')}\n\n` +
          `> *Uso:* ${prefix}matchperfil tags #videojuegos #musica #anime`
        );
      }

      const inputTags = value.split(' ').filter(t => t.startsWith('#'));
      const validTags = inputTags.filter(t => PREDEFINED_TAGS.includes(t.toLowerCase()));

      if (validTags.length === 0) {
        return ctx.reply(`『 ⚠️ 』 Ninguna etiqueta de la lista era válida 😵‍💫`);
      }

      zm.tags = [...new Set(validTags)].slice(0, 5);
      if (typeof user.markModified === 'function') user.markModified('zenmatch');
      await user.save();
      await ctx.react('✅');
      return ctx.reply(`『 ✅ 』 *ETIQUETAS GUARDADAS:* ${zm.tags.join(' ')}`);
    }
  });