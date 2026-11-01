import { ZenCommand } from '../../lib/core/factory.js';
import { UserModel } from '../../lib/database/adapter.js';
import { ZenConfig } from '../../zen.config.js';

const GENEROS = { H: 'Hombre', M: 'Mujer', O: 'Otro' };

const CAMPOS = {
  nombre:    { key: 'name',     label: 'Nombre',    quitarOk: false },
  apodo:     { key: 'nickname', label: 'Apodo',     quitarOk: true  },
  bio:       { key: 'bio',      label: 'Bio',       quitarOk: true  },
  estado:    { key: 'status',   label: 'Estado',    quitarOk: true  },
  pais:      { key: 'location', label: 'País',     quitarOk: true  },
  edad:      { key: 'age',      label: 'Edad',      quitarOk: false },
  genero:    { key: 'gender',   label: 'Género',    quitarOk: false }
};

const DEFAULTS = {
  bio: `Explorando junto a ${ZenConfig.botName}. ✨`
};

const LIMITES = {
  name:     { min: 2,  max: 30  },
  nickname: { min: 2,  max: 20  },
  bio:      { min: 1,  max: 120 },
  status:   { min: 1,  max: 60  },
  location: { min: 2,  max: 40  }
};

const exactMatches = ['pene', 'ano', 'orto', 'culo', 'teta', 'paja', 'hdp', 'puto', 'puta', 'perra', 'porno', 'sexo'];
const partialMatches = [
  'pendejo', 'pendeja', 'zorra', 'mamon', 'mamona', 'cabron', 'cabrona',
  'estupido', 'estupida', 'maricon', 'bastardo', 'imbecil', 'idiota',
  'forro', 'forra', 'tarado', 'tarada', 'boludo', 'boluda', 'pelotudo',
  'pelotuda', 'hijodeputa', 'hijo de puta', 'culiado', 'culiada',
  'vagina', 'verga', 'pija', 'poronga', 'pingo', 'chota', 'choto',
  'semen', 'esperma', 'pajero', 'pajera', 'chupala', 'chupapijas',
  'chupavergas', 'chupamelapija', 'mamalo', 'mamar', 'pedofilo', 'violador'
];

