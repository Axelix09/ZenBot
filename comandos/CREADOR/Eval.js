import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import { inspect } from 'util';
import { UserModel, GroupModel } from '../../lib/database/adapter.js';
import { Soul } from '../../soul.js';
import axios from 'axios';
import fs from 'fs';
import sharp from 'sharp';

const get = async (url, opts = {}) => {
  const res = await axios.get(url, { timeout: 25000, ...opts });
  return res.data;
};

const post = async (url, body = {}, opts = {}) => {
  const res = await axios.post(url, body, { timeout: 25000, ...opts });
  return res.data;
};

export default new ZenCommand('eval')
  .addAlias('>', '=>', 'await', 'ejecutar')
  .setCooldown(1)
  .setCategory('Owner')
  .requireOwner()
  .setUsage('<código>')
  .onExecute(async (ctx) => {
    const text = ctx.args.join(' ').trim();
    if (!text) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *CÓDIGO REQUERIDO*\n\n` +
        `> Uy, algo no cuadra 🤨\n> Ejemplos de uso:\n` +
        `> \`${ZenConfig.prefix}eval 1 + 1\`\n` +
        `> \`${ZenConfig.prefix}eval await get('https://api.github.com')\`\n` +
        `> \`${ZenConfig.prefix}eval (await axios.get('https://...')).data\``
      );
    }

    await ctx.react('⏳');

    try {
      let script = text;
      const isStatement = /(^|\s)(const|let|var|if|for|while|switch|try|return)\b/.test(script) || script.includes(';');
      if (!isStatement) {
        script = `return (${script})`;
      }

      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const executor = new AsyncFunction(
        'ctx',
        'sock',
        'msg',
        'm',
        'ZenConfig',
        'UserModel',
        'GroupModel',
        'Soul',
        'axios',
        'get',
        'post',
        'fetch',
        'fs',
        'sharp',
        `return (async () => {\n${script}\n})()`
      );

      const result = await executor.call(
        ctx,
        ctx,
        ctx.sock,
        ctx.rawMsg,
        ctx.rawMsg,
        ZenConfig,
        UserModel,
        GroupModel,
        Soul,
        axios,
        get,
        post,
        fetch,
        fs,
        sharp
      );

      let output;
      if (result && typeof result === 'object') {
        try {
          output = JSON.stringify(result, (k, v) => (typeof v === 'bigint' ? v.toString() : v), 2);
        } catch {
          output = inspect(result, { depth: 4, maxArrayLength: 50 });
        }
      } else {
        output = typeof result === 'string' ? result : inspect(result, { depth: 3 });
      }

      await ctx.react('✅');

      if (output.length > 3500) {
        return ctx.sock.sendMessage(ctx.chat, {
          document: Buffer.from(output),
          mimetype: 'application/json',
          fileName: 'eval_resultado.json',
          caption: `『 📄 』 *RESPUESTA DE API (COMPLETA)*\n\n> El resultado supera los 3,500 caracteres, enviado como archivo JSON 😄`
        }, { quoted: ctx.rawMsg });
      }

      return ctx.reply(
        `『 📝 』 *EVAL*\n\n` +
        `> 📥 *Input:*\n\`\`\`js\n${text}\n\`\`\`\n\n` +
        `> 📤 *Output:*\n\`\`\`json\n${output || 'undefined'}\n\`\`\``
      );

    } catch (error) {
      await ctx.react('❌');

      let errorMsg = error.stack || error.message || String(error);

      if (error.response?.data) {
        try {
          const apiData = typeof error.response.data === 'object'
            ? JSON.stringify(error.response.data, null, 2)
            : error.response.data;
          errorMsg += `\n\n[API Response Data]:\n${apiData}`;
        } catch (_) {}
      }

      return ctx.reply(
        `『 ❌ 』 *ERROR EN EVAL*\n\n> Qué mala suerte 😢\n\n` +
        `> 📥 *Input:*\n\`\`\`js\n${text}\n\`\`\`\n\n` +
        `> ❌ *Error:*\n\`\`\`bash\n${errorMsg}\n\`\`\``
      );
    }
  });