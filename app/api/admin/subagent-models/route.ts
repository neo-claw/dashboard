import { NextRequest, NextResponse } from 'next/server';
import { loadConfig, saveConfig } from '@/lib/subagent-models';

export async function GET() {
  try {
    const config = await loadConfig();
    return NextResponse.json(config);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { allowed_models, default_model, restricted } = body;

    // Load current config to preserve any missing fields
    const current = await loadConfig();

    const newConfig = {
      allowed_models: Array.isArray(allowed_models) ? allowed_models : current.allowed_models,
      default_model: default_model || current.default_model,
      restricted: typeof restricted === 'boolean' ? restricted : current.restricted,
    };

    await saveConfig(newConfig);
    return NextResponse.json({ success: true, config: newConfig });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
