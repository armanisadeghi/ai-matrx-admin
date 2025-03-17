import { SocketManager } from "@/lib/redux/socket/manager";

// Generic type for task data classes
export interface TaskData {
  getTask(): any;
}

// Generic options for streaming
export interface StreamOptions<T = any> {
  onUpdate?: (chunk: string, fullText: string) => void;
  onError?: (error: string) => void;
  onComplete?: (fullText: string) => void;
  overrides?: T;
}

/**
 * Base class for all socket-based task managers
 */
export class BaseTaskManager<TData extends TaskData, TOverrides = any> {
  protected socketManager: SocketManager;
  
  // These will be overridden by child classes
  protected readonly SERVICE: string;
  protected readonly TASK: string;
  
  constructor(serviceName: string, taskName: string) {
    this.socketManager = SocketManager.getInstance();
    this.SERVICE = serviceName;
    this.TASK = taskName;
  }
  
  /**
   * Sends multiple tasks and returns the event names
   */
  async sendTasks(tasks: TData[]): Promise<string[]> {
    try {
      const taskArray = tasks.map(task => task.getTask());
      
      await new Promise<void>((resolve, reject) => {
        this.socketManager.getSocket().emit(this.SERVICE, taskArray, (response: any) => {
          if (response?.error) {
            reject(new Error(response.error));
          } else {
            resolve();
          }
        });
      });
      
      return taskArray.map(task => {
        const sid = this.socketManager.getSocket().id;
        return `${sid}_${this.TASK}_${task.index}`;
      });
    } catch (error) {
      console.error(`[${this.constructor.name}] Failed to run tasks:`, error);
      throw error;
    }
  }
  
  /**
   * Sends a single task and returns the event name
   */
  async sendTask(task: TData): Promise<string> {
    const eventNames = await this.sendTasks([task]);
    return eventNames[0];
  }
  
  /**
   * Streams a task with automatic event handling
   * Returns a cleanup function and a function to get the current response
   */
  streamTask(
    task: TData,
    options: StreamOptions<TOverrides> = {}
  ): [() => void, () => string] {
    let fullText = '';
    let unsubscribe: (() => void) | null = null;
    
    try {
      // Pre-calculate the event name before sending
      const sid = this.socketManager.getSocket().id;
      const taskObj = task.getTask();
      const eventName = `${sid}_${this.TASK}_${taskObj.index}`;
      
      // Set up event subscription first
      unsubscribe = this.socketManager.subscribeToEvent(eventName, (response: any) => {
        let chunk = '';
        
        if (response?.data) {
          chunk = response.data;
        } else if (typeof response === "string") {
          chunk = response;
        } else {
          return; // No valid data to process
        }
        
        fullText += chunk;
        options.onUpdate?.(chunk, fullText);
        
        // Check if this is the end of the stream
        if (response?.end || response?.done) {
          options.onComplete?.(fullText);
        }
      });
      
      // Send the task after subscription is ready
      this.sendTask(task).catch(err => {
        const errorMessage = err instanceof Error ? err.message : "An error occurred";
        options.onError?.(errorMessage);
        
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      options.onError?.(errorMessage);
    }
    
    // Return cleanup function and a way to get the current response
    return [
      () => {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
      },
      () => fullText
    ];
  }
  
  /**
   * Enhanced method that handles the entire process and returns a Promise
   */
  streamTaskAsync(
    task: TData,
    options: Omit<StreamOptions<TOverrides>, 'onComplete'> = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const [cleanup, _] = this.streamTask(
        task,
        {
          ...options,
          onComplete: (fullText) => {
            cleanup();
            resolve(fullText);
          },
          onError: (error) => {
            cleanup();
            reject(new Error(error));
          }
        }
      );
    });
  }
  
  getSocketManager(): SocketManager {
    return this.socketManager;
  }
}