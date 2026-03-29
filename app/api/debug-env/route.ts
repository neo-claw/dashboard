import { NextRequest, NextResponse } from 'next/server';

export function GET() {
  const backendUrlSet = !!process.env.BACKEND_URL;
  const backendApiKeySet = !!process.env.BACKEND_API_KEY;

  return NextResponse.json({
    backend_url_set: backendUrlSet,
    backend_api_key_set: backendApiKeySet,
    // Show a masked version of the URL (no secret)
    backend_url: backendUrlSet ? process.env.BACKEND_URL : undefined,
  });
}