const sanitizeInput = (text) => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[\\/*?:"<>|`~]/g, '')
    .trim();
};

const containsInsult = (text) => {
  const cleanText = (text || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const words = cleanText.split(/[\s_\-\d]+/);

  const hasExact = words.some(word => exactMatches.includes(word));
  if (hasExact) return true;

  const hasPartial = partialMatches.some(insulto => cleanText.includes(insulto));
  if (hasPartial) return true;

  return false;
};

export default new ZenCommand('editarperfil')
  .addAlias('editar', 'ep')
  .setCooldown(5)
  .setCategory('registro')
  .requireRegistration()
  .setUsage('<campo> <valor>')
  .onExecute(async (ctx) => {
    const [subcmd, ...rest] = ctx.args;

    if (!subcmd) {
      await ctx.react('📝');
      return ctx.reply(
        `『 📝 』 *EDITAR PERFIL*\n\n` +
        `✦ *Uso:* ${ZenConfig.prefix}${ctx.commandName} [campo] [valor]\n\n` +
        `✦ *Campos disponibles:*\n` +
        `  • nombre ➜ tu nombre\n` +
        `  • apodo ➜ cómo te llaman\n` +
        `  • bio ➜ descripción (máx 120)\n` +
        `  • estado ➜ tu estado actual\n` +
        `  • pais ➜ de dónde eres\n` +
        `  • edad ➜ tu edad\n` +
        `  • genero ➜ H, M u O\n\n` +
        `✦ *Para borrar un campo opcional:*\n` +
        `  ${ZenConfig.prefix}${ctx.commandName} quitar [campo]\n` +
        `  (apodo, bio, estado, pais)`
      );
    }

    const user = await ctx.getUser();

    if (subcmd.toLowerCase() === 'quitar') {
      const campoKey = rest[0]?.toLowerCase();
      const campo = CAMPOS[campoKey];

      if (!campo) {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *CAMPO INVÁLIDO*\n\n` +
          `> *${campoKey || '?'}* no es un campo válido 😵‍💫\n` +
          `> Usá *${ZenConfig.prefix}${ctx.commandName}* para ver las opciones.`
        );
      }

      if (!campo.quitarOk) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *CAMPO OBLIGATORIO*\n\n> No podés borrar *${campo.label}*, es obligatorio 😉`);
      }

      user[campo.key] = DEFAULTS[campo.key] ?? null;
      await user.save();
      await ctx.react('✨');
      return ctx.reply(`『 ✨ 』 *CAMPO ELIMINADO*\n\n> *${campo.label}* eliminado de tu perfil 🙂`);
    }

    const campoKey = subcmd.toLowerCase();
    const campo = CAMPOS[campoKey];

    if (!campo) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *CAMPO INVÁLIDO*\n\n` +
        `> *${campoKey}* no es un campo válido 😵‍💫\n` +
        `> Usá *${ZenConfig.prefix}${ctx.commandName}* para ver las opciones.`
      );
    }

    const valorRaw = rest.join(' ').trim();
    const valor = sanitizeInput(valorRaw);

    if (!valor) {
      await ctx.react('📝');
      return ctx.reply(
        `『 📝 』 *EDITAR PERFIL*\n\n` +
        `✦ *Uso:* ${ZenConfig.prefix}${ctx.commandName} [campo] [valor]\n\n` +
        `✦ *Campos disponibles:*\n` +
        `  • nombre ➜ tu nombre\n` +
        `  • apodo ➜ cómo te llaman\n` +
        `  • bio ➜ descripción (máx 120)\n` +
        `  • estado ➜ tu estado actual\n` +
        `  • pais ➜ de dónde eres\n` +
        `  • edad ➜ tu edad\n` +
        `  • genero ➜ H, M u O\n\n` +
        `✦ *Para borrar un campo opcional:*\n` +
        `  ${ZenConfig.prefix}${ctx.commandName} quitar [campo]\n` +
        `  (apodo, bio, estado, pais)`
      );
    }

    if (containsInsult(valor)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *CONTENIDO NO PERMITIDO*\n\n> No se permiten palabras vulgares o insultantes en tu perfil 😳`);
    }

    if (campoKey === 'nombre') {
      const nameExists = await UserModel.findOne({ name: { $regex: new RegExp(`^${valor}$`, 'i') }, registered: true, id: { $ne: user.id } });

      if (nameExists) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *NOMBRE EN USO*\n\n> Ese nombre ya está registrado por otra persona. Elegí uno diferente 😉`);
      }
    }

    if (campoKey === 'edad') {
      const edad = Number(valor);
      if (!Number.isInteger(edad) || edad < 8 || edad > 99) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *EDAD INVÁLIDA*\n\n> Tiene que ser un número entre 8 y 99 😵‍💫`);
      }
      user.age = edad;
      await user.save();
      await ctx.react('✨');
      return ctx.reply(`『 ✨ 』 *${campo.label} ACTUALIZADO*\n\n> ${edad} 😄`);
    }

    if (campoKey === 'genero') {
      const g = valor.toUpperCase();
      if (!GENEROS[g]) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *GÉNERO INVÁLIDO*\n\n> Revisá cómo lo escribiste 🧐\n\n> Tiene que ser H, M u O 🧐`);
      }
      user.gender = g;
      await user.save();
      await ctx.react('✨');
      return ctx.reply(`『 ✨ 』 *${campo.label} ACTUALIZADO*\n\n> ${GENEROS[g]} 😄`);
    }

    const limite = LIMITES[campo.key];
    if (limite) {
      if (valor.length < limite.min) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *${campo.label.toUpperCase()} CORTO*\n\n> Debe tener al menos ${limite.min} caracteres 😉`);
      }
      if (valor.length > limite.max) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *${campo.label.toUpperCase()} LARGO*\n\n> No puede superar los ${limite.max} caracteres 😉`);
      }
    }

    user[campo.key] = valor;
    await user.save();
    await ctx.react('✨');
    return ctx.reply(`『 ✨ 』 *${campo.label} ACTUALIZADO*\n\n> ${valor} 😄`);
  });