import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import { getCardImage } from '../game/assetUrls.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CHROMIUM = process.env.CHROMIUM_PATH || '/usr/bin/chromium';

const W = 1200;
const H = 760;
const SCALE = 2;
const PAD = 60;
const GAP = 14;
const ART_SIZE = 340;
const ART_X = W - PAD - ART_SIZE;
const ART_Y = 72;
const FONT = "Inter, 'Segoe UI', 'Noto Sans', 'DejaVu Sans', Roboto, Helvetica, Arial, sans-serif";

const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const safeColor = (value, fallback) => /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(String(value || '')) ? value : fallback;

const alpha = (hex, a) => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const charUnits = (ch) => {
  if (ch.codePointAt(0) > 0x2000) return 1.1;
  if (ch === ' ') return 0.32;
  if ("iIl.,:;'|!j".includes(ch)) return 0.32;
  if ('ftr()[]-'.includes(ch)) return 0.4;
  if ('mwMW@%'.includes(ch)) return 0.92;
  if (ch >= 'A' && ch <= 'Z') return 0.72;
  if (ch >= '0' && ch <= '9') return 0.64;
  return 0.6;
};

const textWidth = (text, size, bold = false) =>
  [...String(text)].reduce((sum, ch) => sum + charUnits(ch), 0) * size * (bold ? 1.1 : 1);

const fit = (text, width, size, bold = false) => {
  const chars = [...String(text ?? '')];
  if (textWidth(chars.join(''), size, bold) <= width) return chars.join('');
  while (chars.length && textWidth(`${chars.join('')}…`, size, bold) > width) chars.pop();
  return `${chars.join('').trimEnd()}…`;
};

const pickSize = (text, width, sizes, bold = true) =>
  sizes.find((size) => textWidth(text, size, bold) <= width) || sizes[sizes.length - 1];

const wrap = (text, width, size, maxLines) => {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (!current || textWidth(next, size) <= width) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines.map((line) => fit(line, width, size));
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = fit(`${kept[maxLines - 1]} ${lines.slice(maxLines).join(' ')}`, width, size);
  return kept;
};

const compactArt = async (data, mime) => {
  try {
    const image = sharp(data).resize(680, 680, { fit: 'cover' });
    const isPng = /png/i.test(mime);
    const out = await (isPng ? image.png() : image.jpeg({ quality: 88 })).toBuffer();
    return `data:${isPng ? 'image/png' : 'image/jpeg'};base64,${out.toString('base64')}`;
  } catch {
    return `data:${mime};base64,${data.toString('base64')}`;
  }
};

const assetUri = async (assetPath) => {
  if (!assetPath) return '';
  if (/^https?:\/\//i.test(assetPath)) {
    try {
      const response = await fetch(assetPath);
      if (!response.ok) return '';
      const data = Buffer.from(await response.arrayBuffer());
      return await compactArt(data, response.headers.get('content-type') || 'image/png');
    } catch {
      return '';
    }
  }
  const absolute = path.isAbsolute(assetPath) ? assetPath : path.join(ROOT, assetPath);
  try {
    const data = await fs.readFile(absolute);
    const ext = path.extname(absolute).toLowerCase();
    const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';
    return await compactArt(data, mime);
  } catch {
    return '';
  }
};

