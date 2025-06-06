export type RecipeInfo = {
    id: string;
    name: string;
    description?: string;
    version: number;
    status: string;
    post_result_options?: Record<string, unknown>;
    tags?: {
        tags: string[];
    }
};


export interface NeededBroker {
    id: string;
    name: string;
    required: boolean;
    dataType: string;
    defaultValue: string;
  }
  
  
export interface RecipeSourceConfig {
    id: string;
    compiledId: string;
    version: number;
    neededBrokers: NeededBroker[];
  }
  
  export interface RecipeConfig {
    sourceType?: "recipe";
    config?: RecipeSourceConfig
  }
  
