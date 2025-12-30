import { NextRequest, NextResponse } from 'next/server';

type ProxyRequest = {
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
};

const ALLOWED_HOSTS = new Set([
  'api.moonshot.cn',
  'api.openai.com',
  'generativelanguage.googleapis.com',
  'localhost',
  '127.0.0.1',
]);

export async function POST(req: NextRequest) {
  try {
    const { url, headers = {}, body }: ProxyRequest = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    const target = new URL(url);
    if (!ALLOWED_HOSTS.has(target.hostname)) {
      return NextResponse.json({ error: 'Host not allowed' }, { status: 400 });
    }

    const proxyHeaders = new Headers();
    Object.entries(headers).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        proxyHeaders.set(key, value);
      }
    });

    if (!proxyHeaders.has('content-type')) {
      proxyHeaders.set('content-type', 'application/json');
    }

    const upstreamResponse = await fetch(target.toString(), {
      method: 'POST',
      headers: proxyHeaders,
      body: typeof body === 'string' ? body : JSON.stringify(body ?? {}),
    });

    const contentType = upstreamResponse.headers.get('content-type') || 'application/json';

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: {
        'content-type': contentType,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Proxy request failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
