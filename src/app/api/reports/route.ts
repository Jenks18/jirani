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
  return NextResponse.json({
    events: mockReports,
    reports: mockReports,
    reportCount: mockReports.length,
    areaCount: 346
  });
}
