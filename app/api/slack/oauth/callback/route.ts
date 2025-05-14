import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/?error=${error}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?error=missing_code', request.url));
  }

  try {
    const client = new WebClient();
    const result = await client.oauth.v2.access({
      client_id: process.env.SLACK_CLIENT_ID as string,
      client_secret: process.env.SLACK_CLIENT_SECRET as string,
      code,
      redirect_uri: process.env.SLACK_REDIRECT_URL + '/api/slack/oauth/callback'
    });

    if (!result.ok) {
      throw new Error(result.error as string);
    }

    // Redirect back to the main page with the token
    const botToken = result.access_token;
    return NextResponse.redirect(new URL(`/?token=${botToken}`, request.url));
  } catch (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(new URL('/?error=oauth_failure', request.url));
  }
}