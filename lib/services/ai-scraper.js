import axios from 'axios';

const KILO_API_URL = 'https://api.kilo.ai/api/gateway/chat/completions';
const KILO_MODEL = 'kilo-auto/free';

async function traducir(texto, target = 'es') {
  if (!texto) return '';
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(texto)}`;
    const { data } = await axios.get(url, { timeout: 6000 });
    if (data && data[0]) return data[0].map((sentencia) => sentencia[0]).join('');
  } catch {}
  return texto;
}

function limpiar(texto) {
  if (!texto) return '';
  let limpio = typeof texto === 'object'
    ? String(texto.response ?? texto.answer ?? texto.result ?? JSON.stringify(texto))
    : String(texto);
  limpio = limpio.replace(/\u001c[\s\S]*$/g, '');
  limpio = limpio.replace(/<think>[\s\S]*?<\/think>/g, '');
  limpio = limpio.replace(/\*\*/g, '*');
  limpio = limpio.replace(/\n{3,}/g, '\n\n');
  return limpio.trim();
}

async function keyra(endpoint, params, resultKey) {
  const url = `https://www.keyrafara.com${endpoint}`;
  const { data } = await axios.get(url, { params, timeout: 15000 });
  if (data?.status !== true) throw new Error(`Respuesta inválida de Keyra (${endpoint})`);
  let bruto = data.result;
  if (resultKey && bruto && typeof bruto === 'object') bruto = bruto[resultKey];
  return limpiar(bruto);
}

async function kilo(promptIdentidad, query) {
  const payload = {
    model: KILO_MODEL,
    messages: [
      { role: 'system', content: `${promptIdentidad} Respondé siempre en español, de forma completa y directa, sin mencionar que sos otro modelo.` },
      { role: 'user', content: query }
    ],
    temperature: 0.7
  };
  try {
    const { data } = await axios.post(KILO_API_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    });
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Sin contenido en la respuesta de Kilo');
    return limpiar(await traducir(content, 'es'));
  } catch (err) {
    try {
      const url = `https://text.pollinations.ai/${encodeURIComponent(query + ' (Respondé en español)')}?model=openai`;
      const { data } = await axios.get(url, { timeout: 8000 });
      if (typeof data === 'string' && !data.includes('Payment Required')) {
        return limpiar(await traducir(data, 'es'));
      }
    } catch {}
    throw new Error(`Error de conexión con la IA (Kilo): ${err.message}`);
  }
}

async function imagenBuffer(prompt, model) {
  const url = 'https://www.keyrafara.com/ai/image';
  const { data } = await axios.get(url, {
    params: { prompt, model },
    responseType: 'arraybuffer',
    timeout: 25000
  });
  if (!data) throw new Error(`Sin datos de imagen para el modelo ${model}`);
  return Buffer.from(data, 'binary');
}

export async function gemini(query) {
  return keyra('/ai/gemini', { text: query }, null);
}

export async function copilot(query) {
  return keyra('/ai/copilot', { text: query }, null);
}

export async function gpt(query) {
  return keyra('/ai/gpt', { text: query }, null);
}

export async function chatgptAuto(query) {
  return keyra('/ai/chatgpt', { query, model: 'auto' }, 'answer');
}

export async function gpt5_5(query) {
  return keyra('/ai/chatgpt', { query, model: 'gpt-5-5' }, 'answer');
}

export async function gpt5_3(query) {
  return keyra('/ai/chatgpt', { query, model: 'gpt-5-3' }, 'answer');
}

export async function gpt5_mini(query) {
  return keyra('/ai/chatgpt', { query, model: 'gpt-5-mini' }, 'answer');
}

export async function gpt5_3_mini(query) {
  return keyra('/ai/chatgpt', { query, model: 'gpt-5-3-mini' }, 'answer');
}

export async function claude(query) {
  return keyra('/ai/claude-opus', { text: query }, null);
}

export async function mistral(query) {
  return keyra('/ai/mistral', { text: query }, null);
}

export async function apertus(query) {
  return keyra('/ai/apertus', { text: query }, null);
}

export async function jeeves(query) {
  return keyra('/ai/jeeves', { text: query }, null);
}

export async function krishna(query) {
  return keyra('/ai/krishna', { text: query }, null);
}

export async function overchat(query) {
  return keyra('/ai/overchat', { text: query }, null);
}

export async function quillbot(query) {
  return keyra('/ai/quillbot', { prompt: query }, 'answer');
}

export async function turboseek(query) {
  return keyra('/ai/turboseek', { text: query }, null);
}

export async function chateverywhere(query) {
  const respuesta = await keyra('/ai/chateverywhere', { prompt: query }, 'response');
  return limpiar(await traducir(respuesta, 'es'));
}

export async function geminipro(query) {
  return kilo('Sos Google Gemini Pro, el modelo insignia de IA multimodal de Google.', query);
}

export async function claudesonnet(query) {
  return kilo('Sos Claude 3.5 Sonnet, la IA de conversación y análisis lógico de Anthropic.', query);
}

export async function gpt35(query) {
  return kilo('Sos GPT-3.5 Turbo, un modelo liviano y muy rápido de OpenAI.', query);
}

export async function gpt4(query) {
  return kilo('Sos GPT-4 Turbo, un modelo avanzado de OpenAI con razonamiento lógico agudo.', query);
}

export async function gpt4oMini(query) {
  return kilo('Sos GPT-4o Mini, un modelo ultra veloz, eficiente e inteligente de OpenAI.', query);
}

export async function llama31(query) {
  return kilo('Sos LLaMA 3.1, el gran modelo fundacional de código abierto de Meta AI.', query);
}

export async function llama33(query) {
  return kilo('Sos LLaMA 3.3, el modelo abierto ultra moderno y potente de Meta AI.', query);
}

export async function qwen(query) {
  return kilo('Sos Qwen 2.5, el potente y versátil LLM de Alibaba Cloud.', query);
}

export async function qwenCoder(query) {
  return kilo('Sos Qwen 2.5 Coder, especialista en ingeniería de software y programación, creado por Alibaba Cloud.', query);
}

export async function deepseek(query) {
  return kilo('Sos DeepSeek V3, un modelo de alto rendimiento, ágil y eficiente de DeepSeek.', query);
}

export async function deepseekR1(query) {
  return kilo('Sos DeepSeek R1, con razonamiento analítico profundo, matemático y sistémico.', query);
}

export async function flux(prompt) {
  return imagenBuffer(prompt, 'flux');
}

export async function sdxl(prompt) {
  return imagenBuffer(prompt, 'sdxl');
}
