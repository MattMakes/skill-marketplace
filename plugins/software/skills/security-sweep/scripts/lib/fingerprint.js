import crypto from 'node:crypto';

export function fingerprint({ category, file, title }) {
  const normalizedTitle = String(title ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  const input = `${category}:${file}:${normalizedTitle}`;
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 12);
}
