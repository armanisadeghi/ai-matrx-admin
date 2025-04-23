// lib/redux/socket-io/socket.types.ts

export interface SocketConfig {
    url: string;
    namespace?: string;
    auth?: Record<string, any>;
    transports?: ("polling" | "websocket")[];
}

  
  export interface SocketErrorObject {
    message?: string;
    type?: string;
    user_visible_message?: string;
    code?: string;
    details?: any;
  }
  