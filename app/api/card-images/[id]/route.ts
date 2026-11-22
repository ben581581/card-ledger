import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { database } from '../../../../lib/db';
import { cardImages } from '../../../../db/schema';
import { cardWebp } from '../../../../lib/save-card-image';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id))
    return new Response(null, { status: 404 });
  try {
    const [image] = await drizzle(database()).select().from(cardImages).where(eq(cardImages.id, id)).limit(1);
    if (!image) return new Response(null, { status: 404 });
    let body: Buffer = Buffer.from(image.imageData, 'base64');
    let type = image.mimeType;
    // Images saved before uploads were compressed are converted on the way out; the CDN keeps the result.
    if (type !== 'image/webp') {
      try {
        body = await cardWebp(body);
        type = 'image/webp';
      } catch (e) {
        console.error(e);
      }
    }
    return new Response(new Uint8Array(body), {
      headers: {
        'Content-Type': type,
        'Content-Length': String(body.length),
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (e) {
    console.error(e);
    return new Response(null, { status: 503 });
  }
}
