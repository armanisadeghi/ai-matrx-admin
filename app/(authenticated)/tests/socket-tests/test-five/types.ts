// types.ts
export interface TaskData {
    [key: string]: any;
  }
  
  export interface Task {
    task: string;
    index: string;
    stream: string;
    taskData: TaskData;
  }
  
  export interface StreamingResponses {
    [key: string]: any;
  }
  
  export interface ResponseParserOptions {
    tryParseJson?: boolean;
  }
  
  export type NotificationHandler = (message: string) => void;