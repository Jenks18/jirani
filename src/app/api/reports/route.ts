import { NextResponse } from 'next/server';

const mockReports = [
  {
    _id: "test-westlands",
    dateTime: new Date().toISOString(),
    coordinates: { type: "Point", coordinates: [36.8055, -1.2655] },
    type: "Phone theft",
    severity: 4,
    summary: "Phone theft at Westlands Shopping Centre",
    location: "Westlands, Nairobi, Kenya",
    sourceType: "TEST"
  }
];

export async function GET() {
  try {
    console.log('API /reports called, returning mock data...');
    const response = {
      events: mockReports,
      reports: mockReports,
      reportCount: mockReports.length,
      areaCount: 346,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    };
    console.log('API /reports response:', response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports', details: error },
      { status: 500 }
    );
  }
}
