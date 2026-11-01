import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localDbDir = path.join(__dirname, 'json');
const mineralsPath = path.join(localDbDir, 'minerals.json');

let mineralsCache = null;

export function readMinerals() {
  if (mineralsCache !== null) return mineralsCache;
  if (!fs.existsSync(mineralsPath)) {
    mineralsCache = [];
    return mineralsCache;
  }
  try {
    const data = JSON.parse(fs.readFileSync(mineralsPath, 'utf8'));
    mineralsCache = data.minerals || [];
  } catch (error) {
    mineralsCache = [];
  }
  return mineralsCache;
}