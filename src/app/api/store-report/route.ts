
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const reportData = await req.json();
    // Insert the new report into Supabase
    const { data, error } = await supabase
      .from('reports')
      .insert([{ ...reportData }])
      .select();


    if (error) {
      // Log the full error object
      console.error('Supabase insert error:', error);
      // Return the full error object as a string for debugging
      return NextResponse.json({ error: JSON.stringify(error) }, { status: 500 });
    }

    return NextResponse.json({
      status: 'Report stored successfully',
      report: data && data[0] ? data[0] : null
    });
  } catch (error) {
    console.error('Store report error:', error);
    return NextResponse.json(
      { error: typeof error === 'object' ? JSON.stringify(error) : String(error) },
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