function computeLayout({ title, subtitle, stats, rows, caption, footer, hasArt }) {
  const colW = hasArt ? 700 : W - PAD * 2;

  const titleSize = pickSize(title, colW, [64, 56, 48, 42, 36]);
  const titleText = fit(title, colW, titleSize, true);
  const titleBase = 160;

  const subLines = subtitle ? wrap(subtitle, colW, 22, 2) : [];
  const subBase = 202;
  const subBottom = subLines.length ? subBase + (subLines.length - 1) * 30 + 10 : titleBase + 16;

  const statList = stats.slice(0, 4);
  const statY = subBottom + 26;
  const statH = 120;
  const statW = statList.length ? (colW - GAP * (statList.length - 1)) / statList.length : 0;
  const statTiles = statList.map((item, i) => {
    const inner = statW - 40;
    const value = String(item.value ?? '');
    const valueSize = pickSize(value, inner, [36, 32, 28, 24, 20]);
    return {
      x: PAD + i * (statW + GAP),
      y: statY,
      w: statW,
      h: statH,
      label: fit(String(item.label ?? '').toUpperCase(), inner, 15.5, true),
      value: fit(value, inner, valueSize, true),
      valueSize,
      note: fit(item.note || '', inner, 14)
    };
  });

  const cols = hasArt ? 2 : 3;
  const rowGap = 10;
  const rowH = 54;
  const rowW = (colW - 12 * (cols - 1)) / cols;
  const rowsY = (statTiles.length ? statY + statH : subBottom) + 22;
  const maxRows = cols * 4;
  let shown = rows.slice();
  if (shown.length > maxRows) {
    shown = [...shown.slice(0, maxRows - 1), { label: `+${shown.length - maxRows + 1} más`, value: '' }];
  }
  const rowTiles = shown.map((item, i) => {
    const spans = cols === 2 && i === shown.length - 1 && shown.length % 2 === 1;
    const w = spans ? colW : rowW;
    const value = String(item.value ?? '');
    const valueW = textWidth(value, 18, true);
    return {
      x: PAD + (spans ? 0 : (i % cols) * (rowW + 12)),
      y: rowsY + Math.floor(i / cols) * (rowH + rowGap),
      w,
      h: rowH,
      label: fit(item.label ?? '', w - 34 - 18 - valueW - 14, 17),
      value: fit(value, w * 0.5, 18, true)
    };
  });

  const noteLines = hasArt && caption ? wrap(caption, ART_SIZE - 40, 18, 3) : [];
  const note = noteLines.length
    ? { x: ART_X, y: ART_Y + ART_SIZE + 20, w: ART_SIZE, h: noteLines.length * 26 + 34, lines: noteLines }
    : null;

  const bottoms = [
    ...rowTiles.map((t) => t.y + t.h),
    ...statTiles.map((t) => t.y + t.h),
    hasArt ? ART_Y + ART_SIZE : 0,
    note ? note.y + note.h : 0,
    subBottom
  ];
  const dy = Math.max(0, Math.min(44, Math.floor((672 - Math.max(...bottoms)) / 2)));
  statTiles.forEach((t) => { t.y += dy; });
  rowTiles.forEach((t) => { t.y += dy; });
  if (note) note.y += dy;

  return {
    colW,
    title: { text: titleText, size: titleSize, base: titleBase + dy },
    sub: { lines: subLines, base: subBase + dy },
    eyebrowY: 72 + dy,
    art: { x: ART_X, y: ART_Y + dy },
    statTiles,
    rowTiles,
    note,
    footerText: fit(footer, 640, 16),
    footerRight: !hasArt && caption ? fit(caption, 460, 16, true) : ''
  };
}

