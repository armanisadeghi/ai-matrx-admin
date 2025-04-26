export interface SlackMessage {
  channel: string;
  text: string;
  blocks?: any[];
}

export interface SlackChannel {
  id: string;
  name: string;
}

export interface FileUploadOptions {
  channel: string;
  file: File;
  filename?: string;
  title?: string;
  initialComment?: string;
}

export class SlackClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  // Helper method to call our proxy API
  private async callProxyApi(endpoint: string, method: string, body?: any): Promise<any> {
    try {
      const response = await fetch('/api/slack/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint,
          method,
          token: this.token,
          body
        })
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || 'Unknown Slack API error');
      }

      return data;
    } catch (error) {
      console.error(`Error in Slack API call to ${endpoint}:`, error);
      throw error;
    }
  }

  async joinChannel(channelId: string): Promise<boolean> {
    try {
      const result = await this.callProxyApi('conversations.join', 'POST', {
        channel: channelId
      });

      return result.ok === true;
    } catch (error) {
      console.error('Error joining Slack channel:', error);
      // Don't throw here - it's normal to fail for private channels
      return false;
    }
  }

  async sendMessage(message: SlackMessage): Promise<any> {
    try {
      // Try to join the channel first (this is optional but can be helpful)
      try {
        await this.joinChannel(message.channel);
      } catch (err) {
        // Continue even if join fails - might be a private channel where we're already a member
      }

      return await this.callProxyApi('chat.postMessage', 'POST', message);
    } catch (error) {
      console.error('Error sending message to Slack:', error);
      throw error;
    }
  }

  async listChannels(): Promise<SlackChannel[]> {
    try {
      const result = await this.callProxyApi('conversations.list', 'GET');

      return (result.channels || []).map((channel: any) => ({
        id: channel.id,
        name: channel.name
      }));
    } catch (error) {
      console.error('Error listing Slack channels:', error);
      throw error;
    }
  }

  // Upload file method using external upload route
  async uploadFile(options: FileUploadOptions): Promise<any> {
    const {
      channel,
      file,
      filename = file.name,
      title = filename,
      initialComment
    } = options;

    try {
      console.log(`Uploading file: ${filename} (${file.size} bytes) to channel ${channel}`);
      console.time('fileUpload');

      // Create FormData to send the file and parameters
      const formData = new FormData();
      formData.append('file', file);
      formData.append('channels', channel);
      formData.append('filename', filename);
      formData.append('title', title);
      formData.append('token', this.token);

      if (initialComment) {
        formData.append('initial_comment', initialComment);
      }

      // Create an AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`Upload timed out after 3 minutes`);
        controller.abort();
      }, 180000); // 3 minutes timeout

      try {
        // Always use the external upload endpoint
        const endpoint = '/api/slack/upload-external';
        console.log('Using external upload method');

        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.timeEnd('fileUpload');

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.ok) {
          throw new Error(`Error uploading file: ${data.error}`);
        }

        console.log('File uploaded successfully');

        // After successful upload, if the notification wasn't sent by the server,
        // try to send it from the client side
        if (data.files && data.files.length > 0 && !data.notification_sent) {
          try {
            const fileInfo = data.files[0];
            await this.sendFileNotification(channel, fileInfo);
          } catch (notifyError) {
            console.warn('Could not send file notification from client:', notifyError);
            // This is non-critical, so continue
          }
        }

        return data;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        console.timeEnd('fileUpload');

        if (fetchError.name === 'AbortError') {
          throw new Error(`Upload request timed out after 3 minutes`);
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('Error uploading file to Slack:', error);
      throw error;
    }
  }

  // Send a notification message about an uploaded file
  async sendFileNotification(channelId: string, fileInfo: any): Promise<any> {
    if (!fileInfo || !fileInfo.id) return;

    try {
      const fileTitle = fileInfo.title || fileInfo.name || 'file';
      const filePermalink = fileInfo.permalink || '';
      const fileSize = fileInfo.size ? this.formatFileSize(fileInfo.size) : '';

      return await this.sendMessage({
        channel: channelId,
        text: `📎 *File uploaded:* ${fileTitle} ${fileSize ? `(${fileSize})` : ''}\n${filePermalink}`
      });
    } catch (error) {
      console.error('Error sending file notification:', error);
      throw error;
    }
  }

  // Helper function to format file size
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}