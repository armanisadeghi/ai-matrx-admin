import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // Get request details from the client
    const { endpoint, method, body, token } = await req.json();

    if (!endpoint || !token) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Build the full Slack API URL
    const url = `https://slack.com/api/${endpoint}`;

    // Set up request options
    const fetchOptions: RequestInit = {
      method: method || 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8'
      }
    };

    // Add body for non-GET requests
    if (method !== 'GET' && body) {
      fetchOptions.body = JSON.stringify(body);
    }

    // Make the request to Slack API
    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    // Return the response to the client
    return NextResponse.json(data);

  } catch (error) {
    console.error('Slack API Proxy Error:', error);
    return NextResponse.json(
        { error: 'Failed to proxy request to Slack API' },
        { status: 500 }
    );
  }
}

// Special handler for file uploads
export async function PUT(req: NextRequest) {
  try {
    const formData = await req.formData();
    const token = formData.get('token') as string;

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    // Remove token from formData before forwarding to Slack
    formData.delete('token');

    // Build the full Slack API URL for file upload
    const url = 'https://slack.com/api/files.upload';

    // Make the request to Slack API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();

    // Return the response to the client
    return NextResponse.json(data);

  } catch (error) {
    console.error('Slack API File Upload Error:', error);
    return NextResponse.json(
        { error: 'Failed to upload file to Slack API' },
        { status: 500 }
    );
  }
}