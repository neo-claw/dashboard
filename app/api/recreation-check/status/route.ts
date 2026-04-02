import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CACHE_FILE = path.join(process.env.HOME || '/home/ubuntu', '.openclaw', 'workspace', 'cache', 'recreation-check-last-result.json');

export async function GET() {
  try {
    if (!fs.existsSync(CACHE_FILE)) {
      return NextResponse.json(
        { error: 'No cache found', hasCache: false },
        { status: 404 }
      );
    }

    const data = fs.readFileSync(CACHE_FILE, 'utf-8');
    const cache = JSON.parse(data);

    // Derive a simple status string
    const now = new Date();
    const lastCheck = new Date(cache.timestamp);
    const ageMinutes = (now.getTime() - lastCheck.getTime()) / (1000 * 60);
    const status = ageMinutes < 5 ? 'fresh' : ageMinutes < 30 ? 'stale' : 'old';

    return NextResponse.json({
      hasCache: true,
      status,
      lastCheck: cache.timestamp,
      ageMinutes: Math.round(ageMinutes * 10) / 10,
      campgroundIds: cache.campgroundIds,
      campgroundNames: cache.campgroundNames,
      startDate: cache.startDate,
      endDate: cache.endDate,
      hadAvailability: cache.hadAvailability,
      availableSitesCount: cache.availableSites?.length || 0,
    });
  } catch (error) {
    console.error('Recreation check status fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to read cache', hasCache: false },
      { status: 500 }
    );
  }
}
