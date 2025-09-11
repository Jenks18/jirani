
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
    // Fetch all reports from Supabase
    const { data: reports, error } = await supabase
      .from('reports')
      .select('*')
      .order('dateTime', { ascending: false });

    if (error) {
      throw error;
    }

    const response = {
      events: reports,
      reports,
      reportCount: reports.length,
      areaCount: 346,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
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
