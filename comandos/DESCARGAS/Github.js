import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import fetch from 'node-fetch';
import fs from 'node:fs';
import { downloadToRuntimeFile, removeRuntimeFile } from '../../lib/runtime/download-file.js';

const MAX_REPO = 100;
const GH_API = 'https://api.github.com';
const GIT_REGEX = /github\.com\/([^\/]+)\/([^\/]+)(?:\.git)?/i;

async function fetchRepo(owner, repo) {
  const headers = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': `${ZenConfig.botName || 'ZenBot'}-gitclone`
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const res = await fetch(`${GH_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
    headers,
    signal: AbortSignal.timeout(15000)
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return res.json();
}

export default new ZenCommand('gitclone')
  .addAlias('git', 'repositorio', 'repo', 'gitc')
  .setCooldown(20)
  .setCategory('Descargas')
  .requireRegistration()
  .setUsage('<link>')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const [url] = ctx.args;

    if (!url) {
      await ctx.react('📂');
      return ctx.reply(
        `『 📂 』 *GITHUB CLONE*\n\n` +
        `✦ *Uso:* ${ZenConfig.prefix}${ctx.commandName} <link>\n` +
        `✦ *Costo:* 1 ${ZenConfig.currencies.kogen.emoji}\n` +
        `✦ *Límite:* ${MAX_REPO} MB\n` +
        `> _Ejemplo: ${ZenConfig.prefix}${ctx.commandName} https://github.com/usuario/repo_`
      );
    }

    if (!GIT_REGEX.test(url)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *ENLACE INVÁLIDO*\n\n> Asegurate de que sea un enlace de GitHub válido 🤔`);
    }

    if (user.kogen < 1) {
      await ctx.react('⚠️');
      return ctx.reply(V.kogen.insufficient('descargar', 1));
    }

    const chatId = ctx.chat;
    let [, ghUser, repo] = url.match(GIT_REGEX);
    repo = repo.split(/[?#]/)[0].replace(/\.git$/i, '');
    await ctx.react('⏳');

    try {
      const data = await fetchRepo(ghUser, repo);

      if (!data || data.private) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *REPO NO ENCONTRADO*\n\n> El repositorio no existe o no es público 😕`);
      }

      const branch = data.default_branch || 'main';
      const zipUrl = `https://github.com/${data.full_name}/archive/refs/heads/${encodeURI(branch)}.zip`;
      const zipPath = await downloadToRuntimeFile(zipUrl, { prefix: 'github', extension: 'zip', timeout: 60000, minBytes: 100 });
      try {
        const { size } = await fs.promises.stat(zipPath);
        if (size / (1024 * 1024) > MAX_REPO) {
          return ctx.reply(`『 ⚠️ 』 *REPO DEMASIADO GRANDE*\n\n> El repo supera el límite de ${MAX_REPO} MB 😌`);
        }

        const sizeMB = (size / (1024 * 1024)).toFixed(1);
        const description = data.description ? data.description.slice(0, 120) : '';
        const license = data.license?.spdx_id && data.license.spdx_id !== 'NOASSERTION' ? data.license.spdx_id : '';
        const updated = data.pushed_at ? data.pushed_at.slice(0, 10) : '';

        await ctx.sock.sendMessage(chatId, {
          document: { url: zipPath },
          mimetype: 'application/zip',
          fileName: `${data.name}.zip`,
          caption: `╔━᳀『 📂 *${data.name}* 』═᳀\n` +
            (description ? `⌬ *Descripción:* ${description}\n` : '') +
            `⌬ *Autor:* ${data.owner?.login || ghUser}\n` +
            `⌬ *Rama:* ${branch}\n` +
            (data.language ? `⌬ *Lenguaje:* ${data.language}\n` : '') +
            (license ? `⌬ *Licencia:* ${license}\n` : '') +
            `⌬ *Estrellas:* ${data.stargazers_count ?? 0}\n` +
            `⌬ *Forks:* ${data.forks_count ?? 0}\n` +
            (updated ? `⌬ *Actualizado:* ${updated}\n` : '') +
            `⌬ *Tamaño:* ${sizeMB} MB\n` +
            `╚═━═━═━═━═━═━═━═᳀`
        }, { quoted: ctx.rawMsg });
      } finally {
        await removeRuntimeFile(zipPath);
      }

      user.kogen -= 1;
      await user.save();
      await ctx.react('✅');
      return ctx.reply(V.kogen.charged(1));

    } catch (e) {
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *ERROR DE DESCARGA*\n\n> No pude descargar el repo 😵 Revisá que el link sea correcto.`);
    }
  });