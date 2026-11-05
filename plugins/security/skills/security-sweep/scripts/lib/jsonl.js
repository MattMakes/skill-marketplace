import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';

export async function readJsonl(filePath) {
  if (!existsSync(filePath)) return [];
  const raw = await fs.readFile(filePath, 'utf8');
  const out = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(JSON.parse(trimmed));
    } catch (err) {
      throw new Error(`Invalid JSONL in ${filePath}: ${err.message} | line: ${trimmed.slice(0, 120)}`);
    }
  }
  return out;
}

export async function writeJsonl(filePath, items) {
  const lines = items.map((item) => JSON.stringify(item)).join('\n');
  await fs.writeFile(filePath, lines + (lines ? '\n' : ''), 'utf8');
}

export async function appendJsonl(filePath, item) {
  await fs.appendFile(filePath, JSON.stringify(item) + '\n', 'utf8');
}
