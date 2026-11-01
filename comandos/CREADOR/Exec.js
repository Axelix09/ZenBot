import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default new ZenCommand('exec')
  .addAlias('ejecutarcomando', 'syscmd')
  .setCooldown(2)
  .setCategory('Owner')
  .requireOwner()
  .setUsage('<comando>')
  .onExecute(async (ctx) => {
    const text = ctx.args.join(' ');
    if (!text) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *COMANDO REQUERIDO*\n\n` +
        `> Creo que te faltó algo 🤔\n> Ejemplo: ${ZenConfig.prefix}exec ls -la`
      );
    }

    await ctx.react('⏳');

    try {
      const { stdout, stderr } = await execAsync(text, { timeout: 30000 });

      let output = stdout || stderr || '✅ Comando ejecutado sin salida.';
      const truncated = output.length > 3000 ? output.slice(0, 3000) + '\n\n... (truncado)' : output;

      await ctx.react('✅');
      return ctx.reply(
        `『 🖥️ 』 *EXEC*\n\n` +
        `> 📝 *${text}*\n\n` +
        `\`\`\`\n${truncated}\n\`\`\``
      );

    } catch (error) {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR EN EXEC*\n\n> Qué mala suerte 😢\n\n` +
        `> 📝 *${text}*\n\n` +
        `\`\`\`\n${error.message || error}\n\`\`\``
      );
    }
  });