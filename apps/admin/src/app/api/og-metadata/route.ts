import { NextResponse } from 'next/server';

import { getAdminAccess } from '@/shared/lib/admin-auth';
import { fetchOgHtml, OgFetchError, parseOgUrl } from '@/shared/lib/og-fetch';
import { checkOgRateLimit } from '@/shared/lib/og-rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** POST /api/og-metadata — URL의 OG 메타데이터를 서버에서 fetch하여 반환 */
export async function POST(request: Request) {
  const access = await getAdminAccess();
  if (access.status !== 200) {
    return NextResponse.json({ error: access.status === 401 ? 'Unauthorized' : 'Forbidden' }, { status: access.status });
  }
  const limit = checkOgRateLimit(access.user.id);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(limit.retryAfter) },
    });
  }

  let url: string;
  let domain: string;
  try {
    const body = await request.json() as { url?: unknown };
    if (typeof body.url !== 'string' || body.url.length > 2048) throw new OgFetchError(400, 'Invalid URL');
    url = parseOgUrl(body.url.trim()).href;
    domain = new URL(url).hostname;
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const emptyMeta = { url, title: '', description: '', image: '', favicon: '', domain };

  try {
    const { url: finalUrl, html } = await fetchOgHtml(url);
    if (!html) return NextResponse.json(emptyMeta);

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

    const origin = finalUrl.origin;
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
      url: finalUrl.href,
      title: ogTitle.trim(),
      description: ogDescription.trim(),
      image: ogImage.trim(),
      favicon,
      domain: finalUrl.hostname,
    });
  } catch (error) {
    if (error instanceof OgFetchError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(emptyMeta);
  }
}
