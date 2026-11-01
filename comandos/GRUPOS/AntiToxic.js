import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

const TOXIC_WORDS = ["puta","mierda","cabron","idiota","pendejo","imbecil","estupido","tarado","gilipollas","pelotudo","forro","boludo","culiao","hdp","concha","pija","verga","choto","maricon","puto","zorra","perra","cagon","sorete","inutil","baboso","patan","payaso","ridiculo","tonto","bobo","menso","weon","huevon","pendeja","cabrona","mierdoso","asqueroso","malparido","coño","carajo","chingada","chingado","chingar","culero","culera","maldito","maldita","malnacido","malnacida","estupida","idiotas","estupidos","estupidas","tarados","pelotudos","forros","boludos","culiaos","maricas","maricones","putas","putos","zorras","perras","cagones","soretes","babosos","patanes","payasos","ridiculos","bobos","mensos","pene","nepe","gore","mierdosos","asquerosos","malparidos","culeros","culeras","malditos","malditas","malnacidos","malnacidas","pajero","pajeros","pajera","callate","cornudo","cornuda","cornudos","cornudas","chupapija","chupapijas","chupaverga","chupaculo","chupaculos","chupapollas","chupapolla","chupapollos","cojudo","cojuda","cojudos","cojudas","imbecil","mrd","imbeciles","imbecilidades","estupidez","estupideces","idiotez","idioteces","taradez","taradeces","gil","giles","gilazo","gilazos","ano","anal","mongolico","mongolica","mongolicos","mongolicas","mongolo","mongola","mongolos","mongolas","animal","animales","basura","basurita","burro","burros","burra","burras","feo","matate","putita","putito","cerdo","cerdos","cerda","cerdas","chancho","chanchos","chancha","chanchas","perro","perros","rata","ratas","raton","ratones","ratona","ratonas","hdpt","suicidate","estorbo","salame","bitch","vibora","viboras","gay","lesbiana"];
const MAX_WARNS = 5;

const esToxic = (text) => {
  if (!text) return false;

  let t = text.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const leetMap = {
    '4': 'a', '@': 'a', '1': 'i', '!': 'i', '3': 'e', '0': 'o', 
    '7': 't', '$': 's', '5': 's', 'v': 'u', '8': 'b', '9': 'g'
  };
  
  let decoded = '';
  for (const char of t) {
    decoded += leetMap[char] || char;
  }

  const words = decoded.split(/[\s_\-\d\.\,\*\/\\@#\$%^&()!+=?;:"']+/).filter(Boolean);
  const exactMatch = words.some(w => TOXIC_WORDS.includes(w));
  if (exactMatch) return true;

  let collapsed = decoded.replace(/[\s_\-\d\.\,\*\/\\@#\$%^&()!+=?;:"']/g, '');
  let compressed = collapsed.replace(/(.)\1+/g, '$1');

  return TOXIC_WORDS.some(badWord => {
    if (badWord.length < 3) return false;
    return compressed.includes(badWord);
  });
};

export default new ZenCommand('antitoxic')
  .setCooldown(3)
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .setUsage('on|off')
  .onExecute(async (ctx) => {
    const [modo] = ctx.args;
    const group = await ctx.getGroup();

    if (!modo || !['on', 'activar', 'off', 'desactivar'].includes(modo.toLowerCase())) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *MODO INVÁLIDO*\n\n> Eso no me cierra 😵‍💫\n\n` +
        `✦ *Opciones:*\n` +
        `  • ${ZenConfig.prefix}${ctx.commandName} on / activar\n` +
        `  • ${ZenConfig.prefix}${ctx.commandName} off / desactivar`
      );
    }

    const activar = ['on', 'activar'].includes(modo.toLowerCase());
    group.antitoxic = activar;
    await group.save();

    await ctx.react('🚫');
    return ctx.reply(
      `『 🚫 』 *ANTI-TOXIC ${activar ? 'ACTIVADO' : 'DESACTIVADO'}*\n\n` +
      `> El lenguaje tóxico será ${activar ? 'detectado y sancionado' : 'permitido'} en este grupo 😎`
    );
  });

export const antiToxicListener = {
  async before(msg, sock, ctx) {
    if (!ctx.isGroup || ctx.rawMsg.key.fromMe) return;
    const groupDb = await ctx.getGroup();
    if (!groupDb?.antitoxic) return;

    const mtype = ctx.rawMsg.message ? Object.keys(ctx.rawMsg.message)[0] : '';
    const text = ctx.rawMsg.message?.conversation || ctx.rawMsg.message?.extendedTextMessage?.text || ctx.rawMsg.message?.[mtype]?.caption || '';
    if (!text || !esToxic(text)) return;

    const ownerJids = ZenConfig.ownerNumbers.map(n => n.replace(/[^0-9]/g, '') + '@s.whatsapp.net');
    const isOwner = ownerJids.includes(ctx.sender);
    const isAdmin = await ctx.isSenderAdmin();
    if (isAdmin || isOwner) return;

    const isBotAdmin = await ctx.isBotAdmin();
    if (!isBotAdmin) return;

    const senderNum = ctx.sender.split('@')[0];

    try { await sock.sendMessage(ctx.chat, { delete: ctx.rawMsg.key }); } catch {}

    const userDb = await ctx.getUser();
    if (!userDb.warns) userDb.warns = {};
    const chatKey = `tox_${ctx.chat.replace(/\./g, '_')}`;
    const currentWarns = (userDb.warns[chatKey] || 0) + 1;

    if (currentWarns >= MAX_WARNS) {
      delete userDb.warns[chatKey];
      if (typeof userDb.markModified === 'function') userDb.markModified('warns');
      await userDb.save();

      try { await sock.groups.kick(ctx.chat, [ctx.sender]); } catch {}
      await sock.sendMessage(ctx.chat, {
        text: `『 🚫 』 *BANEADO POR TOXICIDAD*\n\n> @${senderNum} fue expulsado tras acumular *${MAX_WARNS} advertencias* por lenguaje vulgar en este grupo 🙂`,
        mentions: [ctx.sender]
      });
    } else {
      userDb.warns[chatKey] = currentWarns;
      if (typeof userDb.markModified === 'function') userDb.markModified('warns');
      await userDb.save();

      await sock.sendMessage(ctx.chat, {
        text: `『 ⚠️ 』 *LENGUAJE TÓXICO DETECTADO*\n\n> @${senderNum}, he eliminado tu mensaje 😉\n> *Advertencias en este grupo:* ${currentWarns} / ${MAX_WARNS}`,
        mentions: [ctx.sender]
      });
    }
  }
};