import { exec } from 'node:child_process';

export const execAsync = (command, { timeout = 0 } = {}) =>
  new Promise((resolve, reject) => {
    exec(command, { timeout, maxBuffer: 1024 * 1024 * 16 }, (error, stdout, stderr) => {
      if (error) return reject(error);
      resolve({ stdout, stderr });
    });
  });
