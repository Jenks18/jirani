import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
    console.log('Testing Supabase connection...');
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Supabase Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    // Simple connection test without RPC
    const { data: testData, error: testError } = await supabase
      .from('reports')
      .select('count(*)', { count: 'exact' })
      .limit(1);
    
    if (testError) {
      console.log('Error querying reports table:', testError);
      return NextResponse.json({ 
        success: false, 
        error: testError.message,
        code: testError.code,
        details: testError.details,
        hint: testError.hint,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Connected to Supabase successfully',
      count: testData,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL
    });
    
  } catch (error) {
    const err = error as Error;
    console.error('Debug error:', err);
    return NextResponse.json({ 
      success: false, 
      error: err.message,
      stack: err.stack,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    });
  }
}
