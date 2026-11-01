import fs from 'node:fs';
import { runtimePath } from './tmpdir.js';
import { pipeline } from 'node:stream/promises';
import axios from 'axios';

export async function downloadToRuntimeFile(url, { prefix = 'download', extension = '', headers = {}, timeout = 60_000, minBytes = 1 } = {}) {
  const filePath = runtimePath(prefix, extension);
  try {
    const response = await axios.get(url, { responseType: 'stream', headers, timeout, maxRedirects: 10 });
    await pipeline(response.data, fs.createWriteStream(filePath));
    const { size } = await fs.promises.stat(filePath);
    if (size < minBytes) throw new Error(`archivo temporal inválido (${size} bytes)`);
    return filePath;
  } catch (error) {
    await fs.promises.rm(filePath, { force: true }).catch(() => {});
    throw error;
  }
}

export const createRuntimeFiles = () => {
  const paths = [];
  return {
    async download(url, options) {
      const filePath = await downloadToRuntimeFile(url, options);
      paths.push(filePath);
      return filePath;
    },
    cleanup: () => Promise.all(paths.splice(0).map((filePath) => removeRuntimeFile(filePath)))
  };
};

export const removeRuntimeFile = (filePath) => fs.promises.rm(filePath, { force: true }).catch(() => {});
