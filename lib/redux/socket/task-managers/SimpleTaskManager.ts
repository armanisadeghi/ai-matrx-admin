// lib/redux/socket/task-managers/SimpleTaskManager.ts
import { BaseTaskManager, StreamOptions, TaskData } from "@/lib/redux/socket/task-managers/BaseTaskManager";
import { BaseTaskData } from "@/lib/redux/socket/task-data/base";

// Extend BaseTaskData for simple, dynamic task construction
export class SimpleTaskData extends BaseTaskData implements TaskData {
  constructor(taskName: string, index: number = 0) {
    super(taskName, index);
  }

  // Override to dynamically build taskData based on set properties
  protected buildTaskData(): Record<string, any> {
    const taskData: Record<string, any> = {};
    if (this.conversationId) taskData.conversation_id = this.conversationId;
    if (this.message) taskData.message_object = this.message;
    if (this.modelOverride) taskData.model_override = this.modelOverride;
    if (this.recipeId) taskData.recipe_id = this.recipeId;
    if (this.brokerValues.length > 0) taskData.broker_values = this.brokerValues;
    if (Object.keys(this.overrides).length > 0) taskData.overrides = this.overrides;
    if (this.metadata) taskData.metadata = this.metadata;
    if (this.urls) taskData.urls = this.urls;
    if (this.content) taskData.content = this.content;
    if (this.data) taskData.data = this.data;
    return taskData;
  }
}

export class SimpleTaskManager extends BaseTaskManager<SimpleTaskData, Record<string, any>> {
  // Match BaseTaskManager's naming convention
  protected readonly SERVICE: string;
  protected readonly TASK: string;

  constructor(serviceName: string, taskName: string) {
    super(serviceName, taskName);
    this.SERVICE = serviceName;
    this.TASK = taskName;
  }

  createTask(index: number = 0): SimpleTaskBuilder {
    return new SimpleTaskBuilder(this.TASK, this, index);
  }
}

// Builder class for fluent task construction
export class SimpleTaskBuilder {
  private taskData: SimpleTaskData;
  private manager: SimpleTaskManager;

  constructor(taskName: string, manager: SimpleTaskManager, index: number = 0) {
    this.taskData = new SimpleTaskData(taskName, index);
    this.manager = manager;
  }

  setArg(name: string, value: any): this {
    switch (name.toLowerCase()) {
      case "conversationid":
      case "conversation_id":
        this.taskData.setConversationId(value);
        break;
      case "message":
        this.taskData.setMessage(value);
        break;
      case "modeloverride":
      case "model_override":
        this.taskData.setModelOverride(value);
        break;
      case "recipeid":
      case "recipe_id":
        this.taskData.setRecipeId(value);
        break;
      case "brokervalues":
      case "broker_values":
        this.taskData.addBrokerValue(value);
        break;
      case "overrides":
        this.taskData.setOverrides(value);
        break;
      case "metadata":
        this.taskData.setMetadata(value);
        break;
      case "urls":
        this.taskData.setUrls(value);
        break;
      case "content":
        this.taskData.setContent(value);
        break;
      case "data":
        this.taskData.setData(value);
        break;
      default:
        this.taskData.setData({ ...(this.taskData["data"] || {}), [name]: value });
        break;
    }
    return this;
  }

  send(): Promise<string> {
    return this.manager.sendTask(this.taskData);
  }

  sendMultiple(tasks: SimpleTaskBuilder[]): Promise<string[]> {
    return this.manager.sendTasks(tasks.map((t) => t.taskData));
  }

  stream(options: StreamOptions<Record<string, any>> = {}): [() => void, () => string] {
    if (options.overrides) {
      this.taskData.setOverrides({ ...(this.taskData["overrides"] || {}), ...options.overrides });
    }
    return this.manager.streamTask(this.taskData, options);
  }

  streamAsync(options: Omit<StreamOptions<Record<string, any>>, "onComplete"> = {}): Promise<string> {
    if (options.overrides) {
      this.taskData.setOverrides({ ...(this.taskData["overrides"] || {}), ...options.overrides });
    }
    return this.manager.streamTaskAsync(this.taskData, options);
  }

  getTaskData(): SimpleTaskData {
    return this.taskData;
  }
}

const miscTaskManager = new SimpleTaskManager("misc_service", "log_event");

// // Example 1: Simple task with dynamic args
// const logTask = miscTaskManager
//   .createTask()
//   .setArg("eventName", "user_login")
//   .setArg("timestamp", Date.now())
//   .setArg("userId", "12345");

// logTask.send().then((eventName) => console.log(`Task sent, event: ${eventName}`));

// // Example 2: Streaming a task
// const streamTask = miscTaskManager
//   .createTask()
//   .setArg("content", "Process this text")
//   .setArg("customField", "some-value");

// const [cleanup, getText] = streamTask.stream({
//   onUpdate: (chunk, fullText) => console.log(`Chunk: ${chunk}, Full: ${fullText}`),
//   onComplete: (fullText) => console.log(`Completed: ${fullText}`),
//   onError: (error) => console.error(`Error: ${error}`),
// });

// // Example 3: Async streaming
// const asyncTask = miscTaskManager
//   .createTask()
//   .setArg("conversationId", "some-uuid")
//   .setArg("message", "Hello, world!");

// asyncTask.streamAsync().then((result) => console.log(`Result: ${result}`));