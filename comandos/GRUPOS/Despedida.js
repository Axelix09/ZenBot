import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

const DEFAULT_IMAGE = 'https://i.ibb.co/5QDyqvj/file-000000004c14720e98c391afa72db307.png';
const processedEvents = new Set();

function cleanJid(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    if (raw.includes('@')) return raw;
    return raw + '@s.whatsapp.net';
  }
  if (typeof raw === 'object' && raw !== null) {
    if (raw.phoneNumber) {
      const num = raw.phoneNumber.replace(/[^0-9]/g, '');
      return num + '@s.whatsapp.net';
    }
    if (raw.id) {
      const id = typeof raw.id === 'string' ? raw.id : '';
      if (id.includes('@')) return id;
      return id + '@s.whatsapp.net';
    }
  }
  return null;
}

function getUserId(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    return raw.replace(/[^0-9]/g, '');
  }
  if (typeof raw === 'object' && raw !== null) {
    if (raw.id) {
      const id = typeof raw.id === 'string' ? raw.id : '';
      return id.replace(/[^0-9]/g, '');
    }
    if (raw.phoneNumber) {
      return raw.phoneNumber.replace(/[^0-9]/g, '');
    }
  }
  return null;
}

function getRandomDecoration() {
  const decos = ['💫', '🌅', '🌙', '⭐', '🌊', '🍃', '🌿', '🌸', '💨', '🌺'];
  return decos[Math.floor(Math.random() * decos.length)];
}

function getRandomMessage() {
  const msgs = [
    '¡Hasta luego! 👋',
    '¡Nos vemos pronto! 🌟',
    '¡Qué pena que te vayas! 💫',
    '¡Siempre serás bienvenido/a! 🌈',
    '¡Te extrañaremos! 💙',
    '¡Buena suerte en tu camino! 🍀',
    '¡Gracias por haber estado con nosotros! 🌸'
  ];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

function getRandomFooter() {
  const footers = [
    'La puerta siempre estará abierta para ti',
    'Te recordaremos con cariño',
    'Esperamos verte de vuelta pronto',
    'Siempre serás parte de nuestra familia',
    'Te deseamos lo mejor',
    'Gracias por tu tiempo con nosotros'
  ];
  return footers[Math.floor(Math.random() * footers.length)];
}

async function getBuffer(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

async function getProfilePic(sock, jid) {
  try {
    return await sock.profile.pictureUrl(jid, 'image');
  } catch {
    return null;
  }
}

export default new ZenCommand('goodbye')
  .addAlias('despedida', 'setgoodbye', 'bye')
  .setCooldown(5)
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .setUsage('on|off <mensaje>')
  .onExecute(async (ctx) => {
    const [modo, ...rest] = ctx.args;
    const group = await ctx.getGroup();

    if (!modo) {
      const estado = group.goodbye ? '✅ Activado' : '❌ Desactivado';
      const msg = group.goodbyeMsg || '👋 %user ha salido del grupo. ¡Hasta luego!';
      const img = group.goodbyeImage || '📸 Foto de perfil del usuario';
      
      return ctx.reply(
        `『 📋 』 *CONFIGURACIÓN DE DESPEDIDA*\n\n` +
        `✦ *Estado:* ${estado}\n` +
        `✦ *Imagen:* ${img}\n` +
        `✦ *Mensaje:*\n${msg}\n\n` +
        `✦ *Comandos:*\n` +
        `  • ${ZenConfig.prefix}${ctx.commandName} on ➜ Activar\n` +
        `  • ${ZenConfig.prefix}${ctx.commandName} off ➜ Desactivar\n` +
        `  • ${ZenConfig.prefix}${ctx.commandName} set [mensaje] ➜ Personalizar\n` +
        `  • ${ZenConfig.prefix}${ctx.commandName} image [url] ➜ Cambiar imagen\n` +
        `  • ${ZenConfig.prefix}${ctx.commandName} test ➜ Probar mensaje\n\n` +
        `✦ *Variables:* %user, %group, %count`
      );
    }

    const sub = modo.toLowerCase();

    if (sub === 'on' || sub === 'activar') {
      group.goodbye = true;
      if (!group.goodbyeMsg) {
        group.goodbyeMsg = '👋 %user ha salido del grupo. ¡Hasta luego!';
      }
      await group.save();
      await ctx.react('✅');
      return ctx.reply(`『 ✅ 』 *DESPEDIDA ACTIVADA*`);
    }

    if (sub === 'off' || sub === 'desactivar') {
      group.goodbye = false;
      await group.save();
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *DESPEDIDA DESACTIVADA*`);
    }

    if (sub === 'set') {
      const msg = rest.join(' ');
      if (!msg) {
        return ctx.reply(
          `『 ⚠️ 』 *MENSAJE REQUERIDO*\n\n> Eso no me cierra 😵‍💫\n\n` +
          `> Ejemplo: *${ZenConfig.prefix}${ctx.commandName} set 👋 %user nos deja!*`
        );
      }
      group.goodbyeMsg = msg;
      await group.save();
      await ctx.react('📝');
      return ctx.reply(`『 ✅ 』 *MENSAJE ACTUALIZADO*\n\n> ¡Qué crack! 🥳\n\n${msg}`);
    }

    if (sub === 'image' || sub === 'img') {
      const url = rest[0];
      if (!url) {
        return ctx.reply(
          `『 ⚠️ 』 *URL REQUERIDA*\n\n` +
          `> Creo que te faltó algo 🤔\n> Ejemplo: *${ZenConfig.prefix}${ctx.commandName} image https://i.ibb.co/xxx.jpg*`
        );
      }
      if (url.toLowerCase() === 'default') {
        group.goodbyeImage = null;
        await group.save();
        await ctx.react('🖼️');
        return ctx.reply(`『 🖼️ 』 *IMAGEN POR DEFECTO*\n\n> Se usará la foto de perfil del usuario 😉`);
      }
      group.goodbyeImage = url;
      await group.save();
      await ctx.react('🖼️');
      return ctx.reply(`『 ✅ 』 *IMAGEN ACTUALIZADA*\n\n> ¡Eso estuvo bueno! 😄\n\n${url}`);
    }

    if (sub === 'test') {
      const msg = group.goodbyeMsg || '👋 %user ha salido del grupo. ¡Hasta luego!';
      const metadata = await ctx.sock.groupMetadata(ctx.chat).catch(() => null);
      const groupName = metadata?.subject || 'Este grupo';
      const totalMembers = metadata?.participants?.length || 0;
      
      let testMsg = msg
        .replace(/%user/g, 'UsuarioPrueba')
        .replace(/%group/g, groupName)
        .replace(/%count/g, totalMembers);

      const deco = getRandomDecoration();
      const randomTitle = getRandomMessage();
      const randomFooter = getRandomFooter();

      const finalMsg = `${deco} ${randomTitle}\n\n${testMsg}\n\n${randomFooter}`;

      await ctx.react('🧪');
      return ctx.reply(finalMsg);
    }

    return ctx.reply(
      `『 ⚠️ 』 *SUBCOMANDO INVÁLIDO*\n\n> Revisá cómo lo escribiste 🧐\n\n` +
      `> Revisá cómo lo escribiste 🧐\n> Opciones: on, off, set, image, test`
    );
  });