const pos = (x, y, w, h) => `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;

function buildHtml({ eyebrow, accent, accent2, artUri, layout: L, caption }) {
  const hasArt = Boolean(artUri);
  const stats = L.statTiles.map((t) => `
    <div class="tile" style="${pos(t.x, t.y, t.w, t.h)}">
      <i class="tick"></i>
      <span class="s-label">${esc(t.label)}</span>
      <strong class="s-value" style="font-size:${t.valueSize}px">${esc(t.value)}</strong>
      <small class="s-note">${esc(t.note)}</small>
    </div>`).join('');
  const rows = L.rowTiles.map((t) => `
    <div class="row" style="${pos(t.x, t.y, t.w, t.h)}">
      <i class="dot"></i><span class="r-key">${esc(t.label)}</span><b class="r-val">${esc(t.value)}</b>
    </div>`).join('');
  const art = hasArt ? `
    <div class="art" style="${pos(L.art.x, L.art.y, ART_SIZE, ART_SIZE)}"><img src="${artUri}" alt=""></div>` : '';
  const note = L.note ? `
    <div class="note" style="${pos(L.note.x, L.note.y, L.note.w, L.note.h)}">${L.note.lines.map(esc).join('<br>')}</div>` : '';

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#070a13}
body{position:relative;font-family:${FONT};color:#f8fafc;-webkit-font-smoothing:antialiased}
.bg{position:absolute;inset:0;background:radial-gradient(circle at 80% 14%,${alpha(accent, 0.3)} 0,transparent 42%),radial-gradient(circle at 6% 104%,${alpha(accent2, 0.2)} 0,transparent 46%),linear-gradient(135deg,#101828 0%,#0a0e1c 55%,#0d0b22 100%)}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.028) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.028) 1px,transparent 1px);background-size:40px 40px;-webkit-mask-image:linear-gradient(180deg,#000,transparent 75%);mask-image:linear-gradient(180deg,#000,transparent 75%)}
.top{position:absolute;left:0;top:0;width:${W}px;height:6px;background:linear-gradient(90deg,${accent},${accent2})}
.t{position:absolute;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bar{position:absolute;left:${PAD}px;top:${L.eyebrowY}px;width:5px;height:24px;border-radius:3px;background:linear-gradient(180deg,${accent},${accent2})}
.eyebrow{left:${PAD + 18}px;top:${L.eyebrowY}px;width:${L.colW - 18}px;height:24px;line-height:24px;font-size:17px;font-weight:800;letter-spacing:3.5px;text-transform:uppercase;color:${accent2}}
.title{left:${PAD}px;top:${L.title.base - Math.round(L.title.size * 0.86)}px;width:${L.colW}px;height:${Math.round(L.title.size * 1.15)}px;line-height:${Math.round(L.title.size * 1.15)}px;font-size:${L.title.size}px;font-weight:800;letter-spacing:-1.5px}
.sub{position:absolute;left:${PAD}px;top:${L.sub.base - 22}px;width:${L.colW}px;height:${L.sub.lines.length * 30}px;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:${Math.max(1, L.sub.lines.length)};font-size:22px;line-height:30px;color:#94a3b8}
.tile{position:absolute;border-radius:20px;background:rgba(255,255,255,.045);border:1px solid rgba(148,163,184,.2);padding:24px 20px 0;overflow:hidden}
.tick{position:absolute;left:20px;top:0;width:36px;height:3px;border-radius:2px;background:linear-gradient(90deg,${accent},${accent2})}
.s-label{display:block;font-size:14px;font-weight:700;letter-spacing:1.5px;color:#94a3b8;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.s-value{display:block;margin-top:8px;font-weight:800;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.s-note{display:block;margin-top:6px;font-size:14px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row{position:absolute;display:flex;align-items:center;gap:14px;padding:0 18px;border-radius:15px;background:rgba(255,255,255,.035);border:1px solid rgba(148,163,184,.14)}
.dot{flex:none;width:8px;height:8px;border-radius:50%;background:${accent};box-shadow:0 0 10px ${alpha(accent, 0.7)}}
.r-key{flex:1;min-width:0;font-size:17px;color:#cbd5e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.r-val{flex:none;font-size:18px;font-weight:700;color:#f8fafc;white-space:nowrap}
.art{position:absolute;padding:3px;border-radius:32px;background:linear-gradient(135deg,${accent},${accent2});box-shadow:0 0 70px ${alpha(accent, 0.35)},0 24px 50px rgba(0,0,0,.45)}
.art img{display:block;width:100%;height:100%;border-radius:29px;object-fit:cover}
.note{position:absolute;padding:16px 20px;border-radius:18px;background:${alpha(accent, 0.1)};border:1px solid ${alpha(accent, 0.35)};font-size:18px;line-height:26px;color:#e2e8f0;overflow:hidden}
.line{position:absolute;left:${PAD}px;top:688px;width:${W - PAD * 2}px;height:1px;background:rgba(148,163,184,.18)}
.fdot{position:absolute;left:${PAD}px;top:713px;width:10px;height:10px;border-radius:50%;background:linear-gradient(135deg,${accent},${accent2})}
.foot{left:${PAD + 22}px;top:706px;width:640px;height:24px;line-height:24px;font-size:16px;color:#64748b}
.fright{left:${W - PAD - 460}px;top:706px;width:460px;height:24px;line-height:24px;font-size:16px;font-weight:700;color:#cbd5e1;text-align:right}
</style></head><body>
<div class="bg"></div><div class="grid"></div><div class="top"></div>
<i class="bar"></i><div class="t eyebrow">${esc(eyebrow)}</div>
<div class="t title">${esc(L.title.text)}</div>
${L.sub.lines.length ? `<p class="sub">${esc(L.sub.lines.join(' '))}</p>` : ''}
${stats}${rows}${art}${note}
<div class="line"></div><i class="fdot"></i><div class="t foot">${esc(L.footerText)}</div>${L.footerRight ? `<div class="t fright">${esc(L.footerRight)}</div>` : ''}
</body></html>`;
}

