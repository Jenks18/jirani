import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { Database } from '@/lib/database.types';

type ReportInsert = Database['public']['Tables']['reports']['Insert'];

export async function POST() {
  try {
    // Insert sample data
    const sampleReports: ReportInsert[] = [
      {
        title: 'Traffic Accident',
        description: 'Minor vehicle collision on main road',
        latitude: -1.2921,
        longitude: 36.8219,
        severity: 'medium',
        status: 'pending',
        location_name: 'Nairobi Central',
        tags: ['traffic', 'accident']
      },
      {
        title: 'Power Outage',
        description: 'Electricity outage affecting several blocks',
        latitude: -1.2833,
        longitude: 36.8167,
        severity: 'high',
        status: 'pending',
        location_name: 'Westlands',
        tags: ['utilities', 'power']
      },
      {
        title: 'Road Construction',
        description: 'Ongoing road maintenance causing delays',
        latitude: -1.3000,
        longitude: 36.8300,
        severity: 'low',
        status: 'pending',
        location_name: 'Karen',
        tags: ['construction', 'traffic']
      }
    ];

    const { data, error } = await supabase
      .from('reports')
      .insert(sampleReports as any)
      .select();

    if (error) {
      throw error;
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Sample data inserted successfully',
      data 
    });
  } catch (error) {
    console.error('Error inserting sample data:', error);
    return NextResponse.json(
      { error: 'Failed to insert sample data', details: error instanceof Error ? error.message : error },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Use POST to insert sample data',
    endpoint: '/api/test-data'
  });
}
