export const COMPANIES = {
  nexora: { id: 'nexora', name: '🖥️ Nexora Tecnologías', short: 'Nexora', sector: 'Tecnología', about: 'Software, chips y servicios en la nube', risk: 0.6, returns: [0.6, 2.6], volatility: 0.3 },
  aurum: { id: 'aurum', name: '🥇 Aurum Minerales', short: 'Aurum', sector: 'Metales preciosos', about: 'Minería de oro y plata, refugio en épocas de crisis', risk: 0.25, returns: [0.9, 1.5], volatility: 0.15 },
  meridiana: { id: 'meridiana', name: '🛢️ Petrolera Meridiana', short: 'Meridiana', sector: 'Petróleo y gas', about: 'Extracción y refinación de petróleo', risk: 0.5, returns: [0.7, 2.2], volatility: 0.28 },
  solaris: { id: 'solaris', name: '☀️ Solaris Energía', short: 'Solaris', sector: 'Energía renovable', about: 'Parques solares y eólicos', risk: 0.55, returns: [0.6, 2.6], volatility: 0.28 },
  atlantico: { id: 'atlantico', name: '🏦 Banco Atlántico', short: 'Atlántico', sector: 'Finanzas', about: 'Banca comercial y préstamos hipotecarios', risk: 0.35, returns: [0.85, 1.7], volatility: 0.18 },
  vitalis: { id: 'vitalis', name: '💊 Vitalis Farma', short: 'Vitalis', sector: 'Salud', about: 'Medicamentos, vacunas e investigación clínica', risk: 0.65, returns: [0.5, 3.2], volatility: 0.35 },
  horizonte: { id: 'horizonte', name: '🏗️ Constructora Horizonte', short: 'Horizonte', sector: 'Construcción', about: 'Viviendas, obras públicas y desarrollos inmobiliarios', risk: 0.4, returns: [0.8, 1.9], volatility: 0.2 },
  agrosur: { id: 'agrosur', name: '🌾 AgroSur Alimentos', short: 'AgroSur', sector: 'Agroindustria', about: 'Cultivos, ganadería y exportación de alimentos', risk: 0.3, returns: [0.9, 1.5], volatility: 0.15 }
};

export const NEWS = [
  { event: '🏦 El banco central sube las tasas de interés', impacts: { atlantico: 1.25, horizonte: 0.75, nexora: 0.9 } },
  { event: '🏦 El banco central baja las tasas de interés', impacts: { atlantico: 0.9, horizonte: 1.3, nexora: 1.15 } },
  { event: '📉 Se acerca una recesión global', impacts: { nexora: 0.8, meridiana: 0.8, solaris: 0.85, atlantico: 0.85, vitalis: 0.95, horizonte: 0.75, aurum: 1.3, agrosur: 1.1 } },
  { event: '📈 La economía crece más de lo esperado', impacts: { nexora: 1.2, meridiana: 1.15, atlantico: 1.15, horizonte: 1.2, aurum: 0.9 } },
  { event: '💥 Crisis financiera sacude los mercados', impacts: { atlantico: 0.6, horizonte: 0.7, nexora: 0.75, meridiana: 0.8, solaris: 0.85, vitalis: 0.9, agrosur: 0.95, aurum: 1.4 } },
  { event: '🌎 Acuerdo comercial entre potencias reactiva el comercio', impacts: { nexora: 1.1, meridiana: 1.1, agrosur: 1.1, horizonte: 1.1, aurum: 0.95 } },
  { event: '🛢️ El petróleo se dispara por tensiones en Oriente Medio', impacts: { meridiana: 1.5, solaris: 1.15, agrosur: 0.9, horizonte: 0.95 } },
  { event: '🛢️ El precio del petróleo se desploma', impacts: { meridiana: 0.65, solaris: 0.9, agrosur: 1.05 } },
  { event: '🛢️ Petrolera Meridiana descubre un nuevo yacimiento', impacts: { meridiana: 1.45 } },
  { event: '☀️ El gobierno lanza subsidios para energías limpias', impacts: { solaris: 1.5, meridiana: 0.9 } },
  { event: '☀️ Se recortan los subsidios a las renovables', impacts: { solaris: 0.7 } },
  { event: '☀️ Solaris inaugura el mayor parque solar de la región', impacts: { solaris: 1.4 } },
  { event: '🚀 El auge de la inteligencia artificial impulsa a las tecnológicas', impacts: { nexora: 1.45, solaris: 1.1 } },
  { event: '🖥️ Nexora presenta un chip de nueva generación', impacts: { nexora: 1.5 } },
  { event: '🔓 Ciberataque masivo expone datos de grandes empresas', impacts: { nexora: 0.7, atlantico: 0.9 } },
  { event: '⚖️ Nueva regulación antimonopolio contra las tecnológicas', impacts: { nexora: 0.75 } },
  { event: '💊 Vitalis anuncia resultados positivos en su vacuna', impacts: { vitalis: 1.6 } },
  { event: '💊 La agencia sanitaria rechaza el nuevo fármaco de Vitalis', impacts: { vitalis: 0.6 } },
  { event: '🦠 Brote epidemiológico dispara la demanda de medicamentos', impacts: { vitalis: 1.4, horizonte: 0.9, agrosur: 0.95 } },
  { event: '🥇 El oro alcanza máximos históricos', impacts: { aurum: 1.4 } },
  { event: '🥇 Cae la demanda de metales preciosos', impacts: { aurum: 0.75 } },
  { event: '⛏️ Huelga paraliza las minas de Aurum', impacts: { aurum: 0.8 } },
  { event: '🌾 Se disparan los precios de los alimentos', impacts: { agrosur: 1.35 } },
  { event: '🌾 Una cosecha récord abarata los alimentos', impacts: { agrosur: 0.85 } },
  { event: '🌾 AgroSur firma un contrato de exportación millonario', impacts: { agrosur: 1.35 } },
  { event: '🏗️ Boom inmobiliario: récord de viviendas vendidas', impacts: { horizonte: 1.45, atlantico: 1.1 } },
  { event: '🏗️ Estalla una burbuja inmobiliaria', impacts: { horizonte: 0.6, atlantico: 0.8 } },
  { event: '🏗️ Horizonte gana una licitación de obras públicas', impacts: { horizonte: 1.4 } },
  { event: '🏦 Banco Atlántico reporta ganancias récord', impacts: { atlantico: 1.45 } },
  { event: '🏦 Banco Atlántico enfrenta una investigación por lavado de dinero', impacts: { atlantico: 0.65 } }
];

