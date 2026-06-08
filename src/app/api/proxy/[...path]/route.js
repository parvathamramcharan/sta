import { NextResponse } from 'next/server';

async function handleRequest(request, { params }) {
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
        ...(request.headers.get('Authorization') && { 'Authorization': request.headers.get('Authorization') }),
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

    if (!res.ok) {
      return new NextResponse(res.body, { 
        status: res.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`[Proxy Route] Error fetching ${backendUrl}:`, error);
    const msg = error?.message || 'Proxy fetch failed';
    const status = error.name === 'AbortError' ? 504 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export { handleRequest as GET, handleRequest as POST, handleRequest as PUT, handleRequest as DELETE };
