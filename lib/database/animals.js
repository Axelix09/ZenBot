import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localDbDir = path.join(__dirname, 'json');
const animalsPath = path.join(localDbDir, 'animals.json');

let animalsCache = null;

export function readAnimals() {
  if (animalsCache !== null) return animalsCache;
  if (!fs.existsSync(animalsPath)) {
    animalsCache = [];
    return animalsCache;
  }
  try {
    const data = JSON.parse(fs.readFileSync(animalsPath, 'utf8'));
    animalsCache = data.animals || [];
  } catch (error) {
    animalsCache = [];
  }
  return animalsCache;
}