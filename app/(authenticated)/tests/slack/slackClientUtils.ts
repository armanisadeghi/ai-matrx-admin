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

  async sendMessage(message: SlackMessage): Promise<any> {
    try {
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(message)
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
      const response = await fetch('https://slack.com/api/conversations.list', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
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
      const formData = new FormData();
      formData.append('file', file);
      formData.append('channels', channel);
      formData.append('title', title);

      const response = await fetch('https://slack.com/api/files.upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
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