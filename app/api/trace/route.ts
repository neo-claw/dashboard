import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL;
const BACKEND_API_KEY = process.env.BACKEND_API_KEY;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionKey = searchParams.get('sessionKey') || 'main';
    const limit = searchParams.get('limit') || '50';

    if (!BACKEND_URL || !BACKEND_API_KEY) {
      return NextResponse.json({ error: 'Backend not configured' }, { status: 503 });
    }

    const resp = await fetch(`${BACKEND_URL}/api/v1/trace?sessionKey=${encodeURIComponent(sessionKey)}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${BACKEND_API_KEY}`,
      },
    });

    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
