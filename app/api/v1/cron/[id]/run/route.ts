import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL;
const BACKEND_API_KEY = process.env.BACKEND_API_KEY;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    if (!BACKEND_URL || !BACKEND_API_KEY) {
      return NextResponse.json({ error: 'Backend not configured' }, { status: 503 });
    }

    const resp = await fetch(`${BACKEND_URL}/api/v1/cron/${id}/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BACKEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      // No body needed
    });

    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
