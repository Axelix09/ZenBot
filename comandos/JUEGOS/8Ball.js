import { ZenCommand } from '../../lib/core/factory.js';
import { ZenConfig } from '../../zen.config.js';

const RESPUESTAS = [
  '✅ Sí, seguro 😎',
  '✅ Sin dudas 😌',
  '✅ Obvio que sí 😄',
  '✅ Podés contar con eso 😉',
  '🌀 Preguntá más tarde 😴',
  '🌀 Ahora no puedo decirte 🤐',
  '🌀 Concentrate y preguntá de nuevo 🧘',
  '🌀 Mejor no te lo digo ahora 😬',
  '❌ Ni en pedo 😂',
  '❌ Yo que vos no apostaría 😅',
  '❌ Muy dudoso 🤨',
  '❌ No cuentes con eso 😔'
];

export default new ZenCommand('8ball')
  .addAlias('bola8', 'prediccion')
  .setCooldown(3)
  .setCategory('Juegos')
  .requireRegistration()
  .setUsage('<pregunta>')
  .onExecute(async (ctx) => {
    const pregunta = ctx.args.join(' ');
    const prefix = ZenConfig.prefix;

    if (!pregunta) {
      await ctx.react('🎱');
      return ctx.reply(
        `『 🎱 』 *8-BALL*\n\n> Haceme una pregunta 🔮😏\n> _Ejemplo: ${prefix}8ball ¿Voy a tener suerte hoy?_`
      );
    }

    const respuesta = RESPUESTAS[Math.floor(Math.random() * RESPUESTAS.length)];
    await ctx.react('🎱');
    return ctx.reply(
      `『 🎱 』 *8-BALL*\n\n✦ *Pregunta:* ${pregunta}\n✦ *Respuesta:* ${respuesta}`
    );
  });