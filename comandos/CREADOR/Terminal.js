import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default new ZenCommand('terminal')
  .addAlias('consola', 'comandosistema')
  .setCooldown(2)
  .setCategory('Owner')
  .requireOwner()
  .setUsage('<comando>')
  .onExecute(async (ctx) => {
    const command = ctx.args.join(' ');
    const prefix = ZenConfig.prefix;

    if (!command) {
      return ctx.reply(
        `『 🖥️ 』 *TERMINAL*\n\n` +
        `✦ *Uso:* ${prefix}terminal <comando>\n` +
        `✦ *Ejemplo:* ${prefix}terminal ls -la`
      );
    }

    await ctx.react('⏳');

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024
      });

      let output = stdout || stderr || '✅ Comando ejecutado sin salida.';
      
      if (output.length > 4000) {
        output = output.slice(0, 4000) + '\n\n... (truncado)';
      }

      await ctx.react('✅');
      return ctx.reply(
        `『 🖥️ 』 *TERMINAL*\n\n` +
        `> 📝 *${command}*\n\n` +
        `\`\`\`\n${output}\n\`\`\``
      );

    } catch (error) {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR EN TERMINAL*\n\n> Noo, falló 😵\n\n` +
        `> 📝 *${command}*\n\n` +
        `\`\`\`\n${error.message || 'Comando falló'}\n\`\`\``
      );
    }
  });