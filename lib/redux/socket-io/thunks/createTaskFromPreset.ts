import { createAsyncThunk } from "@reduxjs/toolkit";
import { 
    TaskPreset, 
    getPreset, 
    transformDataWithPreset,
    SocketTaskName 
} from "@/components/socket-io/presets/socket-task-presets";
import { createTask } from "./createTaskThunk";
import { submitTask, submitTaskNew } from "./submitTaskThunk";
import { nanoid } from "nanoid";
import { RootState } from "@/lib/redux/store";

// ===== INTERFACES =====

export interface CreateTaskFromPresetParams {
    presetName: string;
    sourceData: any;
    options?: {
        taskId?: string;           // Optional custom task ID
        connectionId?: string;     // Optional connection ID override
        service?: string;          // Optional service override
        autoExecute?: boolean;     // Whether to auto-execute after creation (default: false)
        validateSource?: boolean;  // Whether to run preset validation (default: true)
    };
}

export interface CreateTaskFromPresetResult {
    taskId: string;
    taskName: SocketTaskName;
    transformedData: any;
    validationResults?: {
        isValid: boolean;
        errors: string[];
    };
    preset: TaskPreset;
}

export interface CreateTaskFromPresetError {
    message: string;
    type: 'PRESET_NOT_FOUND' | 'VALIDATION_FAILED' | 'TRANSFORMATION_FAILED' | 'TASK_CREATION_FAILED';
    details?: any;
}

// ===== MAIN THUNK =====

/**
 * Revolutionary thunk that creates a socket task from application data using presets
 * 
 * @example
 * ```ts
 * // From any component:
 * const result = await dispatch(createTaskFromPreset({
 *   presetName: "workflow_step_to_execute_single_step",
 *   sourceData: workflowStep,
 *   options: { autoExecute: true }
 * }));
 * 
 * const taskId = result.payload.taskId; // That's it! 🚀
 * ```
 */
export const createTaskFromPreset = createAsyncThunk<
    CreateTaskFromPresetResult,
    CreateTaskFromPresetParams,
    {
        rejectValue: CreateTaskFromPresetError;
        state: RootState;
    }
>(
    "socketio/createTaskFromPreset",
    async (params, { dispatch, getState, rejectWithValue }) => {
        const { presetName, sourceData, options = {} } = params;
        const {
            taskId = nanoid(),
            validateSource = true,
            autoExecute = false
        } = options;

        try {
            // Step 1: Get the preset
            const preset = getPreset(presetName);
            if (!preset) {
                return rejectWithValue({
                    message: `Preset "${presetName}" not found`,
                    type: "PRESET_NOT_FOUND",
                    details: { availablePresets: Object.keys(preset || {}) }
                });
            }

            // Step 2: Validate source data if requested
            let validationResults: { isValid: boolean; errors: string[] } | undefined;
            if (validateSource && preset.validation) {
                validationResults = preset.validation(sourceData);
                if (!validationResults.isValid) {
                    return rejectWithValue({
                        message: `Source data validation failed: ${validationResults.errors.join(", ")}`,
                        type: "VALIDATION_FAILED",
                        details: { validationResults, sourceData }
                    });
                }
            }

            // Step 3: Transform the data using the preset
            let transformedData: any;
            try {
                const state = getState();
                transformedData = transformDataWithPreset(sourceData, preset, state);
            } catch (transformError) {
                return rejectWithValue({
                    message: `Data transformation failed: ${transformError.message}`,
                    type: "TRANSFORMATION_FAILED",
                    details: { transformError, sourceData, preset }
                });
            }

            // Step 4: Create the socket task
            try {
                await dispatch(createTask({
                    taskId,
                    taskName: String(preset.targetTask),
                    service: options.service || preset.service,
                    initialData: transformedData,
                    connectionId: options.connectionId
                })).unwrap();
            } catch (taskError) {
                return rejectWithValue({
                    message: `Task creation failed: ${taskError.message || 'Unknown error'}`,
                    type: "TASK_CREATION_FAILED",
                    details: { taskError, transformedData, preset }
                });
            }

            // Step 5: Submit the task for execution (using new performance-optimized version)
            try {
                await dispatch(submitTaskNew({ taskId })).unwrap();
                console.log(`✅ Task ${taskId} created and submitted successfully (performance mode)`);
            } catch (submitError) {
                return rejectWithValue({
                    message: `Task submission failed: ${submitError.message || 'Unknown error'}`,
                    type: "TASK_CREATION_FAILED",
                    details: { submitError, taskId, preset }
                });
            }

            // Step 6: Auto-execute if requested (now handled by submission)

            // Success! Return the result
            return {
                taskId,
                taskName: preset.targetTask,
                transformedData,
                validationResults,
                preset
            };

        } catch (error) {
            return rejectWithValue({
                message: `Unexpected error: ${error.message}`,
                type: "TASK_CREATION_FAILED",
                details: { error, params }
            });
        }
    }
);

// ===== HELPER THUNKS =====

/**
 * Quick thunk for the most common use case - just give me a task ID!
 */
export const createTaskFromPresetQuick = createAsyncThunk<
    string, // Just return the task ID
    { presetName: string; sourceData: any },
    { rejectValue: string }
>(
    "socketio/createTaskFromPresetQuick",
    async (params, { dispatch, rejectWithValue }) => {
        try {
            const result = await dispatch(createTaskFromPreset({
                presetName: params.presetName,
                sourceData: params.sourceData
            })).unwrap();
            
            return result.taskId;
        } catch (error) {
            return rejectWithValue(error.message || "Failed to create task from preset");
        }
    }
);

/**
 * Create and execute a task in one go
 */
export const createAndExecuteFromPreset = createAsyncThunk<
    CreateTaskFromPresetResult,
    CreateTaskFromPresetParams,
    { rejectValue: CreateTaskFromPresetError }
>(
    "socketio/createAndExecuteFromPreset",
    async (params, { dispatch, rejectWithValue }) => {
        try {
            // Create the task
            const result = await dispatch(createTaskFromPreset({
                ...params,
                options: {
                    ...params.options,
                    autoExecute: false // We'll handle execution manually
                }
            })).unwrap();

            // Execute the task
            // TODO: Add execution logic here when ready
            console.log(`Created task ${result.taskId}, execution pending...`);

            return result;
        } catch (error) {
            return rejectWithValue(error);
        }
    }
);

// ===== TYPE EXPORTS ===== 
// (Types are already exported as interfaces above) 