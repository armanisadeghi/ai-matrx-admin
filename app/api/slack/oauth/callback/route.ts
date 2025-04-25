import { NextRequest } from 'next/server';
import { WebClient } from '@slack/web-api';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return new Response('Missing code parameter', { status: 400 });
  }

  const client = new WebClient();

  try {
    const response = await client.oauth.v2.access({
      client_id: process.env.SLACK_CLIENT_ID as string,
      client_secret: process.env.SLACK_CLIENT_SECRET as string,
      code,
      redirect_uri: `${process.env.SLACK_REDIRECT_URL}/api/slack/oauth/callback`,
    });

    console.log('Slack OAuth Response:', response);

    // Get the bot token
    const botToken = response.access_token;

    if (!botToken) {
      return new Response('No access token received from Slack', { status: 500 });
    }

    // Instead of showing the token on the page, redirect back to main page with token as query param
    // The frontend will handle storing it in localStorage
    return Response.redirect(`${process.env.SLACK_REDIRECT_URL}?token=${botToken}`, 302);
  } catch (error) {
    console.error('OAuth error:', error);
    return new Response('OAuth failed: ' + (error instanceof Error ? error.message : 'Unknown error'), { status: 500 });
  }
}