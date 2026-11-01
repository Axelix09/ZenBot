import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

const DEFAULT_IMAGE = 'https://i.ibb.co/5QDyqvj/file-000000004c14720e98c391afa72db307.png';
const processedEvents = new Set();

function cleanJid(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    const pure = raw.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    return pure ? `${pure}@s.whatsapp.net` : null;
  }
  if (typeof raw === 'object' && raw !== null) {
    if (raw.phoneNumber) {
      const num = raw.phoneNumber.replace(/[^0-9]/g, '');
      return num ? `${num}@s.whatsapp.net` : null;
    }
    if (raw.id) {
      const id = typeof raw.id === 'string' ? raw.id : '';
      const pure = id.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
      return pure ? `${pure}@s.whatsapp.net` : null;
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
  const decos = ['✨', '🌟', '⭐', '💫', '🌈', '🎉', '🎊', '🌸', '🌺', '🌻'];
  return decos[Math.floor(Math.random() * decos.length)];
}

function getRandomMessage() {
  const msgs = [
    '¡Bienvenido/a! 🎉',
    '¡Nos alegra tenerte aquí! 🌟',
    '¡Qué bueno verte por aquí! ✨',
    '¡Bienvenido/a a la familia! 💫',
    '¡Un nuevo miembro se une! 🎊',
    '¡Esperamos que disfrutes tu estadía! 🌸',
    '¡La comunidad crece! 🚀'
  ];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

function getRandomFooter() {
  const footers = [
    'Disfruta y comparte con nosotros',
    'Somos una gran familia',
    'Tu presencia nos alegra',
    'Juntos somos más fuertes',
    'Bienvenido a casa',
    'Gracias por unirte a nosotros'
  ];
  return footers[Math.floor(Math.random() * footers.length)];
}

async function getBuffer(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
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

async function generateWelcomeVideo(userName, userId) {
  try {
    const num = userId.slice(-6);
    const formData = new FormData();
    formData.append('nome', userName);
    formData.append('num', num);
    formData.append('titulo', 'B I E N V E N I D O');

    const res = await fetch('https://zone.api.br/canvas/bemvindo2', {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(8000)
    });

    const json = await res.json();
    if (!json.status || !json.video) return null;

    const videoRes = await fetch(json.video, { signal: AbortSignal.timeout(8000) });
    if (!videoRes.ok) return null;
    return Buffer.from(await videoRes.arrayBuffer());
  } catch {
    return null;
  }
}

export default new ZenCommand('welcome')
  .addAlias('bienvenida', 'setwelcome', 'wel')
  .setCooldown(5)
  .setCategory('group')
  .requireGroup()
  .requireAdmin()
  .setUsage('on|off <mensaje>')
  .onExecute(async (ctx) => {
    const [modo, ...rest] = ctx.args;
    const group = await ctx.getGroup();

    if (!modo) {
      const estado = group.welcome ? '✅ Activado' : '❌ Desactivado';
      const msg = group.welcomeMsg || '✨ ¡Bienvenido/a %user al grupo %group! 🎉\n\n👥 Somos %count miembros';
      
      return ctx.reply(
        `『 📋 』 *CONFIGURACIÓN DE BIENVENIDA*\n\n` +
        `✦ *Estado:* ${estado}\n` +
        `✦ *Mensaje:*\n${msg}\n\n` +
        `✦ *Comandos:*\n` +
        `  • ${ZenConfig.prefix}${ctx.commandName} on ➜ Activar\n` +
        `  • ${ZenConfig.prefix}${ctx.commandName} off ➜ Desactivar\n` +
        `  • ${ZenConfig.prefix}${ctx.commandName} set [mensaje] ➜ Personalizar\n` +
        `  • ${ZenConfig.prefix}${ctx.commandName} test ➜ Probar mensaje\n\n` +
        `✦ *Variables:* %user, %group, %count`
      );
    }

    const sub = modo.toLowerCase();

    if (sub === 'on' || sub === 'activar') {
      group.welcome = true;
      if (!group.welcomeMsg) {
        group.welcomeMsg = '✨ ¡Bienvenido/a %user al grupo %group! 🎉\n\n👥 Somos %count miembros';
      }
      await group.save();
      await ctx.react('✅');
      return ctx.reply(`『 ✅ 』 *BIENVENIDA ACTIVADA*`);
    }

    if (sub === 'off' || sub === 'desactivar') {
      group.welcome = false;
      await group.save();
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *BIENVENIDA DESACTIVADA*`);
    }

    if (sub === 'set') {
      const msg = rest.join(' ');
      if (!msg) {
        return ctx.reply(
          `『 ⚠️ 』 *MENSAJE REQUERIDO*\n\n> Eso no me cierra 😵‍💫\n\n` +
          `> Ejemplo: *${ZenConfig.prefix}${ctx.commandName} set ✨ Bienvenido %user!*`
        );
      }
      group.welcomeMsg = msg;
      await group.save();
      await ctx.react('📝');
      return ctx.reply(`『 ✅ 』 *MENSAJE ACTUALIZADO*\n\n> ¡Listo! 🤩\n\n${msg}`);
    }

    if (sub === 'test') {
      const msg = group.welcomeMsg || '✨ ¡Bienvenido/a %user al grupo %group! 🎉\n\n👥 Somos %count miembros';
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
      `『 ⚠️ 』 *SUBCOMANDO INVÁLIDO*\n\n` +
      `> Creo que te faltó algo 🤔\n> Opciones: on, off, set, test`
    );
  });

export const welcomeListener = {
  async groupEvent(event, sock, ctx) {
    try {
      if (!ctx.isGroup) return;

      const isAdd = event.kind === 'participants' && event.action === 'add';
      if (!isAdd) return;

      const groupDb = await ctx.getGroup();
      if (!groupDb || !groupDb.welcome) return;

      const addedUsers = event.participants || [];
      if (!addedUsers.length) return;

      const eventKey = `${ctx.chat}-add-${addedUsers.map((user) => user.id).join(',')}`;
      if (processedEvents.has(eventKey)) return;
      processedEvents.add(eventKey);
      setTimeout(() => processedEvents.delete(eventKey), 5000);

      const metadata = await sock.groupMetadata(ctx.chat).catch(() => null);
      if (!metadata) return;

      const groupName = metadata.subject || 'Grupo';
      const totalMembers = metadata.participants?.length || 0;
      const botCanonicalJid = cleanJid(sock.user?.id);

      for (const raw of addedUsers) {
        const jid = cleanJid(raw);
        if (!jid || jid === botCanonicalJid) continue;

        const userId = getUserId(raw) || jid.split('@')[0];
        let userName = userId;

        try {
          const contact = await sock.contactQuery(jid);
          if (contact?.name) userName = contact.name;
          else if (contact?.shortName) userName = contact.shortName;
        } catch {}

        let welcomeMsg = groupDb.welcomeMsg || '✨ ¡Bienvenido/a %user al grupo %group! 🎉\n\n👥 Somos %count miembros';
        welcomeMsg = welcomeMsg
          .replace(/%user/g, userName)
          .replace(/%group/g, groupName)
          .replace(/%count/g, totalMembers);

        const deco = getRandomDecoration();
        const randomTitle = getRandomMessage();
        const randomFooter = getRandomFooter();

        const finalMsg = `${deco} ${randomTitle}\n\n${welcomeMsg}\n\n${randomFooter}`;

        let videoBuffer = await generateWelcomeVideo(userName, userId);

        if (videoBuffer) {
          await sock.sendMessage(ctx.chat, {
            video: videoBuffer,
            caption: finalMsg,
            gifPlayback: true,
            mentions: [jid]
          });
        } else {
          let imageUrl = groupDb.welcomeImage;
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
      }
    } catch (error) {
      console.error('[welcomeListener] Error:', error);
    }
  }
};