import { NextRequest, NextResponse } from 'next/server';
import { getAppData } from '@/utils/server/appDataCache';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    
    if (!slug) {
      return NextResponse.json(
        { error: 'Missing slug parameter' },
        { status: 400 }
      );
    }
    
    console.log('API route fetching app with slug:', slug);
    
    // Use the cached app data utility
    const data = await getAppData(slug);

    if (!data) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    );
  }
} 