import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const { endpoint, method, token, body } = await request.json();

    if (!endpoint || !method || !token) {
      return NextResponse.json(
          { ok: false, error: 'Missing required parameters' },
          { status: 400 }
      );
    }

    // Initialize the Slack Web Client with the provided token
    const client = new WebClient(token);

    // Call the appropriate Slack API method
    // We're using a dynamic approach to call methods like client.conversations.list, client.chat.postMessage, etc.
    const parts = endpoint.split('.');

    let apiMethod: any = client;
    for (const part of parts) {
      apiMethod = apiMethod[part];
    }

    if (typeof apiMethod !== 'function') {
      return NextResponse.json(
          { ok: false, error: `Invalid Slack API endpoint: ${endpoint}` },
          { status: 400 }
      );
    }

    // Call the API method with the provided body
    const result = await apiMethod(body || {});

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error calling Slack API:', error);
    return NextResponse.json(
        {
          ok: false,
          error: error.message || 'Unknown error',
          data: error.data
        },
        { status: 500 }
    );
  }
}