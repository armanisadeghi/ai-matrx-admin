import { ImageResponse } from 'next/og';
import { getAppData } from '@/utils/server/appDataCache';

export const runtime = 'edge';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;

    // Fetch app data using cached utility
    const data = await getAppData(slug);

    if (!data || !data.app_config) {
      return new ImageResponse(
        (
          <div
            style={{
              display: 'flex',
              fontSize: 60,
              color: 'white',
              background: '#000',
              width: '100%',
              height: '100%',
              textAlign: 'center',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            App Not Found
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      );
    }

    const app = data.app_config;
    const appName = app.name || 'Custom App';
    const appDescription = app.description || 'Interactive application';
    const primaryColor = app.primary_color || '#000000';
    const accentColor = app.accent_color || '#0070f3';
    
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: 60,
            color: 'white',
            background: primaryColor,
            width: '100%',
            height: '100%',
            padding: 50,
            textAlign: 'center',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 80, fontWeight: 'bold', marginBottom: 40 }}>
            {appName}
          </div>
          <div 
            style={{ 
              fontSize: 40, 
              maxWidth: '80%',
              color: 'rgba(255,255,255,0.9)' 
            }}
          >
            {appDescription}
          </div>
          <div 
            style={{ 
              marginTop: 60,
              background: accentColor,
              padding: '15px 40px', 
              borderRadius: 15,
              fontSize: 36
            }}
          >
            Open App
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating OpenGraph image:', error);
    return new Response('Error generating image', { status: 500 });
  }
} 