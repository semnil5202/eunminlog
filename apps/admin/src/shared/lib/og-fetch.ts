import { lookup } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { BlockList, isIP } from 'node:net';
import { request as httpsRequest } from 'node:https';

const MAX_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 5000;

const blocked = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24],
  ['192.0.2.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16],
  ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) blocked.addSubnet(address, prefix, 'ipv4');

export class OgFetchError extends Error {
  constructor(public readonly status: 400 | 413 | 415 | 504, message: string) {
    super(message);
  }
}

export function parseOgUrl(value: string): URL {
  if (value.length > 2048) throw new OgFetchError(400, 'Invalid URL');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new OgFetchError(400, 'Invalid URL');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname) {
    throw new OgFetchError(400, 'Invalid URL');
  }
  if (url.hostname.startsWith('[') || url.hostname === 'localhost' || url.hostname.endsWith('.localhost') || url.hostname.endsWith('.local')) {
    throw new OgFetchError(400, 'Private destination');
  }
  return url;
}

export function isPublicIPv4(address: string): boolean {
  return isIP(address) === 4 && !blocked.check(address, 'ipv4');
}

async function resolvePublicIPv4(hostname: string): Promise<string> {
  if (isIP(hostname) === 6) throw new OgFetchError(400, 'IPv6 destinations are unsupported');
  const addresses = isIP(hostname) === 4
    ? [hostname]
    : (await lookup(hostname, { all: true, family: 4 })).map((entry) => entry.address);
  if (addresses.length === 0 || addresses.some((address) => !isPublicIPv4(address))) {
    throw new OgFetchError(400, 'Private destination');
  }
  return addresses[0];
}

function readResponse(url: URL, address: string, deadline: number): Promise<{ status: number; location?: string; contentType?: string; html: string }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return new Promise<{ status: number; location?: string; contentType?: string; html: string }>((resolve, reject) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return reject(new OgFetchError(504, 'OG request timed out'));
    const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(url, {
      method: 'GET',
      lookup: (_hostname, _options, callback) => callback(null, address, 4),
      headers: {
        'User-Agent': 'EunminlogBot/1.0 (+https://eunminlog.site)',
        Accept: 'text/html',
        'Accept-Encoding': 'identity',
      },
    }, (response) => {
      const status = response.statusCode ?? 0;
      const location = response.headers.location;
      const contentType = response.headers['content-type'];
      if (status < 200 || status >= 300) {
        response.destroy();
        resolve({ status, location, contentType, html: '' });
        return;
      }
      if (!/^text\/html(?:\s*;|$)|^application\/xhtml\+xml(?:\s*;|$)/i.test(contentType ?? '')) {
        response.destroy();
        reject(new OgFetchError(415, 'HTML response required'));
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      response.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_BYTES) {
          response.destroy(new OgFetchError(413, 'OG response too large'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve({ status, location, contentType, html: Buffer.concat(chunks).toString('utf8') }));
      response.on('error', reject);
    });
    timer = setTimeout(() => request.destroy(new OgFetchError(504, 'OG request timed out')), remaining);
    request.on('error', reject);
    request.end();
  }).finally(() => clearTimeout(timer));
}

/** 공개 IPv4로 DNS 결과를 고정한 뒤 제한된 HTML만 읽는다. */
export async function fetchOgHtml(input: string): Promise<{ url: URL; html: string }> {
  let url = parseOgUrl(input);
  const deadline = Date.now() + TIMEOUT_MS;
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new OgFetchError(504, 'OG request timed out');
    let timer: ReturnType<typeof setTimeout> | undefined;
    const address = await Promise.race([
      resolvePublicIPv4(url.hostname),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new OgFetchError(504, 'OG request timed out')), remaining);
      }),
    ]).finally(() => clearTimeout(timer));
    const response = await readResponse(url, address, deadline);
    if (response.status >= 300 && response.status < 400 && response.location) {
      if (redirects === MAX_REDIRECTS) throw new OgFetchError(400, 'Too many redirects');
      url = parseOgUrl(new URL(response.location, url).href);
      continue;
    }
    return { url, html: response.html };
  }
  throw new OgFetchError(400, 'Too many redirects');
}
