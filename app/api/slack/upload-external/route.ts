import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { writeFile, readFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch'; // Using node-fetch for server-side

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

      // Convert File to Buffer and save to temp file
      const arrayBuffer = await fileData.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Create a temporary file to store the data
      const tmpDir = os.tmpdir();
      tempFilePath = path.join(tmpDir, `slack-ext-upload-${Date.now()}-${filename}`);

      console.log(`Writing to temporary file: ${tempFilePath}`);
      await writeFile(tempFilePath, buffer);

      // Get file size from the saved file to ensure accuracy
      const stats = fs.statSync(tempFilePath);
      const fileSize = stats.size;

      console.log(`Getting external upload URL for ${filename} (${fileSize} bytes)`);

      // Step 1: Get external upload URL using proper parameters
      const externalUploadResponse = await client.files.getUploadURLExternal({
        filename: filename,
        length: fileSize
      });

      if (!externalUploadResponse.ok) {
        console.error('Failed to get external upload URL:', externalUploadResponse);
        return NextResponse.json(
            { ok: false, error: 'Failed to get external upload URL' },
            { status: 500 }
        );
      }

      const uploadUrl = externalUploadResponse.upload_url;
      const fileId = externalUploadResponse.file_id;

      console.log(`Got upload URL and file_id: ${fileId}`);

      // Step 2: Upload the file to the external URL
      // Read the entire file into a buffer to avoid redirect issues with streams
      console.log('Reading file into buffer for upload...');
      const fileBuffer = await readFile(tempFilePath);

      console.log(`Uploading to external URL (${uploadUrl})...`);

      // Use node-fetch but with redirect: 'manual' to prevent automatic redirect following
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': fileSize.toString()
        },
        body: fileBuffer,
        redirect: 'manual' // Don't automatically follow redirects
      });

      // Check for both successful responses and redirect responses (which we'll consider successful)
      if (!uploadResponse.ok && uploadResponse.status !== 307 && uploadResponse.status !== 302 && uploadResponse.status !== 301) {
        console.error('Upload response error:', uploadResponse.status, uploadResponse.statusText);
        return NextResponse.json(
            {
              ok: false,
              error: `Failed to upload file to external URL: ${uploadResponse.statusText}`,
              status: uploadResponse.status
            },
            { status: 500 }
        );
      }

      console.log('File uploaded to external URL successfully');

      // Step 3: Complete the upload by sharing the file
      console.log('Completing external upload...');

      // According to docs, we need to provide files array
      const fileInfo = { id: fileId };
      if (title) {
        fileInfo['title'] = title;
      }

      const completeParams: any = {
        files: [fileInfo]
      };

      // Add optional parameters if provided
      if (channels) {
        completeParams.channels = channels;
      }

      if (initialComment) {
        completeParams.initial_comment = initialComment;
      }

      console.log('Complete upload params:', JSON.stringify(completeParams));

      try {
        const completeResponse = await client.files.completeUploadExternal(completeParams);
        console.log('External upload process completed successfully');
        return NextResponse.json(completeResponse);
      } catch (completeError: any) {
        // Handle the "not_in_channel" error specifically
        if (completeError.message && completeError.message.includes('not_in_channel')) {
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

        console.error('Complete upload failed:', completeError);
        return NextResponse.json(
            { ok: false, error: completeError.message || 'Failed to complete the upload process' },
            { status: 500 }
        );
      }
    } catch (uploadError: any) {
      console.error('External upload error details:', uploadError);
      return NextResponse.json(
          {
            ok: false,
            error: uploadError.message || 'External upload failed',
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
    console.error('Error with external upload to Slack:', error);
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
    responseLimit: '100mb',
  },
};