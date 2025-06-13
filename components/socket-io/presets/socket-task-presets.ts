import { SchemaField, SOCKET_TASKS } from "../../../constants/socket-schema";
import { flexibleJsonParse } from "@/utils/json-utils";

/* Socket Task Preset Creation Guide

## **Overview**
This guide shows you how to create revolutionary presets that transform any application data into socket tasks with one-line execution.

---

## **🎯 Core Concept**

**Input:** Your application data + preset name  
**Output:** Executed socket task with real-time results  

```typescript
// One line to rule them all! 🔥
const taskId = await dispatch(createTaskFromPresetQuick({
  presetName: "your_preset_name",
  sourceData: yourAppData
})).unwrap();
```

---

## **📋 Step-by-Step Creation**

### **1. Define Your Preset**
Add to `constants/socket-task-presets.ts`:

```typescript
export const YOUR_PRESET_NAME: TaskPreset = {
  name: "your_preset_name",
  description: "What this preset does",
  targetTask: "target_socket_task_name",        // From SOCKET_TASKS
  service: "target_service_name",               // From SERVICE_TASKS
  fieldMappings: {
    // Map socket task fields to your data
    socket_field_name: {
      sourceField: "your.data.path",            // Dot notation supported
      transform?: (value) => transformedValue,  // Optional transformation
      defaultValue?: "fallback",               // Optional fallback
    }
  },
  validation?: (sourceData) => ({              // Optional validation
    isValid: true,
    errors: []
  })
};
```

### **2. Register Your Preset**
```typescript
export const TASK_PRESETS: Record<string, TaskPreset> = {
  // ... existing presets
  [YOUR_PRESET_NAME.name]: YOUR_PRESET_NAME,
};
```

---

## **🔧 Field Mapping Patterns**

### **Simple Path Mapping**
```typescript
socket_field: {
  sourceField: "user.profile.name"  // Gets user.profile.name from source
}
```

### **Function Mapping** 
```typescript
socket_field: {
  sourceField: (data) => ({
    custom_field: data.some_field,
    computed_value: data.a + data.b
  })
}
```

### **Array Transformation**
```typescript
user_inputs: {
  sourceField: "inputs",
  transform: (inputs) => inputs.map(input => ({
    broker_id: input.id,
    value: input.data
  }))
}
```

---

## **🎮 Usage Patterns**

### **Basic Usage**
```typescript
const taskId = await dispatch(createTaskFromPresetQuick({
  presetName: "your_preset_name",
  sourceData: yourData
})).unwrap();
```

### **Advanced Usage with Options**
```typescript
const result = await dispatch(createTaskFromPreset({
  presetName: "your_preset_name", 
  sourceData: yourData,
  options: {
    service: "custom_service",      // Override default service
    connectionId: "custom_conn",    // Override connection
    validateSource: false          // Skip validation
  }
})).unwrap();

// Access full result details
const { taskId, transformedData, preset } = result;
```

---

## **📡 Getting Results**

### **Using SocketAccordionResponse Component**
```tsx
const [taskId, setTaskId] = useState(null);

// After creating task
const createdTaskId = await dispatch(createTaskFromPresetQuick({...}));
setTaskId(createdTaskId);

// In your JSX
{taskId && <SocketAccordionResponse taskId={taskId} />}
```

### **Using Redux Selectors**
```typescript
// Get task status
const task = useAppSelector(state => selectTaskById(state, taskId));
const isComplete = task?.status === 'completed';

// Get responses  
const responses = useAppSelector(state => 
  selectResponsesByTaskId(state, taskId)
);
```

---

## **🏗️ Service & Task Reference**

### **Find Your Service**
Look in `SERVICE_TASKS` constant:
```typescript
workflow_service: {
  execute_single_step: EXECUTE_SINGLE_STEP,
  execute_step_quick: EXECUTE_STEP_QUICK,
  // ... other tasks
},
ai_chat_service: {
  run_recipe: RUN_RECIPE,
  // ... other tasks  
}
```

### **Find Your Task Schema**
Look in `SOCKET_TASKS` constant:
```typescript
execute_single_step: {
  step_definition: { DATA_TYPE: "object", REQUIRED: true },
  user_inputs: { DATA_TYPE: "array", REQUIRED: false },
  // ... other fields
}
```

---

## **✨ Quick Template**

```typescript
export const MY_DATA_TO_SOCKET_TASK: TaskPreset = {
  name: "my_data_to_socket_task",
  description: "Convert my app data to socket task",
  targetTask: "target_task_name",
  service: "target_service", 
  fieldMappings: {
    required_field: {
      sourceField: "data.field_path",
      required: true
    },
    optional_field: {
      sourceField: "other.path", 
      defaultValue: "default_value"
    },
    transformed_field: {
      sourceField: (data) => processMyData(data),
      transform: (value) => formatForSocket(value)
    }
  }
};
```

---

## **🚀 Integration Examples**

### **Button Click Handler**
```typescript
const handleExecute = async () => {
  try {
    const taskId = await dispatch(createTaskFromPresetQuick({
      presetName: "my_preset",
      sourceData: myComponentData
    })).unwrap();
    
    setExecutionTaskId(taskId);
    console.log("🚀 Executing:", taskId);
  } catch (error) {
    console.error("❌ Failed:", error);
  }
};
```

### **React Hook**
```typescript
const useSocketExecution = (presetName: string) => {
  const dispatch = useAppDispatch();
  const [taskId, setTaskId] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  
  const execute = async (sourceData: any) => {
    setIsExecuting(true);
    try {
      const id = await dispatch(createTaskFromPresetQuick({
        presetName, sourceData
      })).unwrap();
      setTaskId(id);
      return id;
    } finally {
      setIsExecuting(false);
    }
  };
  
  return { execute, taskId, isExecuting };
};
```

*/




