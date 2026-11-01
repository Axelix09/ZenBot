import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';
import PDFDocument from 'pdfkit';
import { createWriteStream, readFileSync } from 'fs';
import { rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const tmp = () => join(tmpdir(), `pdf_${Date.now()}.pdf`);
const clean = async p => { if (p) await rm(p, { force: true }).catch(() => {}); };

export default new ZenCommand('topdf')
  .addAlias('crearpdf', 'createpdf', 'criarpdf')
  .setCooldown(5)
  .setCategory('convertidores')
  .requireRegistration()
  .setUsage('<texto>')
  .onExecute(async (ctx) => {
    const command = ctx.commandName.toLowerCase();
    const text = ctx.args.join(' ');
    const prefix = ZenConfig.prefix;
    const quoted = ctx.rawMsg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (command === 'crearpdf' || command === 'createpdf' || command === 'criarpdf') {
      if (!text) {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *TEXTO REQUERIDO*\n\n` +
          `> Indicá el texto para crear el PDF 🤨\n` +
          `> _Ejemplo: ${prefix}crearpdf Hola mundo_`
        );
      }

      await ctx.react('⏳');
      let o = tmp();

      try {
        await new Promise((res, rej) => {
          const doc = new PDFDocument();
          const s = createWriteStream(o);
          doc.pipe(s);
          doc.fontSize(14).text(text, { lineGap: 4 });
          doc.end();
          s.on('finish', res);
          s.on('error', rej);
        });
        await ctx.react('✅');
        return ctx.sock.sendMessage(ctx.chat, {
          document: readFileSync(o),
          mimetype: 'application/pdf',
          fileName: 'documento.pdf',
          caption: `📄 *PDF CREADO*\n\n> Aquí tenés tu documento.`
        }, { quoted: ctx.rawMsg });
      } catch {
        await ctx.react('❌');
        return ctx.reply(
          `『 ❌ 』 *ERROR AL CREAR PDF*\n\n` +
          `> No pude crear el documento 😤`
        );
      } finally { await clean(o); }
    }

    if (!quoted) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *IMAGEN REQUERIDA*\n\n` +
        `> Respondé a una imagen para convertirla a PDF 😵‍💫`
      );
    }

    const mtype = Object.keys(quoted)[0] || '';
    const mediaMsg = quoted[mtype];
    const mime = mediaMsg?.mimetype || '';

    if (!/image/i.test(mime)) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *IMAGEN REQUERIDA*\n\n` +
        `> Solo se soportan imágenes para convertir a PDF 😵‍💫`
      );
    }

    await ctx.react('⏳');
    let o = tmp();

    try {
      const buffer = Buffer.from(await ctx.sock.downloadMedia(mediaMsg, 'image'));

      await new Promise((res, rej) => {
        const doc = new PDFDocument({ size: [595, 842] });
        const s = createWriteStream(o);
        doc.pipe(s);
        doc.image(buffer, 0, 0, { fit: [595, 842], align: 'center', valign: 'center' });
        doc.end();
        s.on('finish', res);
        s.on('error', rej);
      });

      await ctx.react('✅');
      return ctx.sock.sendMessage(ctx.chat, {
        document: readFileSync(o),
        mimetype: 'application/pdf',
        fileName: 'imagen.pdf',
        caption: `📄 *PDF CREADO*\n\n> Aquí tenés tu PDF.`
      }, { quoted: ctx.rawMsg });
    } catch {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR AL CONVERTIR*\n\n` +
        `> No pude pasar la imagen a PDF 😖 Probá de nuevo.`
      );
    } finally { await clean(o); }
  });