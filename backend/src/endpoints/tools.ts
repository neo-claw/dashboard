import { NextRequest, NextResponse } from 'next/server';
import { toolRegistry } from '@/lib/toolRegistry';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skill = searchParams.get('skill');

    const tools = await toolRegistry.scanSkills();

    const filtered = skill
      ? tools.filter(t => t.skill === skill)
      : tools;

    return NextResponse.json({ tools: filtered });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}