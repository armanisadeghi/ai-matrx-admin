// app/api/slack/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { writeFile } from 'fs/promises';
import { getServerBroker } from '@/lib/server/brokerService';
import { cookies } from 'next/headers';

// Define broker identifiers
const BROKER_IDS = {
  token: { source: 'api', itemId: 'slack_token' },
  channels: { source: 'slack', itemId: 'slack_channels' },
  filename: { source: 'slack', itemId: 'slack_filename' },
  title: { source: 'slack', itemId: 'slack_title' },
  initialComment: { source: 'slack', itemId: 'slack_initial_comment' },
  sessionId: { source: 'user', itemId: 'session_id' }
} as const;

export async function POST(request: NextRequest) {
  let tempFilePath = null;
  
  try {
    // Get session ID from cookies or headers
    const cookiesObj = await cookies();
    const sessionId = cookiesObj.get('session-id')?.value || 
                     request.headers.get('x-session-id');
    
    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: 'No session ID found' },
        { status: 401 }
      );
    }

    // Get values from brokers instead of form data
    const [token, channels, filename, title, initialComment] = await Promise.all([
      getServerBroker(BROKER_IDS.token, sessionId),
      getServerBroker(BROKER_IDS.channels, sessionId),
      getServerBroker(BROKER_IDS.filename, sessionId),
      getServerBroker(BROKER_IDS.title, sessionId),
      getServerBroker(BROKER_IDS.initialComment, sessionId),
    ]);

    // File still needs to come from form data (can't be brokered)
    const formData = await request.formData();
    const fileData = formData.get('file') as File;

    if (!fileData) {
      return NextResponse.json(
        { ok: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate required broker values
    if (!token || !channels) {
      return NextResponse.json(
        { 
          ok: false, 
          error: 'Missing required broker values',
          details: {
            hasToken: !!token,
            hasChannels: !!channels
          }
        },
        { status: 400 }
      );
    }

    // Use broker values or fallbacks
    const uploadFilename = filename || fileData.name;
    const uploadTitle = title || uploadFilename;

    // Initialize the Slack Web Client with the broker token
    const client = new WebClient(token as string);

    try {
      // Try to join the channel (same as before)
      console.log(`Attempting to join channel ${channels} before upload...`);
      try {
        await client.conversations.join({ channel: channels as string });
        console.log(`Successfully joined channel ${channels}`);
      } catch (joinError: any) {
        console.log(`Note: Could not explicitly join channel: ${joinError.message}`);
      }

      console.log(`Processing file upload: ${uploadFilename} (${fileData.size} bytes) to channel ${channels}`);

      // Convert File to Buffer
      const arrayBuffer = await fileData.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Create a temporary file
      const tmpDir = os.tmpdir();
      tempFilePath = path.join(tmpDir, `slack-upload-${Date.now()}-${uploadFilename}`);
      
      console.log(`Writing to temporary file: ${tempFilePath}`);
      await writeFile(tempFilePath, buffer);

      console.log('Uploading file to Slack...');
      
      try {
        // Upload the file using broker values
        const result = await client.filesUploadV2({
          channel_id: channels as string,
          filename: uploadFilename,
          title: uploadTitle as string,
          file: tempFilePath,
          initial_comment: initialComment as string || undefined
        });

        console.log('Upload successful:', result.ok);
        
        // Optionally, save the result to a broker
        // await setServerBroker(
        //   { source: 'slack', itemId: 'last_upload_result' },
        //   result,
        //   sessionId
        // );

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
      token: await getServerBroker(BROKER_IDS.token).then(v => !!v),
      channels: await getServerBroker(BROKER_IDS.channels).then(v => !!v),
      filename: await getServerBroker(BROKER_IDS.filename).then(v => !!v),
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
    bodyParser: false,
    responseLimit: '50mb',
  },
};