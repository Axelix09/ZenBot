import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import fs from 'fs';
import path from 'path';

export default new ZenCommand('cleansession')
  .addAlias('ds', 'limpiar', 'purga')
  .setCooldown(10)
  .setCategory('Owner')
  .requireOwner()
  .setUsage('[--force]')
  .onExecute(async (ctx) => {
    const force = ctx.args.includes('--force');

    if (!force) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *CONFIRMACIÓN REQUERIDA*\n\n> Creo que te faltó algo 🤔\n\n` +
        `> Esta acción eliminará sesiones antiguas 🧐\n` +
        `> Usá: ${ZenConfig.prefix}cleansession --force`
      );
    }

    await ctx.react('🧹');

    const paths = [
      path.resolve('./ZenSessions/'),
      path.resolve('./tmp/')
    ];

    let filesDeleted = 0;

    for (const rootPath of paths) {
      if (!fs.existsSync(rootPath)) continue;

      const files = fs.readdirSync(rootPath);
      for (const file of files) {
        if (file !== 'creds.json') {
          try {
            const filePath = path.join(rootPath, file);
            const stat = fs.statSync(filePath);
            if (stat.isFile()) {
              fs.unlinkSync(filePath);
              filesDeleted++;
            } else if (stat.isDirectory()) {
              fs.rmSync(filePath, { recursive: true, force: true });
              filesDeleted++;
            }
          } catch {}
        }
      }
    }

    await ctx.react('✅');
    return ctx.reply(
      `『 🧹 』 *LIMPIEZA COMPLETADA*\n\n` +
      `✦ *Archivos eliminados:* ${filesDeleted}\n` +
      `✦ *Sesiones limpias:* ✅\n\n` +
      `> _Reinicia el bot para regenerar las sesiones 🤩_`
    );
  });