// ===== TYPES & INTERFACES =====

export type SocketTaskName = keyof typeof SOCKET_TASKS;

export interface FieldMapper {
    sourceField: string | ((data: any) => any);  // Path or transformer function
    transform?: (value: any) => any;             // Custom transformation
    defaultValue?: any;                          // Fallback value if source is undefined
    required?: boolean;                          // Override schema requirement for this mapping
}

export interface TaskPreset {
    name: string;                                // Unique preset identifier
    description: string;                         // Human-readable description
    targetTask: SocketTaskName;                 // Which socket task to create
    service: string;                            // Which service to submit to
    fieldMappings: Record<string, FieldMapper>; // How to map fields
    preprocessor?: (data: any) => any;          // Transform source data before mapping
    postprocessor?: (taskData: any) => any;    // Transform task data after mapping
    validation?: (sourceData: any) => { isValid: boolean; errors: string[] }; // Custom validation
}

// ===== TRANSFORMATION UTILITIES =====

/**
 * Gets a value from source data using a field path (supports dot notation)
 */
function getValueByPath(obj: any, path: string): any {
    if (!path || !obj) return undefined;
    
    return path.split('.').reduce((current, key) => {
        return current && typeof current === 'object' ? current[key] : undefined;
    }, obj);
}

/**
 * Applies schema-aware type conversion to a value
 */
