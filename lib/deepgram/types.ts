interface Message {
  role: string;
  content: string;
  id?: string;
}

export interface MessageMetadata extends Partial<Message> {
  start?: number;
  response?: number;
  end?: number;
  ttsModel?: string;
}
