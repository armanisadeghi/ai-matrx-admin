import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { writeFile } from 'fs/promises';

export async function POST(request: NextRequest) {
  let tempFilePath = null;

  try {
    // Process the multipart form data
    const formData = await request.formData();
    const token = formData.get('token') as string;
    const channels = formData.get('channels') as string;
    const fileData = formData.get('file') as File;
    const filename = formData.get('filename') as string || fileData.name;
    const title = formData.get('title') as string || filename;
    const initialComment = formData.get('initial_comment') as string;

    if (!token || !fileData || !channels) {
      return NextResponse.json(
          { ok: false, error: 'Missing required parameters (token, file, or channels)' },
          { status: 400 }
      );
    }

    // Initialize the Slack Web Client with the provided token
    const client = new WebClient(token);

    try {
      // First, try to join the channel to prevent "not_in_channel" errors later
      console.log(`Attempting to join channel ${channels} before upload...`);
      try {
        await client.conversations.join({ channel: channels });
        console.log(`Successfully joined channel ${channels}`);
      } catch (joinError: any) {
        // Continue even if join fails - it might be a private channel or we're already a member
        console.log(`Note: Could not explicitly join channel (this is often normal): ${joinError.message}`);
      }

      console.log(`Processing file upload: ${filename} (${fileData.size} bytes) to channel ${channels}`);

      // Convert File to Buffer
      const arrayBuffer = await fileData.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Create a temporary file
      const tmpDir = os.tmpdir();
      tempFilePath = path.join(tmpDir, `slack-upload-${Date.now()}-${filename}`);

      console.log(`Writing to temporary file: ${tempFilePath}`);
      await writeFile(tempFilePath, buffer);

      console.log('Uploading file to Slack...');
      try {
        // Upload the file using filesUploadV2 with a file path instead of a buffer
        const result = await client.filesUploadV2({
          channel_id: channels,
          filename: filename,
          title: title,
          file: tempFilePath,
          initial_comment: initialComment || undefined
        });

        console.log('Upload successful:', result.ok);
        return NextResponse.json(result);
      } catch (uploadError: any) {
        if (uploadError.message && uploadError.message.includes('not_in_channel')) {
          console.log('Got not_in_channel error. This may be a private channel.');

          // Return a more helpful error message
          return NextResponse.json(
              {
                ok: false,
                error: `Bot is not in this channel. For private channels, please manually invite the bot using /invite @YourBotName before uploading files.`
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