import { ZenConfig } from '../../zen.config.js';

export function printBanner() {
  console.clear();
  const reset = '\x1b[0m';
  const gray = '\x1b[90m';
  const magenta = '\x1b[38;2;168;85;247m';
  const darkMagenta = '\x1b[38;2;124;58;237m';
  const cyan = '\x1b[38;2;6;182;212m';

  console.log(`\n  ${magenta}███████╗${darkMagenta}███████╗${cyan}███╗   ██╗${reset}`);
  console.log(`  ${magenta}╚══███╔╝${darkMagenta}██╔════╝${cyan}████╗  ██║${reset}`);
  console.log(`  ${magenta}  ███╔╝ ${darkMagenta}█████╗  ${cyan}██╔██╗ ██║${reset}  ${gray}v11.0.0${reset}`);
  console.log(`  ${magenta} ███╔╝  ${darkMagenta}██╔══╝  ${cyan}██║╚██╗██║${reset}`);
  console.log(`  ${magenta}███████╗${darkMagenta}███████╗${cyan}██║ ╚████║${reset}`);
  console.log(`  ${magenta}╚══════╝${darkMagenta}╚══════╝${cyan}╚═╝  ╚═══╝${reset}`);

  console.log(`\n${gray}┌──────────────────────────────────────────────┐${reset}`);
  console.log(`${gray}│${reset}  ${magenta}✦${reset} Instagram   : ${cyan}@${ZenConfig.ownerInstagram}${reset}                  ${gray}│${reset}`);
  console.log(`${gray}│${reset}  ${magenta}✦${reset} Environment : ${cyan}NodeJS ESM${reset}                  ${gray}│${reset}`);
  console.log(`${gray}│${reset}  ${magenta}✦${reset} Developer   : ${cyan}${ZenConfig.ownerName}${reset}                   ${gray}│${reset}`);
  console.log(`${gray}└──────────────────────────────────────────────┘${reset}\n`);
}