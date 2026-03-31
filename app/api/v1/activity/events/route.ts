import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL;
const BACKEND_API_KEY = process.env.BACKEND_API_KEY;

export async function GET(request: NextRequest) {
  try {
    if (!BACKEND_URL || !BACKEND_API_KEY) {
      return NextResponse.json({ error: 'Backend not configured' }, { status: 503 });
    }
    const url = new URL(`${BACKEND_URL}/api/v1/activity/events`);
    url.search = request.url.split('?')[1] || '';
    const resp = await fetch(url.toString(), {
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
