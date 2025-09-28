
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read reports from local JSON file
    const filePath = path.join(process.cwd(), 'data', 'reports.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const reports = JSON.parse(fileContents);

    const response = {
      events: reports,
      reports,
      reportCount: reports.length,
      areaCount: 346,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      source: 'local_json'
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports', details: error instanceof Error ? error.message : error },
      { status: 500 }
    );
  }
}
