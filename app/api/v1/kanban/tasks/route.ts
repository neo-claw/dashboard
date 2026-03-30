import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL;
const BACKEND_API_KEY = process.env.BACKEND_API_KEY;

export async function GET(request: NextRequest) {
  try {
    if (!BACKEND_URL || !BACKEND_API_KEY) {
      return NextResponse.json({ error: 'Backend not configured' }, { status: 503 });
    }

    const resp = await fetch(`${BACKEND_URL}/api/v1/kanban/tasks`, {
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

export async function POST(request: NextRequest) {
  try {
    if (!BACKEND_URL || !BACKEND_API_KEY) {
      return NextResponse.json({ error: 'Backend not configured' }, { status: 503 });
    }

    const body = await request.json();

    const resp = await fetch(`${BACKEND_URL}/api/v1/kanban/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BACKEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
