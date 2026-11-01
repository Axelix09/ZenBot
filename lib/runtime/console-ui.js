const reset = '\x1b[0m';
const gray = '\x1b[90m';
const magenta = '\x1b[38;2;168;85;247m';
const cyan = '\x1b[38;2;6;182;212m';
const WIDTH = 46;

export const colors = { reset, gray, magenta, cyan };

const visibleLength = (text) => text.replace(/\x1b\[[0-9;]*m/g, '').length;
const fit = (text) => text + ' '.repeat(Math.max(0, WIDTH - 2 - visibleLength(text)));
const row = (text = '') => `${gray}│${reset}  ${fit(text)}${gray}│${reset}`;

export const box = (title, lines = []) => {
  const border = '─'.repeat(WIDTH);
  const out = [
    `${gray}┌${border}┐${reset}`,
    row(`${magenta}✦${reset} ${title}`),
    `${gray}├${border}┤${reset}`,
    ...lines.map(row),
    `${gray}└${border}┘${reset}`
  ];
  console.log(`\n${out.join('\n')}\n`);
};
