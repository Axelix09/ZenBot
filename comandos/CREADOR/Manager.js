import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Soul } from '../../soul.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const comandosDir = path.join(__dirname, '..');

export default new ZenCommand('plugin')
  .addAlias('plugins', 'comandosadmin')
  .setCooldown(2)
  .setCategory('Owner')
  .requireOwner()
  .setUsage('<list|info|create|delete|get|send|reload|rename|move>')
  .onExecute(async (ctx) => {
    const [action, ...args] = ctx.args;
    const prefix = ZenConfig.prefix;

    if (!action) {
      return ctx.reply(
        `『 📦 』 *GESTOR DE PLUGINS*\n\n` +
        `✦ *Comandos:*\n` +
        `  • ${prefix}plugin list - Listar todos los plugins\n` +
        `  • ${prefix}plugin info <nombre> - Ver info de un plugin\n` +
        `  • ${prefix}plugin create <categoria> <nombre> - Crear plugin\n` +
        `  • ${prefix}plugin delete <nombre> - Eliminar plugin\n` +
        `  • ${prefix}plugin get <nombre> - Obtener código del plugin\n` +
        `  • ${prefix}plugin send <nombre> - Enviar plugin como archivo\n` +
        `  • ${prefix}plugin reload <nombre|all> - Recargar plugin(s)\n` +
        `  • ${prefix}plugin rename <viejo> <nuevo> - Renombrar plugin\n` +
        `  • ${prefix}plugin move <plugin> <categoria> - Mover plugin\n` +
        `  • ${prefix}plugin folder <categoria> - Enviar carpeta completa`
      );
    }

    try {
      switch (action.toLowerCase()) {
        case 'list': {
          const categories = fs.readdirSync(comandosDir, { withFileTypes: true })
            .filter(d => d.isDirectory() && !d.name.startsWith('.'))
            .map(d => d.name);

          let output = `『 📂 』 *PLUGINS INSTALADOS*\n\n`;
          
          for (const cat of categories) {
            const catPath = path.join(comandosDir, cat);
            const files = fs.readdirSync(catPath).filter(f => f.endsWith('.js'));
            output += `✦ *${cat}* (${files.length})\n`;
            for (const file of files.slice(0, 10)) {
              output += `  └─ 📄 ${file}\n`;
            }
            if (files.length > 10) {
              output += `  └─ ... y ${files.length - 10} más\n`;
            }
            output += '\n';
          }

          return ctx.reply(output);
        }

        case 'info': {
          const pluginName = args[0];
          if (!pluginName) {
            return ctx.reply(`『 ⚠️ 』 *NOMBRE REQUERIDO*\n\n> Indicá el nombre del plugin 🤔`);
          }

          const result = findPlugin(pluginName);
          if (!result) {
            return ctx.reply(`『 ⚠️ 』 *PLUGIN NO ENCONTRADO*\n\n> No existe un plugin con ese nombre 🤔`);
          }

          const { file, path: foundPath, category } = result;
          const stats = fs.statSync(foundPath);
          const content = fs.readFileSync(foundPath, 'utf8');
          const lines = content.split('\n').length;
          const size = (stats.size / 1024).toFixed(2);

          const aliasMatch = content.match(/\.addAlias\(['"]([^'"]+)['"]\)/g);
          const aliases = aliasMatch ? aliasMatch.map(a => a.match(/['"]([^'"]+)['"]/)[1]) : [];

          return ctx.reply(
            `『 📄 』 *INFORMACIÓN DEL PLUGIN*\n\n` +
            `✦ *Nombre:* ${file}\n` +
            `✦ *Categoría:* ${category}\n` +
            `✦ *Ruta:* ${path.relative(comandosDir, foundPath)}\n` +
            `✦ *Tamaño:* ${size} KB\n` +
            `✦ *Líneas:* ${lines}\n` +
            `✦ *Aliases:* ${aliases.length > 0 ? aliases.join(', ') : 'Ninguno'}\n` +
            `✦ *Creado:* ${new Date(stats.birthtime).toLocaleString()}\n` +
            `✦ *Modificado:* ${new Date(stats.mtime).toLocaleString()}`
          );
        }

        case 'get': {
          const pluginName = args[0];
          if (!pluginName) {
            return ctx.reply(`『 ⚠️ 』 *NOMBRE REQUERIDO*\n\n> Indicá el nombre del plugin 🤔`);
          }

          const result = findPlugin(pluginName);
          if (!result) {
            return ctx.reply(`『 ⚠️ 』 *PLUGIN NO ENCONTRADO*\n\n> No existe un plugin con ese nombre 🤔`);
          }

          const content = fs.readFileSync(result.path, 'utf8');
          const truncated = content.length > 4000 ? content.slice(0, 4000) + '\n\n... (truncado)' : content;

          return ctx.reply(
            `『 📄 』 *${result.file}*\n\n` +
            `\`\`\`javascript\n${truncated}\n\`\`\``
          );
        }

        case 'send': {
          const pluginName = args[0];
          if (!pluginName) {
            return ctx.reply(`『 ⚠️ 』 *NOMBRE REQUERIDO*\n\n> Indicá el nombre del plugin 🤔`);
          }

          const result = findPlugin(pluginName);
          if (!result) {
            return ctx.reply(`『 ⚠️ 』 *PLUGIN NO ENCONTRADO*\n\n> No existe un plugin con ese nombre 🤔`);
          }

          const content = fs.readFileSync(result.path, 'utf8');
          const buffer = Buffer.from(content, 'utf8');

          await ctx.sock.sendMessage(ctx.chat, {
            document: buffer,
            mimetype: 'application/javascript',
            fileName: result.file,
            caption: `『 📤 』 *PLUGIN ENVIADO*\n\n> ¡Bien ahí! 😎\n\n✦ *Archivo:* ${result.file}\n✦ *Categoría:* ${result.category}\n✦ *Tamaño:* ${(buffer.length / 1024).toFixed(2)} KB`
          }, { quoted: ctx.rawMsg });

          await ctx.react('✅');
          break;
        }

        case 'reload': {
          const target = args[0];
          if (!target) {
            return ctx.reply(
              `『 ⚠️ 』 *OBJETIVO REQUERIDO*\n\n> Eso no me cierra 😵‍💫\n\n` +
              `> ${prefix}plugin reload <nombre|all> 🧐\n` +
              `> _Ejemplo: ${prefix}plugin reload menu_\n` +
              `> _Ejemplo: ${prefix}plugin reload all_`
            );
          }

          await ctx.react('⏳');

          if (target.toLowerCase() === 'all') {
            await ctx.reply(`『 ⏳ 』 *Recargando TODOS los plugins...*`);
            const total = Soul.commands.size;
            Soul.commands.clear();
            Soul.aliases.clear();
            await Soul.loadCommands();
            const newTotal = Soul.commands.size;
            await ctx.react('🔄');
            return ctx.reply(
              `『 🔄 』 *TODOS LOS PLUGINS RECARGADOS*\n\n` +
              `✦ *Antes:* ${total} comandos\n` +
              `✦ *Ahora:* ${newTotal} comandos\n` +
              `✦ *Cargados:* ${newTotal - total} nuevos`
            );
          }

          const result = findPlugin(target);
          if (!result) {
            return ctx.reply(`『 ⚠️ 』 *PLUGIN NO ENCONTRADO*\n\n> No existe un plugin con ese nombre 🤔`);
          }

          const { file, path: foundPath } = result;
          const fullPath = path.resolve(foundPath);
          const modulePath = `file://${fullPath}`;

          try {
            const module = await import(`${modulePath}?t=${Date.now()}`);
            const cmd = module.default;
            
            let removed = false;
            
            if (cmd.aliases) {
              for (const alias of cmd.aliases) {
                if (Soul.aliases.get(alias) === cmd.name) {
                  Soul.aliases.delete(alias);
                }
              }
            }
            
            if (Soul.commands.has(cmd.name)) {
              Soul.commands.delete(cmd.name);
              removed = true;
            }

            Soul.commands.set(cmd.name, cmd);
            if (cmd.aliases) {
              cmd.aliases.forEach(alias => {
                Soul.aliases.set(alias, cmd.name);
              });
            }

            await ctx.react('🔄');
            return ctx.reply(
              `『 🔄 』 *PLUGIN RECARGADO*\n\n` +
              `✦ *Nombre:* ${file}\n` +
              `✦ *Comando:* ${cmd.name}\n` +
              `✦ *Aliases:* ${cmd.aliases?.join(', ') || 'Ninguno'}\n` +
              `✦ *Estado:* ✅ Actualizado`
            );
          } catch (error) {
            await ctx.react('❌');
            return ctx.reply(
              `『 ❌ 』 *ERROR AL RECARGAR*\n\n> Noo, falló 😵\n\n` +
              `✦ *Plugin:* ${file}\n` +
              `✦ *Error:* ${error.message || 'Error desconocido'}`
            );
          }
        }

        case 'create': {
          const [category, ...nameParts] = args;
          const name = nameParts.join('_');
          if (!category || !name) {
            return ctx.reply(
              `『 ⚠️ 』 *DATOS REQUERIDOS*\n\n` +
              `> ${prefix}plugin create <categoria> <nombre> 😵‍💫\n` +
              `> _Ejemplo: ${prefix}plugin create ECONOMIA miplugin_`
            );
          }

          const catPath = path.join(comandosDir, category.toUpperCase());
          if (!fs.existsSync(catPath)) {
            fs.mkdirSync(catPath, { recursive: true });
          }

          const pluginPath = path.join(catPath, `${name}.js`);
          if (fs.existsSync(pluginPath)) {
            return ctx.reply(`『 ⚠️ 』 *PLUGIN YA EXISTE*\n\n> ${name}.js ya existe en ${category} 😅`);
          }

          const template = `import { ZenCommand } from '../../lib/core/factory.js';\nimport { ZenConfig } from '../../zen.config.js';\n\nexport default new ZenCommand('${name}')\n  .addAlias('${name}2')\n  .setCooldown(5)\n  .setCategory('${category.toUpperCase()}')\n  .requireRegistration()\n  .setUsage('<texto>')\n  .onExecute(async (ctx) => {\n    const [text] = ctx.args;\n    const prefix = ZenConfig.prefix;\n\n    if (!text) {\n      await ctx.react('⚠️');\n      return ctx.reply(\n        \`『 ⚠️ 』 *TEXTO REQUERIDO*\\n\\n\` +\n        \`> Eso no me cierra 😵‍💫\n> Usá: *\${prefix}${name} [texto]*\\n\` +\n        \`> _Ejemplo: \${prefix}${name} Hola_\`\n      );\n    }\n\n    await ctx.react('✅');\n    return ctx.reply(\`『 ✅ 』 *${name.toUpperCase()}*\\n\\n> Tu texto: \${text}\`);\n  });\n`;

          fs.writeFileSync(pluginPath, template, 'utf8');
          await ctx.react('✅');
          return ctx.reply(
            `『 ✅ 』 *PLUGIN CREADO*\n\n` +
            `✦ *Nombre:* ${name}.js\n` +
            `✦ *Ubicación:* ${category.toUpperCase()}\n` +
            `✦ *Ruta:* ${path.relative(comandosDir, pluginPath)}\n\n` +
            `> _Usa ${prefix}plugin reload ${name} para activarlo 😉_`
          );
        }

        case 'delete': {
          const pluginName = args[0];
          if (!pluginName) {
            return ctx.reply(`『 ⚠️ 』 *NOMBRE REQUERIDO*\n\n> Indicá el nombre del plugin a eliminar 🤔`);
          }

          const result = findPlugin(pluginName);
          if (!result) {
            return ctx.reply(`『 ⚠️ 』 *PLUGIN NO ENCONTRADO*\n\n> No existe un plugin con ese nombre 🤔`);
          }

          fs.unlinkSync(result.path);
          await ctx.react('🗑️');
          return ctx.reply(
            `『 🗑️ 』 *PLUGIN ELIMINADO*\n\n> ¡Listo! 🤩\n\n` +
            `✦ *Nombre:* ${result.file}\n` +
            `✦ *Ubicación:* ${result.category}`
          );
        }

        default: {
          return ctx.reply(
            `『 ⚠️ 』 *ACCIÓN INVÁLIDA*\n\n` +
            `> Eso no me cierra 😵‍💫\n> Opciones: list, info, create, delete, get, send, reload, rename, move`
          );
        }
      }
    } catch (error) {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR EN PLUGIN MANAGER*\n\n` +
        `> ${error.message || 'Ocurrió un error.'} 😢`
      );
    }
  });

function findPlugin(pluginName) {
  const categories = fs.readdirSync(comandosDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.'))
    .map(d => d.name);

  for (const cat of categories) {
    const catPath = path.join(comandosDir, cat);
    if (!fs.existsSync(catPath)) continue;
    const files = fs.readdirSync(catPath).filter(f => f.endsWith('.js'));
    for (const file of files) {
      const name = file.replace('.js', '');
      if (name === pluginName || file === pluginName || name.toLowerCase() === pluginName.toLowerCase()) {
        return { file, path: path.join(catPath, file), category: cat };
      }
    }
  }
  return null;
}