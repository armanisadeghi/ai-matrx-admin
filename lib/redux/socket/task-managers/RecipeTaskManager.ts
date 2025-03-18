import { BaseTaskManager, StreamOptions } from "@/lib/redux/socket/task-managers/BaseTaskManager";
import { RecipeTaskData } from "@/lib/redux/socket/recipe-class/RecipeTaskData";

interface RecipeOverrides {
  modelOverride?: string;
  processorOverrides?: Record<string, any>;
  otherOverrides?: Record<string, any>;
}

export class RecipeTaskManager extends BaseTaskManager<RecipeTaskData, RecipeOverrides> {
  constructor() {
    super("simple_recipe", "run_recipe");
  }
  
  async runRecipeTasks(tasks: RecipeTaskData[]): Promise<string[]> {
    return this.sendTasks(tasks);
  }
  
  async runRecipeTask(task: RecipeTaskData): Promise<string> {
    return this.sendTask(task);
  }
  
  streamRecipe(
    recipeId: string,
    brokerId: string,
    value: string,
    options: StreamOptions<RecipeOverrides> = {}
  ): [() => void, () => string] {
    const taskData = new RecipeTaskData(recipeId, 0)
      .addBroker({
        id: brokerId,
        name: brokerId,
        value: value
      });
    
    if (options.overrides?.modelOverride) {
      taskData.setModelOverride(options.overrides.modelOverride);
    }
    
    if (options.overrides?.processorOverrides) {
      taskData.setProcessorOverrides(options.overrides.processorOverrides);
    }
    
    if (options.overrides?.otherOverrides) {
      taskData.setOtherOverrides(options.overrides.otherOverrides);
    }
    
    return this.streamTask(taskData, options);
  }
  
  streamRecipeAsync(
    recipeId: string,
    brokerId: string,
    value: string,
    options: Omit<StreamOptions<RecipeOverrides>, 'onComplete'> = {}
  ): Promise<string> {
    const taskData = new RecipeTaskData(recipeId, 0)
      .addBroker({
        id: brokerId,
        name: brokerId,
        value: value
      });
    
    if (options.overrides?.modelOverride) {
      taskData.setModelOverride(options.overrides.modelOverride);
    }
    
    if (options.overrides?.processorOverrides) {
      taskData.setProcessorOverrides(options.overrides.processorOverrides);
    }
    
    if (options.overrides?.otherOverrides) {
      taskData.setOtherOverrides(options.overrides.otherOverrides);
    }
    
    return this.streamTaskAsync(taskData, options);
  }
}