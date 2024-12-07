// app/api/image-proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Set revalidate time to 15 minutes (900 seconds)
export const revalidate = 900;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
        return new NextResponse('Missing image URL', { status: 400 });
    }

    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();

        return new NextResponse(blob, {
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
                'Cache-Control': 'public, max-age=900, s-maxage=900, stale-while-revalidate=900',
                'Cross-Origin-Resource-Policy': 'cross-origin'
            },
        });
    } catch (error) {
        return new NextResponse('Error fetching image', { status: 500 });
    }
}
