const active = new Set();

export const registerSubBot = (numero) => active.add(String(numero));
export const unregisterSubBot = (numero) => active.delete(String(numero));
export const activeSubBotNumbers = () => [...active];
