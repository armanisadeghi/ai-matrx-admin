// app/api/slack/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { writeFile } from 'fs/promises';
import { getServerBroker } from '@/lib/server/brokerService';
// Import cookies only if needed - removed for now

// Define broker identifiers
const BROKER_IDS = {
  token: { source: 'api', itemId: 'slack_token' },
  channels: { source: 'slack', itemId: 'slack_channels' },
  selectedChannel: { source: 'slack', itemId: 'selected_channel' },
  filename: { source: 'slack', itemId: 'slack_filename' },
  title: { source: 'slack', itemId: 'slack_title' },
  initialComment: { source: 'slack', itemId: 'slack_initial_comment' },
  sessionId: { source: 'user', itemId: 'session_id' }
} as const;

export async function POST(request: NextRequest) {
  let tempFilePath = null;
  
  try {
    // Get session ID from headers - simplified approach
    const sessionId = request.headers.get('x-session-id');
    
    // Log session ID detection for debugging
    console.log('Session ID detection:', {
      fromHeader: !!sessionId,
      sessionId
    });
    
    if (!sessionId) {
      return NextResponse.json(
        { 
          ok: false, 
          error: 'No session ID found',
          help: 'Please ensure you have an x-session-id header' 
        },
        { status: 401 }
      );
    }

    // Get values from brokers
    const [token, brokerChannels, selectedChannel, filename, title, initialComment] = await Promise.all([
      getServerBroker(BROKER_IDS.token, sessionId),
      getServerBroker(BROKER_IDS.channels, sessionId),
      getServerBroker(BROKER_IDS.selectedChannel, sessionId),
      getServerBroker(BROKER_IDS.filename, sessionId),
      getServerBroker(BROKER_IDS.title, sessionId),
      getServerBroker(BROKER_IDS.initialComment, sessionId),
    ]);

    // Get data from the request body
    const body = await request.json();
    const { 
      fileUrl, 
      fileType, 
      fileDetails,
      channel: requestChannel, // Allow channel to be provided in request
      title: requestTitle,
      initialComment: requestComment,
      notify
    } = body;

    if (!fileUrl) {
      return NextResponse.json(
        { ok: false, error: 'No file URL provided' },
        { status: 400 }
      );
    }

    // Use request channel first, then selected channel from broker, then fallback to generic channels
    const channel = requestChannel || selectedChannel || brokerChannels;

    // Validate required values
    if (!token || !channel) {
      return NextResponse.json(
        { 
          ok: false, 
          error: 'Missing required values',
          details: {
            hasToken: !!token,
            hasChannel: !!channel,
            sessionId
          }
        },
        { status: 400 }
      );
    }

    // Extract filename from URL or use broker value
    const urlFilename = fileUrl.split('/').pop()?.split('?')[0] || 'file';
    const uploadFilename = filename || urlFilename;
    const uploadTitle = requestTitle || title || uploadFilename;
    const uploadComment = requestComment || initialComment || '';

    // Initialize the Slack Web Client with the broker token
    const client = new WebClient(token as string);

    try {
      // Try to join the channel
      console.log(`Attempting to join channel ${channel} before upload...`);
      try {
        await client.conversations.join({ channel: channel as string });
        console.log(`Successfully joined channel ${channel}`);
      } catch (joinError: any) {
        console.log(`Note: Could not explicitly join channel: ${joinError.message}`);
      }

      console.log(`Processing file upload: ${uploadFilename} to channel ${channel}`);

      // Download the file from the URL
      console.log(`Downloading file from: ${fileUrl}`);
      const fileResponse = await fetch(fileUrl);
      
      if (!fileResponse.ok) {
        throw new Error(`Failed to download file: ${fileResponse.statusText}`);
      }
      
      const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());

      // Create a temporary file
      const tmpDir = os.tmpdir();
      tempFilePath = path.join(tmpDir, `slack-upload-${Date.now()}-${uploadFilename}`);
      
      console.log(`Writing to temporary file: ${tempFilePath}`);
      await writeFile(tempFilePath, fileBuffer);

      console.log('Uploading file to Slack...');
      
      try {
        // Upload the file using broker values
        const uploadOptions: any = {
          channel_id: channel as string,
          filename: uploadFilename,
          title: uploadTitle as string,
          file: tempFilePath,
        };
        
        // Only add initial_comment if it exists
        if (uploadComment) {
          uploadOptions.initial_comment = uploadComment as string;
        }
        
        // Handle notification preference if specified
        if (notify !== undefined) {
          uploadOptions.notify = Boolean(notify);
        }

        const result = await client.filesUploadV2(uploadOptions);

        console.log('Upload successful:', result.ok);
        
        return NextResponse.json(result);
      } catch (uploadError: any) {
        if (uploadError.message && uploadError.message.includes('not_in_channel')) {
          console.log('Got not_in_channel error. This may be a private channel.');
          return NextResponse.json(
            {
              ok: false,
              error: `Bot is not in this channel. For private channels, please manually invite the bot.`
            },
            { status: 403 }
          );
        }
        throw uploadError;
      }
    } catch (uploadError: any) {
      console.error('Upload error details:', uploadError);
      return NextResponse.json(
        {
          ok: false,
          error: uploadError.message || 'Upload failed',
          data: uploadError.data
        },
        { status: 500 }
      );
    } finally {
      // Clean up the temporary file
      if (tempFilePath) {
        try {
          console.log(`Cleaning up temporary file: ${tempFilePath}`);
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          console.warn('Failed to clean up temporary file:', cleanupError);
        }
      }
    }
  } catch (error: any) {
    console.error('Error uploading file to Slack:', error);
    
    // Log which brokers might be missing
    console.error('Broker availability:', {
      token: await getServerBroker(BROKER_IDS.token).then(v => !!v).catch(() => false),
      channels: await getServerBroker(BROKER_IDS.channels).then(v => !!v).catch(() => false),
      selectedChannel: await getServerBroker(BROKER_IDS.selectedChannel).then(v => !!v).catch(() => false),
    });
    
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

// Configure the API route to handle large files
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};