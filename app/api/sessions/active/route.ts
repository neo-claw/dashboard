import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL;
  const backendApiKey = process.env.BACKEND_API_KEY;

  if (!backendUrl || !backendApiKey) {
    return NextResponse.json({ error: 'Backend not configured' }, { status: 500 });
  }

  try {
    const res = await fetch(`${backendUrl}/api/v1/sessions/active`, {
      headers: {
        Authorization: `Bearer ${backendApiKey}`,
      },
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
