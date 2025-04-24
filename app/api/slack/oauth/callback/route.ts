import { NextRequest } from 'next/server';
import { WebClient } from '@slack/web-api';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return new Response('Missing code parameter', { status: 400 });
  }

  const client = new WebClient();

  console.log("Slack Client ID:", process.env.SLACK_CLIENT_ID);
  console.log("Slack Client Secret:", process.env.SLACK_CLIENT_SECRET);
  console.log("Slack Client Redirect URL:", `${process.env.SLACK_REDIRECT_URL}/api/slack/oauth/callback`);

  try {
    const response = await client.oauth.v2.access({
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      code,
      redirect_uri: `${process.env.SLACK_REDIRECT_URL}/api/slack/oauth/callback`,
    });

    console.log('Slack OAuth Response:', response);

    return new Response(`Slack app installed successfully! - ${response.access_token}`, { status: 200 });
  } catch (error) {
    console.error('OAuth error:', error);
    return new Response('OAuth failed', { status: 500 });
  }
}