function buildSvg({ eyebrow, accent, accent2, artUri, layout: L }) {
  const hasArt = Boolean(artUri);
  const stats = L.statTiles.map((t) => `
    <rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="20" fill="#ffffff" fill-opacity="0.045" stroke="#94a3b8" stroke-opacity="0.2"/>
    <rect x="${t.x + 20}" y="${t.y}" width="36" height="3" rx="1.5" fill="url(#line)"/>
    <text x="${t.x + 20}" y="${t.y + 39}" font-size="14" font-weight="700" letter-spacing="1.5" fill="#94a3b8">${esc(t.label)}</text>
    <text x="${t.x + 20}" y="${(t.y + 49 + t.valueSize * 0.93).toFixed(1)}" font-size="${t.valueSize}" font-weight="800" fill="#f8fafc">${esc(t.value)}</text>
    <text x="${t.x + 20}" y="${(t.y + 49 + t.valueSize * 1.15 + 18).toFixed(1)}" font-size="14" fill="#64748b">${esc(t.note)}</text>`).join('');
  const rows = L.rowTiles.map((t) => `
    <rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="15" fill="#ffffff" fill-opacity="0.035" stroke="#94a3b8" stroke-opacity="0.14"/>
    <circle cx="${t.x + 22}" cy="${t.y + 27}" r="4" fill="${accent}"/>
    <text x="${t.x + 40}" y="${t.y + 33}" font-size="17" fill="#cbd5e1">${esc(t.label)}</text>
    <text x="${t.x + t.w - 18}" y="${t.y + 33}" font-size="18" font-weight="700" text-anchor="end" fill="#f8fafc">${esc(t.value)}</text>`).join('');
  const art = hasArt ? `
    <circle cx="${L.art.x + ART_SIZE / 2}" cy="${L.art.y + ART_SIZE / 2}" r="300" fill="url(#artGlow)"/>
    <rect x="${L.art.x - 3}" y="${L.art.y - 3}" width="${ART_SIZE + 6}" height="${ART_SIZE + 6}" rx="33" fill="url(#line)"/>
    <image x="${L.art.x}" y="${L.art.y}" width="${ART_SIZE}" height="${ART_SIZE}" xlink:href="${artUri}" preserveAspectRatio="xMidYMid slice" clip-path="url(#artClip)"/>` : '';
  const note = L.note ? `
    <rect x="${L.note.x}" y="${L.note.y}" width="${L.note.w}" height="${L.note.h}" rx="18" fill="${accent}" fill-opacity="0.1" stroke="${accent}" stroke-opacity="0.35"/>
    ${L.note.lines.map((line, i) => `<text x="${L.note.x + 20}" y="${L.note.y + 34 + i * 26}" font-size="18" fill="#e2e8f0">${esc(line)}</text>`).join('')}` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#101828"/><stop offset="0.55" stop-color="#0a0e1c"/><stop offset="1" stop-color="#0d0b22"/></linearGradient>
    <linearGradient id="line" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="${accent2}"/></linearGradient>
    <radialGradient id="glowA" cx="0.8" cy="0.14" r="0.5"><stop offset="0" stop-color="${accent}" stop-opacity="0.3"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    <radialGradient id="glowB" cx="0.06" cy="1.04" r="0.5"><stop offset="0" stop-color="${accent2}" stop-opacity="0.2"/><stop offset="1" stop-color="${accent2}" stop-opacity="0"/></radialGradient>
    <radialGradient id="artGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${accent}" stop-opacity="0.32"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    <clipPath id="artClip"><rect x="${L.art.x}" y="${L.art.y}" width="${ART_SIZE}" height="${ART_SIZE}" rx="30"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glowA)"/>
  <rect width="${W}" height="${H}" fill="url(#glowB)"/>
  <rect width="${W}" height="6" fill="url(#line)"/>
  <rect x="${PAD}" y="${L.eyebrowY}" width="5" height="24" rx="2.5" fill="url(#line)"/>
  <text x="${PAD + 18}" y="${L.eyebrowY + 18}" font-size="17" font-weight="800" letter-spacing="3.5" fill="${accent2}">${esc(fit(String(eyebrow).toUpperCase(), L.colW - 18, 19, true))}</text>
  <text x="${PAD}" y="${L.title.base}" font-size="${L.title.size}" font-weight="800" letter-spacing="-1.5" fill="#f8fafc">${esc(L.title.text)}</text>
  ${L.sub.lines.map((line, i) => `<text x="${PAD}" y="${L.sub.base + i * 30}" font-size="22" fill="#94a3b8">${esc(line)}</text>`).join('')}
  ${stats}${rows}${art}${note}
  <rect x="${PAD}" y="688" width="${W - PAD * 2}" height="1" fill="#94a3b8" fill-opacity="0.18"/>
  <circle cx="${PAD + 5}" cy="718" r="5" fill="url(#line)"/>
  <text x="${PAD + 22}" y="723" font-size="16" fill="#64748b">${esc(L.footerText)}</text>
  ${L.footerRight ? `<text x="${W - PAD}" y="723" font-size="16" font-weight="700" text-anchor="end" fill="#cbd5e1">${esc(L.footerRight)}</text>` : ''}
