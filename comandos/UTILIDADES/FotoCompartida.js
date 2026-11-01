import { ZenCommand } from '../../lib/core/factory.js';
import axios from 'axios';

export default new ZenCommand('ppcp')
  .addAlias('ppcouple')
  .setCooldown(5)
  .setCategory('tools')
  .requireRegistration()
  .onExecute(async (ctx) => {
    await ctx.react('💑');

    try {
      const res = await axios.get('https://raw.githubusercontent.com/ShirokamiRyzen/WAbot-DB/main/fitur_db/ppcp.json');
      const cita = res.data[Math.floor(Math.random() * res.data.length)];
      
      const cowo = (await axios.get(cita.cowo, { responseType: 'arraybuffer' })).data;
      await ctx.sock.sendMessage(ctx.chat, { 
        image: cowo, 
        caption: `『 💑 』 *PAREJA - MASCULINO*\n\n> ♂️ Foto de perfil masculina` 
      }, { quoted: ctx.rawMsg });
      
      const cewe = (await axios.get(cita.cewe, { responseType: 'arraybuffer' })).data;
      await ctx.sock.sendMessage(ctx.chat, { 
        image: cewe, 
        caption: `『 💑 』 *PAREJA - FEMENINO*\n\n> ♀️ Foto de perfil femenina` 
      }, { quoted: ctx.rawMsg });
      
      await ctx.react('✅');
    } catch {
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR AL OBTENER IMÁGENES*\n\n` +
        `> No pude obtener las imágenes de pareja 😢`
      );
    }
  });