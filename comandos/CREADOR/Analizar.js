import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);
const comandosDir = path.join(__dirname, '..');

export default new ZenCommand('analyzer')
  .addAlias('diagnostico', 'revisar', 'scanbot')
  .setCooldown(5)
  .setCategory('Owner')
  .requireOwner()
  .setUsage('<all|syntax|alias|modules|files|duplicados|imports|plugins>')
  .onExecute(async (ctx) => {
    const [action] = ctx.args;
    const prefix = ZenConfig.prefix;

    if (!action) {
      return ctx.reply(
        `『 🔍 』 *ANALIZADOR GLOBAL*\n\n` +
        `✦ *Comandos:*\n` +
        `  • ${prefix}analyzer all - Análisis completo\n` +
        `  • ${prefix}analyzer syntax - Verificar sintaxis\n` +
        `  • ${prefix}analyzer alias - Buscar alias duplicados\n` +
        `  • ${prefix}analyzer modules - Verificar módulos\n` +
        `  • ${prefix}analyzer files - Verificar archivos\n` +
        `  • ${prefix}analyzer duplicados - Buscar comandos duplicados\n` +
        `  • ${prefix}analyzer imports - Verificar imports\n` +
        `  • ${prefix}analyzer plugins - Ver estado de plugins`
      );
    }

    await ctx.react('⏳');
    let output = '';

    try {
      switch (action.toLowerCase()) {
        case 'all': {
          output = await runFullAnalysis();
          break;
        }
        case 'syntax': {
          output = await checkSyntax();
          break;
        }
        case 'alias': {
          output = await checkAliases();
          break;
        }
        case 'modules': {
          output = await checkModules();
          break;
        }
        case 'files': {
          output = await checkFiles();
          break;
        }
        case 'duplicados': {
          output = await checkDuplicates();
          break;
        }
        case 'imports': {
          output = await checkImports();
          break;
        }
        case 'plugins': {
          output = await checkPlugins();
          break;
        }
        default: {
          return ctx.reply(
            `『 ⚠️ 』 *ANÁLISIS INVÁLIDO*\n\n` +
            `> Uy, algo no cuadra 🤨\n> Opciones: all, syntax, alias, modules, files, duplicados, imports, plugins`
          );
        }
      }

      await ctx.react('✅');
      const truncated = output.length > 4000 ? output.slice(0, 4000) + '\n\n... (truncado)' : output;
      return ctx.reply(truncated);

    } catch (error) {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR EN ANÁLISIS*\n\n` +
        `> ${error.message || 'Ocurrió un error.'} 🙃`
      );
    }
  });

async function checkPlugins() {
  const results = [];
  let total = 0;
  let loaded = 0;
  let errors = 0;

  const categories = fs.readdirSync(comandosDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.'))
    .map(d => d.name);

  for (const cat of categories) {
    const catPath = path.join(comandosDir, cat);
    const files = fs.readdirSync(catPath).filter(f => f.endsWith('.js'));
    total += files.length;

    for (const file of files) {
      const filePath = path.join(catPath, file);
      try {
        await execAsync(`node --check "${filePath}"`, { timeout: 5000 });
        loaded++;
      } catch {
        errors++;
        results.push(`❌ ${cat}/${file}: Error de sintaxis`);
      }
    }
  }

  results.unshift(`✅ *Plugins:* ${loaded}/${total} cargados correctamente\n`);
  return results.join('\n');
}

async function runFullAnalysis() {
  const results = [];
  results.push('『 🔍 』 *ANÁLISIS COMPLETO*\n');
  results.push('═'.repeat(30) + '\n');

  results.push('📄 *PLUGINS...*');
  const plugins = await checkPlugins();
  results.push(plugins);

  results.push('\n📄 *SINTAXIS...*');
  const syntax = await checkSyntax();
  results.push(syntax);

  results.push('\n📄 *ALIAS...*');
  const alias = await checkAliases();
  results.push(alias);

  results.push('\n📄 *MÓDULOS...*');
  const modules = await checkModules();
  results.push(modules);

  results.push('\n📄 *ARCHIVOS...*');
  const files = await checkFiles();
  results.push(files);

  results.push('\n📄 *DUPLICADOS...*');
  const duplicates = await checkDuplicates();
  results.push(duplicates);

  return results.join('\n');
}

async function checkSyntax() {
  const results = [];
  let errors = 0;
  let total = 0;

  const categories = fs.readdirSync(comandosDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.'))
    .map(d => d.name);

  for (const cat of categories) {
    const catPath = path.join(comandosDir, cat);
    const files = fs.readdirSync(catPath).filter(f => f.endsWith('.js'));
    total += files.length;

    for (const file of files) {
      const filePath = path.join(catPath, file);
      try {
        await execAsync(`node --check "${filePath}"`, { timeout: 5000 });
      } catch (error) {
        errors++;
        results.push(`❌ ${cat}/${file}: ${error.message.split('\n')[0]}`);
      }
    }
  }

  results.unshift(`✅ *Sintaxis:* ${total - errors}/${total} correctos\n`);
  return results.join('\n');
}

async function checkAliases() {
  const aliases = new Map();
  const commands = new Map();
  const results = [];
  let duplicates = 0;

  const categories = fs.readdirSync(comandosDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.'))
    .map(d => d.name);

  for (const cat of categories) {
    const catPath = path.join(comandosDir, cat);
    const files = fs.readdirSync(catPath).filter(f => f.endsWith('.js'));

    for (const file of files) {
      const filePath = path.join(catPath, file);
      const content = fs.readFileSync(filePath, 'utf8');

      const nameMatch = content.match(/new ZenCommand\(['"]([^'"]+)['"]\)/);
      if (nameMatch) {
        const cmdName = nameMatch[1];
        commands.set(cmdName, file);
      }

      const aliasMatches = content.match(/\.addAlias\(['"]([^'"]+)['"]\)/g);
      if (aliasMatches) {
        for (const match of aliasMatches) {
          const alias = match.match(/['"]([^'"]+)['"]/)[1];
          if (aliases.has(alias)) {
            duplicates++;
            results.push(`⚠️ Alias duplicado: "${alias}" en ${file} y ${aliases.get(alias)}`);
          } else {
            aliases.set(alias, file);
          }
        }
      }
    }
  }

  results.unshift(`✅ *Alias:* ${duplicates} duplicados encontrados\n`);
  return results.join('\n');
}

async function checkModules() {
  try {
    const { stdout } = await execAsync('npm list --depth=0 --json', { timeout: 30000 });
    const data = JSON.parse(stdout);
    const deps = data.dependencies || {};
    const modules = Object.keys(deps);

    let missing = 0;
    let outdated = 0;
    const results = [];

    for (const mod of modules) {
      const version = deps[mod].version || '?';
      try {
        const { stdout: viewOut } = await execAsync(`npm view ${mod} version`, { timeout: 10000 });
        const latest = viewOut.trim();
        if (latest !== version && !version.includes(latest)) {
          outdated++;
          results.push(`📦 ${mod}: ${version} → ${latest} disponible`);
        }
      } catch {
        missing++;
        results.push(`❌ ${mod}: No se pudo verificar`);
      }
    }

    results.unshift(`✅ *Módulos:* ${modules.length} instalados, ${outdated} desactualizados\n`);
    return results.join('\n');
  } catch {
    return '❌ No se pudo analizar los módulos.';
  }
}

async function checkFiles() {
  const results = [];
  let total = 0;
  let errors = 0;
  let categories = [];

  try {
    categories = fs.readdirSync(comandosDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('.'))
      .map(d => d.name);
  } catch {
    return '❌ No se pudo leer el directorio de comandos.';
  }

  for (const cat of categories) {
    const catPath = path.join(comandosDir, cat);
    let files = [];
    try {
      files = fs.readdirSync(catPath).filter(f => f.endsWith('.js'));
    } catch {
      continue;
    }

    total += files.length;
    for (const file of files) {
      const filePath = path.join(catPath, file);
      try {
        const stats = fs.statSync(filePath);
        if (stats.size === 0) {
          errors++;
          results.push(`⚠️ ${cat}/${file}: Archivo vacío`);
        }
      } catch {
        errors++;
        results.push(`❌ ${cat}/${file}: No se pudo leer`);
      }
    }
  }

  results.unshift(`✅ *Archivos:* ${total - errors}/${total} válidos\n`);
  return results.join('\n');
}

async function checkDuplicates() {
  const commands = new Map();
  const results = [];
  let duplicates = 0;

  const categories = fs.readdirSync(comandosDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.'))
    .map(d => d.name);

  for (const cat of categories) {
    const catPath = path.join(comandosDir, cat);
    const files = fs.readdirSync(catPath).filter(f => f.endsWith('.js'));

    for (const file of files) {
      const filePath = path.join(catPath, file);
      const content = fs.readFileSync(filePath, 'utf8');

      const nameMatch = content.match(/new ZenCommand\(['"]([^'"]+)['"]\)/);
      if (nameMatch) {
        const cmdName = nameMatch[1];
        if (commands.has(cmdName)) {
          duplicates++;
          results.push(`⚠️ Comando duplicado: "${cmdName}" en ${file} y ${commands.get(cmdName)}`);
        } else {
          commands.set(cmdName, file);
        }
      }
    }
  }

  results.unshift(`✅ *Duplicados:* ${duplicates} comandos duplicados\n`);
  return results.join('\n');
}

async function checkImports() {
  const results = [];
  let errors = 0;
  let total = 0;

  const categories = fs.readdirSync(comandosDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.'))
    .map(d => d.name);

  for (const cat of categories) {
    const catPath = path.join(comandosDir, cat);
    const files = fs.readdirSync(catPath).filter(f => f.endsWith('.js'));
    total += files.length;

    for (const file of files) {
      const filePath = path.join(catPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
      let match;

      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
          continue;
        }

        const resolvedPath = path.resolve(path.dirname(filePath), importPath);
        const possiblePaths = [
          resolvedPath,
          `${resolvedPath}.js`,
          path.join(resolvedPath, 'index.js')
        ];

        let found = false;
        for (const p of possiblePaths) {
          if (fs.existsSync(p)) {
            found = true;
            break;
          }
        }

        if (!found) {
          errors++;
          results.push(`❌ ${cat}/${file}: Import "${importPath}" no encontrado`);
        }
      }
    }
  }

  results.unshift(`✅ *Imports:* ${total - errors}/${total} correctos\n`);
  return results.join('\n');
}