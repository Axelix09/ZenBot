import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import { renderHtmlCard, cardAsset } from '../../lib/cards/htmlCard.js';
import { SHOP_ITEM_IMAGES } from '../../lib/game/assetUrls.js';

const ITEMS = [
  { id: 'sword',   n: '⚔️ Espada de Honor',   v: 3000,  cat: 'sword',   lim: 5, desc: 'Otorga +15% de daño en duelos (Se consume por combate).' },
  { id: 'potion',  n: '🧪 Poción de Vida',    v: 2500,  cat: 'potion',  lim: 5, desc: 'Inicias el duelo con 200 PV en lugar de 100 (Se consume por combate).' },
  { id: 'suit',    n: '👔 Capa de Magnate',   v: 5000,  cat: 'suit',    lim: 5, desc: `Bono pasivo de +20% ${ZenConfig.currencies.zencoins.name} al trabajar (1 uso diario).` },
  { id: 'mask',    n: '👺 Máscara Hacker',    v: 7500,  cat: 'mask',    lim: 5, desc: 'Bono pasivo de 30% éxito al cometer un crimen (1 uso diario).' },
  { id: 'astucia',  n: '⚡ Poción de Astucia',  v: 8000,  cat: 'astucia', lim: 3, desc: 'Aumenta +15% de éxito al asaltar por 15 minutos.' },
  { id: 'codicia',  n: '💰 Poción de Codicia',  v: 12000, cat: 'codicia', lim: 3, desc: 'Incrementa en un 15% el monto total robado por 15 minutos.' },
  { id: 'refugio',  n: '🛡️ Poción de Refugio',  v: 15000, cat: 'refugio', lim: 3, desc: 'Los robos exitosos activan un escudo de 10 minutos por 15 minutos.' }
];

