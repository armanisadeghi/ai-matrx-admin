// Define parameter type information
export type ParameterType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface ParameterDefinition {
  name: string;
  type: ParameterType;
  description: string;
  required: boolean;
  defaultValue?: any;
}

// Define function metadata
export interface FunctionMetadata {
  name: string;
  displayName: string;
  description: string;
  category: string;
  parameters: ParameterDefinition[];
  returnType: string;
}

// Define dependencies that a function might require
export interface FunctionDependencies {
  [key: string]: any;
}

// Define registered function structure
export interface RegisteredFunction {
  metadata: FunctionMetadata;
  execute: (params: Record<string, any>, dependencies: FunctionDependencies) => Promise<any>;
  requiredDependencies: string[]; // Names of dependencies this function requires
}

// The registry to store all registered functions
const functionRegistry: Record<string, RegisteredFunction> = {};

/**
 * Register a function to make it available in applets
 */
export function registerFunction(
  metadata: FunctionMetadata,
  executeFunction: (params: Record<string, any>, dependencies: FunctionDependencies) => Promise<any>,
  requiredDependencies: string[] = []
): void {
  if (functionRegistry[metadata.name]) {
    console.warn(`Function ${metadata.name} is already registered. It will be overwritten.`);
  }
  
  functionRegistry[metadata.name] = {
    metadata,
    execute: executeFunction,
    requiredDependencies
  };
}

/**
 * Get all registered functions
 */
export function getAllRegisteredFunctions(): RegisteredFunction[] {
  return Object.values(functionRegistry);
}

/**
 * Get all registered functions by category
 */
export function getFunctionsByCategory(category: string): RegisteredFunction[] {
  return Object.values(functionRegistry).filter(fn => fn.metadata.category === category);
}

/**
 * Get a registered function by name
 */
export function getRegisteredFunction(name: string): RegisteredFunction | undefined {
  return functionRegistry[name];
}

/**
 * Execute a registered function by name with provided parameters and dependencies
 */
export async function executeFunction(
  name: string,
  params: Record<string, any>,
  dependencies: FunctionDependencies
): Promise<any> {
  const registeredFunction = functionRegistry[name];
  
  if (!registeredFunction) {
    throw new Error(`Function ${name} is not registered`);
  }
  
  // Validate required parameters
  const missingParams: string[] = [];
  registeredFunction.metadata.parameters.forEach(param => {
    if (param.required && params[param.name] === undefined) {
      missingParams.push(param.name);
    }
  });
  
  if (missingParams.length > 0) {
    throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
  }
  
  // Validate required dependencies
  const missingDeps: string[] = [];
  registeredFunction.requiredDependencies.forEach(dep => {
    if (dependencies[dep] === undefined) {
      missingDeps.push(dep);
    }
  });
  
  if (missingDeps.length > 0) {
    throw new Error(`Missing required dependencies: ${missingDeps.join(', ')}`);
  }
  
  // Execute the function with parameters and dependencies
  try {
    return await registeredFunction.execute(params, dependencies);
  } catch (error) {
    console.error(`Error executing function ${name}:`, error);
    throw error;
  }
} 