export const SLOT_MS = 30 * 60 * 1000;
export const NEWS_WEIGHT = 0.45;
export const SPECULATION_HISTORY = 30;

const hash = (n) => {
  let h = (n ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
};

const mulberry32 = (seed) => () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const seededRng = (seed) => mulberry32(hash(seed));

export const getMarket = (now = Date.now()) => {
  const slot = Math.floor(now / SLOT_MS);
  const rng = seededRng(slot);
  const pool = [...NEWS];
  const news = [];
  for (let i = 0; i < 3; i++) news.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);

  const companies = {};
  for (const c of Object.values(COMPANIES)) {
    let effect = 1;
    for (const n of news) {
      if (n.impacts[c.id] !== undefined) effect *= n.impacts[c.id];
    }
    effect = Math.min(2.5, Math.max(0.5, effect));
    const trend = effect >= 1.15 ? 'alcista' : effect <= 0.9 ? 'bajista' : 'neutral';
    const confidence = Math.min(0.9, 0.5 + Math.abs(Math.log(effect)) * 0.5);
    companies[c.id] = { ...c, effect, trend, confidence };
  }

  return { slot, endsAt: (slot + 1) * SLOT_MS, news, companies };
};

export const trendEmoji = (trend) => (trend === 'alcista' ? '📈' : trend === 'bajista' ? '📉' : '➖');

export const trendLabel = (trend) =>
  trend === 'alcista' ? 'Alcista (↑)' : trend === 'bajista' ? 'Bajista (↓)' : 'Neutral (→)';

export const describeImpacts = (news) => {
  const ups = [];
  const downs = [];
  for (const [id, effect] of Object.entries(news.impacts)) {
    const name = COMPANIES[id]?.short || id;
    if (effect > 1) ups.push(name);
    else if (effect < 1) downs.push(name);
  }
  const parts = [];
  if (ups.length) parts.push(`📈 ${ups.join(', ')}`);
  if (downs.length) parts.push(`📉 ${downs.join(', ')}`);
  return parts.join('  |  ');
};

export const newsEffectOn = (news, companyId) => news.impacts[companyId];

export const timeLeft = (ms) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

export const rollMultiplier = (company) => {
  const [lo, hi] = company.returns;
  const base = lo + Math.random() * (hi - lo);
  const target = 0.82 + 0.25 * company.risk;
  const vol = 1 + (Math.random() - 0.5) * company.volatility;
  return Math.max(0, (base / ((lo + hi) / 2)) * target * Math.pow(company.effect, NEWS_WEIGHT) * vol);
};

export const speculationChance = (company, direction) => {
  const edge = 0.22 * company.confidence;
  if ((direction === 'sube' && company.trend === 'alcista') || (direction === 'baja' && company.trend === 'bajista')) return 0.5 + edge;
  if ((direction === 'sube' && company.trend === 'bajista') || (direction === 'baja' && company.trend === 'alcista')) return 0.5 - edge;
  return 0.5;
};

export const speculationProfitRatio = (company) => 0.35 + company.risk * 0.3;

export const findCompany = (raw) => (raw ? COMPANIES[String(raw).toLowerCase()] || null : null);

export const ensureInvestments = (user) => {
  if (!user.investments) user.investments = {};
  if (!user.investments.portfolio) user.investments.portfolio = {};
  if (!user.stats) user.stats = {};
  return user.investments;
};
