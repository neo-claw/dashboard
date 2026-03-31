import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL;
const BACKEND_API_KEY = process.env.BACKEND_API_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!BACKEND_URL || !BACKEND_API_KEY) {
      return NextResponse.json({ error: 'Backend not configured' }, { status: 503 });
    }
    const body = await request.json();
    const resp = await fetch(`${BACKEND_URL}/api/v1/activity/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BACKEND_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
