import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { writeFile, readFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';

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
        // Continue even if join fails
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

      // Step 1: Get external upload URL
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
      console.log('Reading file into buffer for upload...');
      const fileBuffer = await readFile(tempFilePath);

      console.log(`Uploading to external URL (${uploadUrl})...`);

      // Determine content type based on file extension
      const fileExtension = path.extname(filename).toLowerCase();
      let contentType = 'application/octet-stream'; // Default

      // Set specific content types for common file types
      if (fileExtension === '.docx') {
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else if (fileExtension === '.xlsx') {
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (fileExtension === '.pdf') {
        contentType = 'application/pdf';
      } else if (fileExtension === '.txt') {
        contentType = 'text/plain';
      } else if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
        contentType = 'image/jpeg';
      } else if (fileExtension === '.png') {
        contentType = 'image/png';
      }

      console.log(`Using content type: ${contentType} for file extension: ${fileExtension}`);

      // Use fetch with automatic redirect following
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'Content-Length': fileSize.toString()
        },
        body: fileBuffer,
        // Allow redirects to be followed automatically
        redirect: 'follow'
      });

      if (!uploadResponse.ok) {
        console.error('Upload response error:', uploadResponse.status, uploadResponse.statusText);

        // Try to get more details from the response
        let responseText = '';
        try {
          responseText = await uploadResponse.text();
          console.error('Error response body:', responseText);
        } catch (e) {
          console.error('Could not read error response body');
        }

        return NextResponse.json(
            {
              ok: false,
              error: `Failed to upload file to external URL: ${uploadResponse.statusText}`,
              status: uploadResponse.status,
              details: responseText
            },
            { status: 500 }
        );
      }

      console.log('File uploaded to external URL successfully');

      // Optional: Log response details to debug
      try {
        const responseText = await uploadResponse.text();
        if (responseText) {
          console.log('Upload response body:', responseText.substring(0, 200) + '...');
        } else {
          console.log('Empty response body (this is normal for successful uploads)');
        }
      } catch (e) {
        console.log('Could not read response body (may be empty)');
      }

      // Step 3: Complete the upload by sharing the file
      console.log('Completing external upload...');

      const completeParams: any = {
        files: [{
          id: fileId,
          title: title
        }],
        channels: channels
      };

      if (initialComment) {
        completeParams.initial_comment = initialComment;
      }

      console.log('Complete upload params:', JSON.stringify(completeParams));

      try {
        const completeResponse = await client.files.completeUploadExternal(completeParams);
        console.log('External upload process completed successfully.');
        console.log('Complete response details:', JSON.stringify(completeResponse));

        // Send notification message with permalink to the file
        let notificationSent = false;

        try {
          if (completeResponse && completeResponse.files && completeResponse.files.length > 0) {
            const fileInfo = completeResponse.files[0];
            const filePermalink = fileInfo.permalink || '';
            const fileTitle = fileInfo.title || filename;
            const fileSize = fileInfo.size || stats.size;
            const formattedSize = formatFileSize(fileSize);

            console.log(`Sending notification message about file: ${fileTitle}`);
            await client.chat.postMessage({
              channel: channels,
              text: `📎 *File uploaded:* ${fileTitle} (${formattedSize})\n${filePermalink}`
            });

            notificationSent = true;
            console.log('Notification message sent successfully');
          }
        } catch (messageError: any) {
          console.log(`Could not send notification message: ${messageError.message}`);
          // Non-critical error
        }

        return NextResponse.json({
          ...completeResponse,
          notification_sent: notificationSent
        });
      } catch (completeError: any) {
        // Handle the "not_in_channel" error specifically
        if (completeError.message && completeError.message.includes('not_in_channel')) {
          console.log('Got not_in_channel error. This may be a private channel.');

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

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Configure the API route to handle large files
export const config = {
  api: {
    bodyParser: false,
    responseLimit: '100mb',
  },
};