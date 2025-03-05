// types.ts
export interface Message {
    id: number;
    text: string;
    sender: 'user' | 'assistant';
    timestamp: string;
  }
  