export default new ZenCommand('tienda')
  .addAlias('shop', 'pociones', 'alquimia', 'buy', 'comprar')
  .setCooldown(5)
  .setCategory('Economía')
  .requireRegistration()
  .setUsage('<comprar> <item>')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();

    if (user.loans?.blockedPermanently) {
      await ctx.react('🚫');
      return ctx.reply(
        V.blocked.permanent(user)
      );
    }

    if (user.loans?.isBlocked && !user.loans?.isPromised) {
      await ctx.react('🔒');
      return ctx.reply(
        V.blocked.debt(user)
      );
    }

    const [action, target] = ctx.args;
    const now = Date.now();

    if (!user.dailyStats) user.dailyStats = {};
    if (!user.inventory) user.inventory = {};

    if (!user.dailyStats.shopReset || now - user.dailyStats.shopReset >= 86400000) {
      user.dailyStats.shopReset = now;
      Object.keys(user.dailyStats).forEach(key => {
        if (key.startsWith('buy_')) {
          user.dailyStats[key] = 0;
        }
      });
      if (typeof user.markModified === 'function') {
        user.markModified('dailyStats');
      }
    }

    if (!action) {
      await ctx.react('🛒');
      let txt = `『 🛒 』 *TIENDA ZEN*\n\n` +
                `✦ *Fondos:* ${user.zencoins} ${ZenConfig.currencies.zencoins.emoji}\n\n` +
                `✦ *EQUIPAMIENTO DE COMBATE*\n`;

      ITEMS.slice(0, 2).forEach((item, i) => {
        const currentCount = user.dailyStats[`buy_${item.cat}`] || 0;
        txt += `  • *${item.n}* [${item.id}] [${currentCount}/${item.lim}]\n    Costo: ${item.v} ${ZenConfig.currencies.zencoins.emoji}\n    _${item.desc}_\n\n`;
      });

      txt += `✦ *BONOS PASIVOS*\n`;
      ITEMS.slice(2, 4).forEach((item, i) => {
        const currentCount = user.dailyStats[`buy_${item.cat}`] || 0;
        txt += `  • *${item.n}* [${item.id}] [${currentCount}/${item.lim}]\n    Costo: ${item.v} ${ZenConfig.currencies.zencoins.emoji}\n    _${item.desc}_\n\n`;
      });

      txt += `✦ *ELÍXIRES TEMPORALES*\n`;
      ITEMS.slice(4).forEach((item, i) => {
        const currentCount = user.dailyStats[`buy_${item.cat}`] || 0;
        txt += `  • *${item.n}* [${item.id}] [${currentCount}/${item.lim}]\n    Costo: ${item.v} ${ZenConfig.currencies.zencoins.emoji}\n    _${item.desc}_\n\n`;
      });

      txt += `> _Uso: ${ZenConfig.prefix}${ctx.commandName} comprar [id]_`;
      try {
        const card = await renderHtmlCard({
          eyebrow: `${ZenConfig.botName.toUpperCase()} · MERCADO`,
          title: 'Tienda Zen',
          subtitle: `Fondos disponibles: ${user.zencoins} ${ZenConfig.currencies.zencoins.emoji} · compra con ${ZenConfig.prefix}tienda comprar [id]`,
          accent: '#22d3ee',
          accent2: '#8b5cf6',
          art: cardAsset('rpg-hunter.png'),
          stats: [
            { label: 'Fondos', value: `${user.zencoins} ZC`, note: 'saldo actual' },
            { label: 'Artículos', value: String(ITEMS.length), note: 'disponibles' },
            { label: 'Límite', value: 'Diario', note: 'por artículo' }
          ],
          rows: ITEMS.map((item) => ({
            label: `${item.n} [${item.id}]`,
            value: `${item.v} ${ZenConfig.currencies.zencoins.emoji}`
          })),
          caption: 'Los límites se reinician cada 24 horas'
        });
        return ctx.sock.sendMessage(ctx.chat, { image: card, caption: txt }, { quoted: ctx.rawMsg });
      } catch (error) {
        if (process.env.DEBUG) console.debug('[shop card] fallback:', error.message);
        return ctx.reply(txt);
      }
    }

    const sub = action.toLowerCase();

    if (sub === 'comprar' || sub === 'buy') {
      if (!target) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *ID REQUERIDA*\n\n> Indicá el ID del artículo 😵‍💫`);
      }

      const index = parseInt(target, 10) - 1;
      const item = (!isNaN(index) && ITEMS[index]) 
        ? ITEMS[index] 
        : ITEMS.find(it => it.id === target.toLowerCase() || it.cat === target.toLowerCase());

      if (!item) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *ARTÍCULO NO ENCONTRADO*\n\n> Busqué y nada 🥲\n> ID: *${target}* no es válido.`);
      }

      const currentCount = user.dailyStats[`buy_${item.cat}`] || 0;
      if (currentCount >= item.lim) {
        await ctx.react('🚫');
        return ctx.reply(`『 🚫 』 *LÍMITE ALCANZADO*\n\n> ${item.lim}/${item.lim} compras diarias 😉`);
      }

      if (user.zencoins < item.v) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *SALDO INSUFICIENTE*\n\n> Uf, así no se puede 😬\n> Costo: ${item.v} ${ZenConfig.currencies.zencoins.emoji} (Tenés: ${user.zencoins})`);
      }

      if (['suit', 'mask'].includes(item.id) && user.inventory[item.id]) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *YA POSEÍDO*\n\n> Ya tenés este artículo en tu inventario 🤨`);
      }

      user.zencoins -= item.v;
      user.dailyStats[`buy_${item.cat}`] = currentCount + 1;

      if (['suit', 'mask'].includes(item.id)) {
        user.inventory[item.id] = true;
      } else if (['sword', 'potion'].includes(item.id)) {
        user.inventory[item.id] = (user.inventory[item.id] || 0) + 1;
      } else {
        const buffKey = item.id === 'astucia' ? 'precision' : item.id === 'codicia' ? 'codicia' : 'escudo_activo';
        if (!user.cooldowns) user.cooldowns = {};
        user.cooldowns[`buff_${buffKey}_until`] = now + (15 * 60 * 1000);
      }

      if (typeof user.markModified === 'function') {
        user.markModified('dailyStats');
        user.markModified('inventory');
        user.markModified('cooldowns');
      }

      await user.save();
      await ctx.react('✨');

      const purchaseText =
        `『 ✨ 』 *COMPRA EXITOSA*\n\n` +
        `✦ *Artículo:* ${item.n}\n✦ *Precio:* ${item.v} ${ZenConfig.currencies.zencoins.emoji}\n✦ *Balance:* ${currentCount + 1}/${item.lim}\n\n` +
        `> _Usa *${ZenConfig.prefix}miequipo* para ver tu inventario 🥳_`;

      const itemImage = SHOP_ITEM_IMAGES[item.id];
      if (itemImage) {
        return ctx.sock.sendMessage(ctx.chat, {
          image: { url: itemImage },
          caption: purchaseText,
          mentions: [ctx.sender]
        }, { quoted: ctx.rawMsg });
      }

      return ctx.reply(purchaseText);
    }

    await ctx.react('⚠️');
    return ctx.reply(`『 ⚠️ 』 *ACCIÓN INVÁLIDA*\n\n> Uy, algo no cuadra 🤨\n> Usá: *${ZenConfig.prefix}${ctx.commandName} comprar [id]*`);
  });