function convertBySchemaType(value: any, targetField: string, taskName: SocketTaskName): any {
    const schema = SOCKET_TASKS[taskName];
    if (!schema || !schema[targetField]) return value;
    
    const fieldDef = schema[targetField] as SchemaField;
    const expectedType = fieldDef.DATA_TYPE?.toLowerCase();
    
    if (value === undefined || value === null) {
        return fieldDef.DEFAULT;
    }
    
    try {
        switch (expectedType) {
            case "number":
                const numValue = typeof value === "string" ? parseFloat(value) : value;
                return isNaN(numValue) ? fieldDef.DEFAULT : numValue;
                
            case "integer":
                const intValue = typeof value === "string" ? parseInt(value, 10) : value;
                return isNaN(intValue) ? fieldDef.DEFAULT : intValue;
                
            case "boolean":
                if (typeof value === "boolean") return value;
                if (typeof value === "string") {
                    if (value === "true") return true;
                    if (value === "false") return false;
                }
                return fieldDef.DEFAULT;
                
            case "object":
                if (typeof value === "string") {
                    const result = flexibleJsonParse(value);
                    return result.success ? result.data : fieldDef.DEFAULT;
                }
                return typeof value === "object" ? value : fieldDef.DEFAULT;
                
            case "array":
                if (Array.isArray(value)) return value;
                if (typeof value === "string") {
                    const result = flexibleJsonParse(value);
                    return result.success && Array.isArray(result.data) ? result.data : fieldDef.DEFAULT;
                }
                return fieldDef.DEFAULT;
                
            case "string":
            default:
                return typeof value === "string" ? value : String(value || fieldDef.DEFAULT || "");
        }
    } catch (error) {
        console.warn(`Type conversion failed for field ${targetField}:`, error);
        return fieldDef.DEFAULT;
    }
}

/**
 * Transforms source data into task data using a preset
 */
export function transformDataWithPreset(sourceData: any, preset: TaskPreset): any {
    try {
        // Step 1: Run preprocessor if available
        const processedSource = preset.preprocessor ? preset.preprocessor(sourceData) : sourceData;
        
        // Step 2: Apply field mappings
        const taskData: any = {};
        
        for (const [targetField, mapper] of Object.entries(preset.fieldMappings)) {
            let value: any;
            
            // Get value from source
            if (typeof mapper.sourceField === "function") {
                value = mapper.sourceField(processedSource);
            } else {
                value = getValueByPath(processedSource, mapper.sourceField);
            }
            
            // Apply custom transform if provided
            if (mapper.transform) {
                value = mapper.transform(value);
            }
            
            // Use default if value is undefined
            if (value === undefined && mapper.defaultValue !== undefined) {
                value = mapper.defaultValue;
            }
            
            // Apply schema-aware type conversion
            value = convertBySchemaType(value, targetField, preset.targetTask);
            
            taskData[targetField] = value;
        }
        
        // Step 3: Fill in schema defaults for unmapped fields
        const schema = SOCKET_TASKS[preset.targetTask];
        for (const [fieldName, fieldDef] of Object.entries(schema)) {
            if (!(fieldName in taskData)) {
                const typedFieldDef = fieldDef as SchemaField;
                taskData[fieldName] = typedFieldDef.DEFAULT;
            }
        }
        
        // Step 4: Run postprocessor if available
        const finalTaskData = preset.postprocessor ? preset.postprocessor(taskData) : taskData;
        
        return finalTaskData;
    } catch (error) {
        console.error(`Failed to transform data with preset ${preset.name}:`, error);
        throw new Error(`Transformation failed: ${error.message}`);
    }
}

// ===== PRESET DEFINITIONS =====

/**
 * Transform a workflow step into an EXECUTE_SINGLE_STEP task
 */
