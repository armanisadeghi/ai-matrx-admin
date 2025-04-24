import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const token = formData.get('token') as string;

    // Remove token before sending to Slack
    formData.delete('token');

    // Make the request to Slack API
    const response = await fetch('https://slack.com/api/files.upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    // Get the response from Slack
    const data = await response.json();

    // Return the response to the client
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in Slack file upload:', error);
    return NextResponse.json(
        { error: 'Failed to upload file to Slack' },
        { status: 500 }
    );
  }
}