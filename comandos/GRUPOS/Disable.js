import { ZenCommand } from '../../lib/core/factory.js';

const CATEGORIES = [
  'info',
  'owner',
  'rpg',
  'eco',
  'registro',
  'social',
  'juegos',
  'fun',
  'group',
  'tools',
  'ia',
  'descargas',
  'busquedas',
  'convertidores',
  'anime',
  'nsfw',
  'jadibot',
  'otros'
];

const CATEGORY_MAP = {
  general: 'info',
  informacion: 'info',
  economia: 'eco',
  perfil: 'registro',
  citas: 'social',
  match: 'social',
  'inteligencia artificial': 'ia'
};

const normalizeInput = (input) => {
  const clean = (input || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return CATEGORY_MAP[clean] || clean;
};

export default new ZenCommand('disable')
  .addAlias('desactivar', 'enable', 'activar')
  .setCooldown(3)
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .setUsage('<comando|categoría>')
  .onExecute(async (ctx) => {
    const isEnable = ['enable', 'activar'].includes(ctx.commandName.toLowerCase());
    const rawTarget = ctx.args[0];

    if (!rawTarget) {
      await ctx.react('⚠️');
      const catList = CATEGORIES.map(c => `• ${c}`).join('\n');
      return ctx.reply(
        `『 ⚠️ 』 *OBJETIVO REQUERIDO*\n\n` +
        `> Indicá la categoría o comando a ${isEnable ? 'habilitar' : 'deshabilitar'} 🤨\n\n` +
        `✦ *Categorías disponibles:*\n${catList}`
      );
    }

    const target = normalizeInput(rawTarget);

    const bypass = ['disable', 'enable', 'activar', 'desactivar', 'menu', 'help', 'comandos'];
    if (bypass.includes(target)) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *COMANDO PROTEGIDO*\n\n` +
        `> No podés deshabilitar comandos del núcleo del bot 😌`
      );
    }

    const group = await ctx.getGroup();

    if (CATEGORIES.includes(target)) {
      if (isEnable) {
        group.disabledCategories = (group.disabledCategories || []).filter(c => c !== target);
      } else {
        if (!group.disabledCategories) group.disabledCategories = [];
        if (!group.disabledCategories.includes(target)) group.disabledCategories.push(target);
      }
    } else {
      if (isEnable) {
        group.disabledCmds = (group.disabledCmds || []).filter(c => c !== target);
      } else {
        if (!group.disabledCmds) group.disabledCmds = [];
        if (!group.disabledCmds.includes(target)) group.disabledCmds.push(target);
      }
    }

    if (typeof group.markModified === 'function') {
      group.markModified('disabledCategories');
      group.markModified('disabledCmds');
    }

    await group.save();
    await ctx.react('✅');
    return ctx.reply(
      `『 ✅ 』 *${target.toUpperCase()} ${isEnable ? 'HABILITADO' : 'DESHABILITADO'}*\n\n` +
      `> El elemento fue ${isEnable ? 'habilitado' : 'deshabilitado'} para este grupo 🙂`
    );
  });