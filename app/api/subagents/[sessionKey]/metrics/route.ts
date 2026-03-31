import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL;
const BACKEND_API_KEY = process.env.BACKEND_API_KEY;

export async function GET(request: NextRequest, { params }: { params: Promise<{ sessionKey: string }> }) {
  try {
    if (!BACKEND_URL || !BACKEND_API_KEY) {
      return NextResponse.json({ error: 'Backend not configured' }, { status: 503 });
    }

    const { sessionKey } = await params;
    const res = await fetch(`${BACKEND_URL}/api/v1/subagents/${encodeURIComponent(sessionKey)}/metrics`, {
      headers: {
        'Authorization': `Bearer ${BACKEND_API_KEY}`,
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
