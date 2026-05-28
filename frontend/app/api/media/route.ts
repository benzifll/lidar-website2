import { NextResponse } from 'next/server';
import { API_BASE } from '../../../lib/api';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  
  if (!path) {
    return new NextResponse('Missing path', { status: 400 });
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 
        'ngrok-skip-browser-warning': 'true' 
      }
    });

    return new NextResponse(res.body, {
      headers: { 
        'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new NextResponse('Proxy error', { status: 500 });
  }
}
