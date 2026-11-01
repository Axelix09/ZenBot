export const sendAlbum = async (ctx, loaders, { onError } = {}) => {
  const loaded = await Promise.all(loaders.map(async (load, index) => {
    try {
      return await load(index);
    } catch (error) {
      onError?.(error, index);
      return null;
    }
  }));

  const items = loaded.filter((item) => item && (item.image || item.video));
  if (!items.length) return null;

  const options = { quoted: ctx.rawMsg };
  if (items.length === 1) return ctx.sock.sendMessage(ctx.chat, items[0], options);
  return ctx.sock.sendAlbum(ctx.chat, items.slice(0, 30), options);
};
