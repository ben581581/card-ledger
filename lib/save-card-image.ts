import { randomUUID } from 'node:crypto';
import sharp, { type Sharp } from 'sharp';
import { drizzle } from 'drizzle-orm/neon-http';
import { database } from './db';
import { cardImages } from '../db/schema';

/**
 * Card faces are drawn at most ~340 CSS px wide, so 960 px covers a 3x screen.
 * WebP at this size is a fraction of a bank's PNG.
 */
export async function cardWebp(bytes: Uint8Array, prepare: (image: Sharp) => Sharp = image => image) {
  const image = prepare(sharp(bytes, { limitInputPixels: 16_000_000 }).rotate());
  return image
    .resize({ width: 960, height: 960, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
}

export async function saveCardImage(bytes: Uint8Array, mimeType: string) {
  const id = randomUUID();
  await drizzle(database())
    .insert(cardImages)
    .values({ id, mimeType, imageData: Buffer.from(bytes).toString('base64') });
  return `/api/card-images/${id}`;
}
