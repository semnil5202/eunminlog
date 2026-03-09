import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** POST /api/og-metadata — URL의 OG 메타데이터를 서버에서 fetch하여 반환 */
export async function POST(request: Request) {
  const body = (await request.json()) as { url: string };
  const url = body.url?.trim();

  if (!url || !/^https?:\/\//.test(url)) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  let domain = '';
  try {
    domain = new URL(url).hostname;
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const emptyMeta = { url, title: '', description: '', image: '', favicon: '', domain };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; EunminlogBot/1.0; +https://eunminlog.site)',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json(emptyMeta);
    }

    const html = await response.text();

    const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1]
      ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
      ?? '';

    const ogDescription = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)?.[1]
      ?? html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1]
      ?? '';

    const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1]
      ?? '';

    const origin = new URL(url).origin;
    const faviconHref = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*icon[^"']*["']/i)?.[1]
      ?? '';

    let favicon = '';
    if (faviconHref) {
      try {
        favicon = new URL(faviconHref, origin).href;
      } catch {
        favicon = `${origin}/favicon.ico`;
      }
    } else {
      favicon = `${origin}/favicon.ico`;
    }

    return NextResponse.json({
      url,
      title: ogTitle.trim(),
      description: ogDescription.trim(),
      image: ogImage.trim(),
      favicon,
      domain,
    });
  } catch {
    return NextResponse.json(emptyMeta);
  }
}