</svg>`;
}

const runChromium = (htmlPath, outputPath) => new Promise((resolve, reject) => {
  const args = [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--hide-scrollbars',
    '--font-render-hinting=none', `--force-device-scale-factor=${SCALE}`, `--window-size=${W},${H + 240}`,
    `--screenshot=${outputPath}`, `file://${htmlPath}`
  ];
  const child = spawn(CHROMIUM, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  const timer = setTimeout(() => child.kill('SIGKILL'), 25000);
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  child.once('error', (error) => { clearTimeout(timer); reject(error); });
  child.once('close', (code) => {
    clearTimeout(timer);
    code === 0 ? resolve() : reject(new Error(`Chromium exited ${code}: ${stderr}`));
  });
});

export async function renderHtmlCard({
  eyebrow = 'ZENBOT',
  title = 'Card',
  subtitle = '',
  accent = '#8b5cf6',
  accent2 = '#22d3ee',
  art = '',
  stats = [],
  rows = [],
  footer = 'ZenBot · Axelix',
  caption = ''
} = {}) {
  const primary = safeColor(accent, '#8b5cf6');
  const secondary = safeColor(accent2, '#22d3ee');
  const artUri = await assetUri(art);
  const layout = computeLayout({
    title: String(title ?? ''),
    subtitle: String(subtitle ?? ''),
    stats,
    rows,
    caption: String(caption ?? ''),
    footer: String(footer ?? ''),
    hasArt: Boolean(artUri)
  });
  const data = { eyebrow: String(eyebrow ?? ''), accent: primary, accent2: secondary, artUri, layout };

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbot-card-'));
  const htmlPath = path.join(tempDir, 'card.html');
  const outputPath = path.join(tempDir, 'card.png');
  try {
    try {
      await fs.writeFile(htmlPath, buildHtml(data), 'utf8');
      await runChromium(htmlPath, outputPath);
      const image = await sharp(await fs.readFile(outputPath))
        .extract({ left: 0, top: 0, width: W * SCALE, height: H * SCALE })
        .png()
        .toBuffer();
      if (!image.length) throw new Error('Chromium no generó una imagen de salida');
      return image;
    } catch (error) {
      console.warn(`[htmlCard] Falló el render HTML (${error?.message || error}); se usará la tarjeta SVG.`);
      return await sharp(Buffer.from(buildSvg(data)), { density: 72 * SCALE }).png().toBuffer();
    }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

export const cardAsset = (name) => getCardImage(name);
