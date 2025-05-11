import { NextRequest, NextResponse } from 'next/server';
import { getAppData } from '@/utils/server/appDataCache';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  console.log(`[API-DEBUG ${requestId}] GET /api/apps/[slug] - Starting request`, {
    slug: '(Resolving params...)',
    headers: Object.fromEntries(req.headers),
    url: req.url
  });

  try {
    const resolvedParams = await params;
    const { slug } = resolvedParams;
    
    console.log(`[API-DEBUG ${requestId}] Params resolved:`, { slug });
    
    if (!slug) {
      console.error(`[API-DEBUG ${requestId}] Missing slug parameter`);
      return NextResponse.json(
        { error: 'Missing slug parameter', requestId },
        { status: 400 }
      );
    }
    
    console.log(`[API-DEBUG ${requestId}] Fetching app with slug:`, slug);
    
    try {
      // Use the cached app data utility
      const data = await getAppData(slug);
      const endTime = Date.now();
      
      if (!data) {
        console.error(`[API-DEBUG ${requestId}] App not found with slug: ${slug}`);
        return NextResponse.json(
          { error: "App not found", slug, requestId },
          { status: 404 }
        );
      }

      const responseData = {
        app_config: data.app_config,
        applets: data.applets,
      };

      console.log(`[API-DEBUG ${requestId}] Successfully fetched app in ${endTime - startTime}ms:`, {
        slug,
        appId: data.app_config?.id,
        appName: data.app_config?.name,
        appletsCount: data.applets?.length || 0
      });

      return NextResponse.json(responseData, {
        headers: {
          'x-request-id': requestId,
          'x-processing-time': `${endTime - startTime}ms`
        }
      });
    } catch (fetchError: any) {
      console.error(`[API-DEBUG ${requestId}] Error fetching app data:`, fetchError);
      
      return NextResponse.json(
        { 
          error: `Error fetching app data: ${fetchError.message || 'Unknown error'}`,
          details: fetchError.toString(),
          requestId
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    const endTime = Date.now();
    console.error(`[API-DEBUG ${requestId}] Unhandled error in API route (${endTime - startTime}ms):`, error);
    
    return NextResponse.json(
      { 
        error: error.message || 'An unhandled error occurred', 
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        requestId
      },
      { 
        status: 500,
        headers: {
          'x-request-id': requestId,
          'x-processing-time': `${endTime - startTime}ms`
        }
      }
    );
  }
} 