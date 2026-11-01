import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), 'tmp');

export default new ZenCommand('htmlextract')
  .addAlias('html', 'source')
  .setCooldown(10)
  .setCategory('tools')
  .requireRegistration()
  .setUsage('<url>')
  .onExecute(async (ctx) => {
    const [url] = ctx.args;
    const prefix = ZenConfig.prefix;

    if (!url) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *URL REQUERIDA*\n\n` +
        `> Indicá la URL para extraer el código HTML 😵‍💫\n` +
        `> _Ejemplo: ${prefix}html https://example.com_`
      );
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *URL INVÁLIDA*\n\n` +
        `> La URL debe comenzar con *http://* o *https://* 🤔`
      );
    }

    await ctx.react('⏳');

    try {
      const res = await axios.get(`https://api.delirius.store/tools/htmlextract?url=${encodeURIComponent(url)}`);
      if (!res.data?.html) throw new Error();

      if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
      const filePath = path.join(TMP_DIR, `html_${Date.now()}.txt`);
      fs.writeFileSync(filePath, res.data.html);

      const buffer = fs.readFileSync(filePath);
      await ctx.sock.sendMessage(ctx.chat, {
        document: buffer,
        fileName: 'html_extract.txt',
        mimetype: 'text/plain',
        caption: `『 📄 』 *HTML EXTRAÍDO*\n\n> 🔗 ${url}`
      }, { quoted: ctx.rawMsg });

      fs.unlinkSync(filePath);
      await ctx.react('✅');
    } catch {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR AL EXTRAER HTML*\n\n` +
        `> No pude extraer el código HTML. Verificá que la URL sea válida 😵`
      );
    }
  });