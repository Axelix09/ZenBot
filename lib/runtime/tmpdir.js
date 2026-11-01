import fs from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

export const GLOBAL_TMP = join(process.cwd(), 'tmp');

fs.mkdirSync(GLOBAL_TMP, { recursive: true });
process.env.TMPDIR = GLOBAL_TMP;
process.env.TEMP = GLOBAL_TMP;
process.env.TMP = GLOBAL_TMP;

export const runtimePath = (prefix = 'file', extension = '') =>
  join(GLOBAL_TMP, `zenbot-${prefix}-${randomUUID()}${extension ? `.${extension.replace(/^\./, '')}` : ''}`);

export const cleanOrphanTmp = () => {
  try {
    for (const entry of fs.readdirSync(GLOBAL_TMP)) {
      fs.rmSync(join(GLOBAL_TMP, entry), { recursive: true, force: true });
    }
  } catch (error) {
    console.error('[cleanOrphanTmp] Error limpiando temporales:', error);
  }
};
