// File: app/api/html/[id]/route.js
import { NextResponse } from 'next/server';

export async function GET(request, context) {
  // First await the entire params object
  const params = await context.params;
  // Then access the id property
  const id = params.id;
  
  try {
    const response = await fetch(`http://d88ooscwwggkcwswg8gks4s8.matrxserver.com:3000/html/${id}`);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch HTML: ${response.status}` },
        { status: response.status }
      );
    }
    
    const html = await response.text();
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error fetching HTML:', error);
    return NextResponse.json(
      { error: 'Failed to fetch HTML' },
      { status: 500 }
    );
  }
}