export const WORKFLOW_STEP_TO_EXECUTE_SINGLE_STEP: TaskPreset = {
    name: "workflow_step_to_execute_single_step",
    description: "Convert a workflow step object to an EXECUTE_SINGLE_STEP socket task",
    targetTask: "execute_single_step",
    service: "workflow_service",
    fieldMappings: {
        single_node: {
            sourceField: (data: any) => data,  // Pass the entire node data directly
            required: true
        },
        user_inputs: {
            sourceField: "user_inputs",
            defaultValue: [],
            transform: (userInputs: any) => {
                if (!Array.isArray(userInputs)) return [];
                return userInputs.map(input => {
                    // If input doesn't have a 'value' key but has 'default_value', use default_value
                    if (typeof input === 'object' && input !== null && !('value' in input) && 'default_value' in input) {
                        return {
                            ...input,
                            value: input.default_value
                        };
                    }
                    return input;
                });
            }
        }
    },
    validation: (sourceData: any) => {
        const errors: string[] = [];
        
        if (!sourceData.function_id && !sourceData.id) {
            errors.push("Step must have a function_id or id");
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
};


/**
 * Transform recipe data into a RUN_RECIPE task
 */
export const RECIPE_DATA_TO_RUN_RECIPE: TaskPreset = {
    name: "recipe_data_to_run_recipe",
    description: "Convert recipe data to a RUN_RECIPE socket task",
    targetTask: "run_recipe",
    service: "ai_chat_service",
    fieldMappings: {
        recipe_id: {
            sourceField: "recipe_id",
            required: true
        },
        broker_values: {
            sourceField: "brokers",
            defaultValue: [],
            transform: (brokers: any) => {
                if (!Array.isArray(brokers)) return [];
                return brokers.map(broker => ({
                    name: broker.name || "",
                    id: broker.id || "",
                    value: broker.value || "",
                    ready: broker.ready !== false // Default to true
                }));
            }
        },
        overrides: {
            sourceField: "overrides",
            defaultValue: null
        },
        stream: {
            sourceField: "stream",
            defaultValue: true
        }
    }
};

/**
 * Transform workflow flow data into a START_WORKFLOW_WITH_STRUCTURE task
 */
export const FLOW_NODES_TO_START_WORKFLOW: TaskPreset = {
    name: "flow_nodes_to_start_workflow",
    description: "Convert workflow flow nodes to a START_WORKFLOW_WITH_STRUCTURE socket task for executing entire workflows",
    targetTask: "start_workflow_with_structure",
    service: "workflow_service",
    fieldMappings: {
        nodes: {
            sourceField: "nodes",
            defaultValue: [],
            transform: (nodes: any) => {
                if (!Array.isArray(nodes)) return [];
                // Filter out non-workflow nodes (userInput, brokerRelay) and return only BaseNode data
                return nodes
                    .filter(node => !node.type || (node.type !== 'userInput' && node.type !== 'brokerRelay'))
                    .map(node => node);
            },
            required: true
        },
        user_inputs: {
            sourceField: "user_inputs",
            defaultValue: [],
            transform: (userInputs: any) => {
                if (!Array.isArray(userInputs)) return [];
                return userInputs.map(input => {
                    // If input doesn't have a 'value' key but has 'default_value', use default_value
                    if (typeof input === 'object' && input !== null && !('value' in input) && 'default_value' in input) {
                        return {
                            ...input,
                            value: input.default_value
                        };
                    }
                    return input;
                });
            }
        },
        relays: {
            sourceField: "relays",
            defaultValue: [],
            transform: (relays: any) => {
                if (!Array.isArray(relays)) return [];
                return relays.map(relay => ({
                    source: relay.source || "",
                    targets: relay.targets || []
                }));
            }
        }
    },
    validation: (sourceData: any) => {
        const errors: string[] = [];
        
        if (!sourceData.nodes || !Array.isArray(sourceData.nodes)) {
            errors.push("Flow data must have a nodes array");
        }
        
        if (sourceData.nodes && sourceData.nodes.length === 0) {
            errors.push("Workflow must have at least one node to execute");
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
};

// ===== PRESET REGISTRY =====

export const TASK_PRESETS: Record<string, TaskPreset> = {
    [WORKFLOW_STEP_TO_EXECUTE_SINGLE_STEP.name]: WORKFLOW_STEP_TO_EXECUTE_SINGLE_STEP,
    [RECIPE_DATA_TO_RUN_RECIPE.name]: RECIPE_DATA_TO_RUN_RECIPE,
    [FLOW_NODES_TO_START_WORKFLOW.name]: FLOW_NODES_TO_START_WORKFLOW,
};

/**
 * Get a preset by name
 */
export function getPreset(presetName: string): TaskPreset | undefined {
    return TASK_PRESETS[presetName];
}

/**
 * Get all available preset names
 */
export function getAvailablePresets(): string[] {
    return Object.keys(TASK_PRESETS);
}

/**
 * Get presets that target a specific task
 */
export function getPresetsForTask(taskName: SocketTaskName): TaskPreset[] {
    return Object.values(TASK_PRESETS).filter(preset => preset.targetTask === taskName);
} 