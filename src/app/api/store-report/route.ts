import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const reportData = await req.json();
    
    // For now, just log the report data
    console.log('Storing report:', reportData);
    
    // TODO: Store in a proper database
    // For development, you could store in a JSON file similar to messages/events
    const reportsPath = path.join(process.cwd(), 'data', 'reports.json');
    
    let reports = [];
    try {
      const data = await fs.readFile(reportsPath, 'utf8');
      reports = JSON.parse(data);
    } catch (error) {
      console.log('Creating new reports.json file:', error);
    }
    
    const report = {
      id: Date.now().toString(),
      ...reportData,
      createdAt: new Date().toISOString()
    };
    
    reports.push(report);
    await fs.writeFile(reportsPath, JSON.stringify(reports, null, 2));
    
    return NextResponse.json({ 
      status: 'Report stored successfully',
      reportId: report.id 
    });
    
  } catch (error) {
    console.error('Store report error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Store Report API is working',
    note: 'Use POST to store a report'
  });
}