export const goodbyeListener = {
  async groupEvent(event, sock, ctx) {
    try {
      if (!ctx.isGroup) return;

      const isRemove = event.kind === 'participants' && (event.action === 'remove' || event.action === 'leave');
      if (!isRemove) return;

      const groupDb = await ctx.getGroup();
      if (!groupDb || !groupDb.goodbye) return;

      const removedUsers = event.participants || [];
      if (!removedUsers.length) return;

      const eventKey = `${ctx.chat}-remove-${removedUsers.map((user) => user.id).join(',')}`;
      if (processedEvents.has(eventKey)) return;
      processedEvents.add(eventKey);
      setTimeout(() => processedEvents.delete(eventKey), 5000);

      const metadata = await sock.groupMetadata(ctx.chat).catch(() => null);
      if (!metadata) return;

      const groupName = metadata.subject || 'Grupo';
      const totalMembers = metadata.participants?.length || 0;

      for (const raw of removedUsers) {
        const jid = cleanJid(raw);
        if (!jid) continue;
        if (jid === sock.user.id) continue;

        const userId = getUserId(raw) || jid.split('@')[0];
        let userName = userId;

        try {
          const contact = await sock.contactQuery(jid);
          if (contact?.name) userName = contact.name;
          else if (contact?.shortName) userName = contact.shortName;
        } catch {}

        let goodbyeMsg = groupDb.goodbyeMsg || '👋 %user ha salido del grupo. ¡Hasta luego!';
        goodbyeMsg = goodbyeMsg
          .replace(/%user/g, userName)
          .replace(/%group/g, groupName)
          .replace(/%count/g, totalMembers);

        const deco = getRandomDecoration();
        const randomTitle = getRandomMessage();
        const randomFooter = getRandomFooter();

        const finalMsg = `${deco} ${randomTitle}\n\n${goodbyeMsg}\n\n${randomFooter}`;

        let imageUrl = groupDb.goodbyeImage;
        let imageBuffer = null;

        if (!imageUrl) {
          try {
            const userImage = await getProfilePic(sock, jid);
            if (userImage) imageUrl = userImage;
          } catch {}
        }

        if (!imageUrl) imageUrl = DEFAULT_IMAGE;

        imageBuffer = await getBuffer(imageUrl);

        if (imageBuffer) {
          await sock.sendMessage(ctx.chat, {
            image: imageBuffer,
            caption: finalMsg,
            mentions: [jid]
          });
        } else {
          await sock.sendMessage(ctx.chat, {
            text: finalMsg,
            mentions: [jid]
          });
        }
      }
    } catch (error) {
      console.error('[goodbyeListener] Error:', error);
    }
  }
};
