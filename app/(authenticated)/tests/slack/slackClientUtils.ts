export interface SlackMessage {
  channel: string;
  text: string;
  blocks?: any[];
}

export interface SlackChannel {
  id: string;
  name: string;
}

export class SlackClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async joinChannel(channelId: string): Promise<boolean> {
    try {
      const response = await fetch('/api/slack/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: 'conversations.join',
          method: 'POST',
          token: this.token,
          body: { channel: channelId }
        })
      });

      const data = await response.json();
      return data.ok === true;
    } catch (error) {
      console.error('Error joining Slack channel:', error);
      return false;
    }
  }

  async sendMessage(message: SlackMessage): Promise<any> {
    try {
      // Try to join the channel first
      await this.joinChannel(message.channel);

      const response = await fetch('/api/slack/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: 'chat.postMessage',
          method: 'POST',
          token: this.token,
          body: message
        })
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Slack API Error: ${data.error}`);
      }

      return data;
    } catch (error) {
      console.error('Error sending message to Slack:', error);
      throw error;
    }
  }

  async listChannels(): Promise<SlackChannel[]> {
    try {
      const response = await fetch('/api/slack/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: 'conversations.list',
          method: 'GET',
          token: this.token
        })
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Slack API Error: ${data.error}`);
      }

      return data.channels.map((channel: any) => ({
        id: channel.id,
        name: channel.name
      }));
    } catch (error) {
      console.error('Error listing Slack channels:', error);
      throw error;
    }
  }

  async uploadFile(channel: string, file: File, title: string): Promise<any> {
    try {
      // Try to join the channel first
      await this.joinChannel(channel);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('channels', channel);
      formData.append('title', title);

      // Add token to formData for our proxy handler
      formData.append('token', this.token);

      const response = await fetch('/api/slack/proxy', {
        method: 'PUT', // We're using PUT for file uploads in our proxy
        body: formData
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Slack API Error: ${data.error}`);
      }

      return data;
    } catch (error) {
      console.error('Error uploading file to Slack:', error);
      throw error;
    }
  }
}