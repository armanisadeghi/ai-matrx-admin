import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    // Your Slack client ID and secret (kept secure on the server)
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = `${process.env.SLACK_REDIRECT_URL}/api/slack-callback`;

    if (!clientId || !clientSecret) {
      throw new Error('Slack client credentials are not configured');
    }

    // Exchange the authorization code for an access token
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri
      })
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to exchange code for token' },
        { status: response.status }
      );
    }

    const tokenData = await response.json();

    if (!tokenData.ok) {
      return NextResponse.json(
        { error: tokenData.error || 'Slack API error' },
        { status: 400 }
      );
    }

    // Return the token data to the client
    return NextResponse.json(tokenData);
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Create a GET route to handle the initial callback from Slack
// This time we'll handle the code via a client-side redirect
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  
  // Instead of server-side redirect, we'll pass these parameters
  // in the URL and handle them client-side
  return NextResponse.redirect(new URL(`/?slackCode=${code || ''}&slackError=${error || ''}`, request.url));
}