// app/api/slack-proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, method, payload, token } = body;

    // Construct the Slack API URL
    const url = `https://slack.com/api/${endpoint}`;

    console.log(`Proxying request to ${url}`);

    // Make the request to Slack API
    const response = await fetch(url, {
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: payload ? JSON.stringify(payload) : undefined
    });

    // Get the response from Slack
    const data = await response.json();

    if (!data.ok) {
      console.error(`Slack API error: ${data.error}`);
    }

    // Return the response to the client
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in Slack proxy:', error);
    return NextResponse.json(
        { error: 'Failed to proxy request to Slack API' },
        { status: 500 }
    );
  }
}