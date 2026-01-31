// components/matrx/actions/createCustomAction.ts
import { EntityKeys, EntityData } from "@/types/entityTypes";

import { put, call, select } from "redux-saga/effects";
import {Cog} from "@mynaui/icons-react";
import {Rocket} from "lucide-react";
import {ActionDefinition} from "@/types/entityTableTypes";

// Action Guy: https://claude.ai/chat/76aecaf8-6275-43bb-bbdb-8d390f1080c7


// Instruction Types
type InstructionType =
    | 'setState'
    | 'dispatch'
    | 'saga'
    | 'api'
    | 'socket'
    | 'navigation'
    | 'transform'
    | 'condition'
    | 'delay'
    | 'sequence'
    | 'parallel';

interface Instruction {
    type: InstructionType;
    payload?: any;
    options?: Record<string, any>;
    onSuccess?: Instruction | Instruction[];
    onError?: Instruction | Instruction[];
    condition?: (context: any) => boolean;
}

interface CustomActionConfig<TEntity extends EntityKeys> {
    name: string;
    label: string | ((data: EntityData<TEntity>) => string);
    icon: React.ReactNode;
    instructions: Instruction | Instruction[];
    options?: {
        confirmation?: boolean | {
            title: string;
            message: string;
        };
        debounce?: number;
        retry?: {
            count: number;
            delay: number;
        };
        rollback?: boolean;
        logging?: boolean;
        onSuccess?: (result: any, context: any) => void;
        onError?: (error: any, context: any) => void;
    };
}

// Instruction Handlers
const instructionHandlers = {
    setState: async (payload: any, context: any) => {
        const { path, value } = payload;
        context.dispatch({
            type: 'entity/setState',
            payload: { path, value }
        });
    },

    dispatch: async (payload: any, context: any) => {
        context.dispatch(payload);
    },

    // Changed saga handler to use dispatch instead of yield
    saga: async (payload: any, context: any) => {
        const { saga, args } = payload;
        // Instead of yield, we dispatch the action
        context.dispatch({ type: saga, payload: args });
    },

    api: async (payload: any, context: any) => {
        const { endpoint, method, data } = payload;
        return await context.api[method](endpoint, data);
    },

    socket: async (payload: any, context: any) => {
        const { event, data, waitForResponse } = payload;
        return new Promise((resolve, reject) => {
            context.socket.emit(event, data);
            if (waitForResponse) {
                context.socket.once(`${event}:response`, resolve);
                context.socket.once(`${event}:error`, reject);
            } else {
                resolve(true);
            }
        });
    },

    navigation: async (payload: any, context: any) => {
        const { path, params } = payload;
        context.router.push(path + (params ? `?${new URLSearchParams(params)}` : ''));
    },

    transform: async (payload: any, context: any) => {
        const { transformer, data } = payload;
        return transformer(data, context);
    },

    condition: async (payload: any, context: any) => {
        const { condition, onTrue, onFalse } = payload;
        const result = await condition(context);
        return executeInstructions(result ? onTrue : onFalse, context);
    },

    delay: async (payload: any) => {
        const { duration } = payload;
        return new Promise(resolve => setTimeout(resolve, duration));
    },

    sequence: async (payload: Instruction[], context: any) => {
        for (const instruction of payload) {
            await executeInstructions(instruction, context);
        }
    },

    parallel: async (payload: Instruction[], context: any) => {
        await Promise.all(
            payload.map(instruction => executeInstructions(instruction, context))
        );
    }
};

// Helper to ensure instructions are always in array form
function normalizeInstructions(instructions: Instruction | Instruction[]): Instruction[] {
    return Array.isArray(instructions) ? instructions : [instructions];
        }

// Fixed executeInstructions to always work with arrays
async function executeInstructions(instructions: Instruction | Instruction[], context: any) {
    const normalizedInstructions = normalizeInstructions(instructions);
    for (const instruction of normalizedInstructions) {
            await executeInstructions(instruction, context);
        }
}

// Modified createCustomAction to use schema-aware fields
export function createCustomAction<TEntity extends EntityKeys>(
    config: CustomActionConfig<TEntity>
): ActionDefinition<TEntity> {
    return {
        name: config.name,
        label: config.label as string | ((data: EntityData<TEntity>) => string),
        icon: config.icon,
        type: 'custom',
        handler: async (context) => {
            if (config.options?.confirmation) {
                const confirm = typeof config.options.confirmation === 'object'
                                ? config.options.confirmation
                                : { title: 'Confirm Action', message: 'Are you sure?' };

                if (!window.confirm(confirm.message)) return;
            }

            try {
                const enhancedContext = {
                    ...context,
                    logger: config.options?.logging
                            ? console
                            : { log: () => {}, error: () => {} }
                };

                let attempt = 0;
                const maxAttempts = config.options?.retry?.count || 1;

                while (attempt < maxAttempts) {
                    try {
                        await executeInstructions(normalizeInstructions(config.instructions), enhancedContext);
                        break;
                    } catch (error) {
                        attempt++;
                        if (attempt === maxAttempts) throw error;
                        await new Promise(resolve =>
                            setTimeout(resolve, config.options?.retry?.delay || 1000)
                        );
                    }
                }
            } catch (error) {
                if (config.options?.rollback) {
                    // Implement rollback logic
                }
                throw error;
            }
        }
    };
}

/*
// Helper to get display field safely
function getDisplayField(data: EntityData<EntityKeys>): string {
    // Use the system's display field or primary key
    return data.displayField || data.pmid || Object.values(data)[0]?.toString() || 'Unnamed';
}
*/



