import { NextResponse } from 'next/server';

async function handleRequest(request, { params }) {
  const pathParts = await params;
  const path = pathParts.path.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const baseUrl = (process.env.BACKEND_URL || '').replace(/\/+$/g, '');
  const backendUrl = `${baseUrl}/ceph/${path}${searchParams ? '?' + searchParams : ''}`;

  console.log(`[Ceph Proxy] ${request.method} -> ${backendUrl}`);

  try {
    const fetchOptions = {
      method: request.method,
      headers: {
        'Content-Type': request.headers.get('Content-Type') || 'application/json',
      },
      cache: 'no-store',
    };

    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const body = await request.arrayBuffer();
      if (body.byteLength) fetchOptions.body = body;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(backendUrl, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = res.headers.get('Content-Type') || 'application/json';
    const responseBody = await res.arrayBuffer();

    const response = new NextResponse(responseBody, {
      status: res.status,
      headers: {
        'Content-Type': contentType,
      },
    });

    return response;
  } catch (error) {
    console.error(`[Ceph Proxy] Error fetching ${backendUrl}:`, error);
    const status = error.name === 'AbortError' ? 504 : 500;
    return NextResponse.json({ error: error?.message || 'Ceph proxy failed' }, { status });
  }
}

export { handleRequest as GET, handleRequest as POST, handleRequest as PUT, handleRequest as DELETE, handleRequest as PATCH };
