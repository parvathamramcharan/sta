import { NextResponse } from 'next/server';
import { auth } from '@/auth';

async function handleRequest(request, { params }) {
  console.time("auth");
  const session = await auth();
  console.timeEnd("auth");
  const pathParts = await params;
  const path = pathParts.path.join('/');
  const searchParams = request.nextUrl.searchParams.toString();

  const baseUrl = (process.env.BACKEND_URL || '').replace(/\/+$/g, '');
  const cleanPath = String(path).replace(/^\/+/, '');
  const backendUrl = `${baseUrl}/${cleanPath}${searchParams ? '?' + searchParams : ''}`;

  console.log(`[Proxy Route] ${request.method} -> ${backendUrl}`);

  try {
    const fetchOptions = {
      method: request.method,
      headers: {
        'Content-Type': request.headers.get('Content-Type') || 'application/json',
        ...(session?.accessToken && { 'Authorization': `Bearer ${session.accessToken}` }),
      },
      cache: 'no-store'
    };

    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const body = await request.text();
      if (body) fetchOptions.body = body;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(backendUrl, {
      ...fetchOptions,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type') || '';

    if (!res.ok) {
      const errorBody = await res.text();
      if (contentType.includes('application/json')) {
        try {
          return NextResponse.json(JSON.parse(errorBody), { status: res.status });
        } catch {
          return new NextResponse(errorBody, {
            status: res.status,
            headers: { 'Content-Type': contentType || 'application/json' }
          });
        }
      }

      return new NextResponse(errorBody, {
        status: res.status,
        headers: { 'Content-Type': contentType || 'text/plain' }
      });
    }

    if (contentType.includes('application/json')) {
      const rawBody = await res.text();
      try {
        return NextResponse.json(JSON.parse(rawBody));
      } catch {
        return new NextResponse(rawBody, {
          headers: { 'Content-Type': contentType || 'application/json' }
        });
      }
    }

    const body = await res.arrayBuffer();
    const responseHeaders = new Headers();
    const contentDisposition = res.headers.get('content-disposition');
    if (contentDisposition) {
      responseHeaders.set('Content-Disposition', contentDisposition);
    }
    responseHeaders.set('Content-Type', contentType || 'application/octet-stream');

    return new NextResponse(body, {
      status: res.status,
      headers: responseHeaders
    });
  } catch (error) {
    console.error(`[Proxy Route] Error fetching ${backendUrl}:`, error);
    const msg = error?.message || 'Proxy fetch failed';
    const status = error.name === 'AbortError' ? 504 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export { handleRequest as GET, handleRequest as POST, handleRequest as PUT, handleRequest as DELETE };