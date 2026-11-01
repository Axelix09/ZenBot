import { ZenCommand } from '../../lib/core/factory.js';

const CONFIGS = [
  { key: 'antilink', emoji: '🔗', name: 'ANTI LINK' },
  { key: 'antinotadevoz', emoji: '🎙️', name: 'ANTI NOTA DE VOZ' },
  { key: 'antimenciongp', emoji: '📢', name: 'ANTI MENCIÓN DE ESTADO' },
  { key: 'antisticker', emoji: '🎭', name: 'ANTI STICKER' },
  { key: 'antivideo', emoji: '🎬', name: 'ANTI VIDEO' },
  { key: 'antiimagen', emoji: '🖼️', name: 'ANTI IMAGEN' },
  { key: 'antidelete', emoji: '🗑️', name: 'ANTI DELETE' },
  { key: 'antitoxic', emoji: '🚫', name: 'ANTI TOXIC' },
  { key: 'anticallgp', emoji: '📞', name: 'ANTI LLAMADA GRUPAL' },
  { key: 'antispam', emoji: '🛡️', name: 'ANTI SPAM' }
];

export default new ZenCommand('antis')
  .addAlias('panel')
  .setCooldown(3)
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .onExecute(async (ctx) => {
    await ctx.react('🛡️');
    const group = await ctx.getGroup();

    let txt = `『 🛡️ 』 *PANEL DE SEGURIDAD GRUPAL*\n\n`;

    for (const conf of CONFIGS) {
      const enabled = conf.key === 'antilink'
        ? Boolean(group.antilink_active?.length)
        : Boolean(group[conf.key]);
      const estado = enabled ? '🟢 Activo' : '🔴 Inactivo';
      txt += `  • *${conf.name}:* ${estado}\n    > _+${conf.key} on/off_\n\n`;
    }

    return ctx.reply(txt.trim());
  });
