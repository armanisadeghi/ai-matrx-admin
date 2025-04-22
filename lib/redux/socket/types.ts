// lib/redux/socket/types.ts

import { AVAILABLE_NAMESPACES, AVAILABLE_SERVICES, EVENT_TASKS, SERVICE_EVENTS } from "./constants/task-context";






// Namespace types
export type NamespaceKey = keyof typeof AVAILABLE_NAMESPACES;
export type NamespaceValue = typeof AVAILABLE_NAMESPACES[NamespaceKey];
export type Namespace = typeof AVAILABLE_NAMESPACES;

// Service types
export type ServiceKey = keyof typeof AVAILABLE_SERVICES;
export type ServiceValue = typeof AVAILABLE_SERVICES[ServiceKey];
export type Service = typeof AVAILABLE_SERVICES;

// Event types
export type ServiceWithEvents = keyof typeof SERVICE_EVENTS;
export type ServiceEventMap = typeof SERVICE_EVENTS;
export type ServiceEventArray<T extends ServiceWithEvents> = typeof SERVICE_EVENTS[T];
export type ServiceEvent = ServiceEventArray<ServiceWithEvents>[number];

// Task types
export type EventWithTasks = keyof typeof EVENT_TASKS;
export type EventTaskMap = typeof EVENT_TASKS;
export type EventTaskOptions<T extends EventWithTasks> = keyof typeof EVENT_TASKS[T];
export type EventTaskValue<T extends EventWithTasks> = typeof EVENT_TASKS[T][EventTaskOptions<T>];

// Helper type to ensure type safety when working with the complete hierarchy
export type ServiceHierarchy = {
    namespace: NamespaceKey;
    service: ServiceKey;
    event?: ServiceEvent;
    task?: EventTaskOptions<EventWithTasks>;
};

// Type guard to check if a service has events
export function hasEvents(service: ServiceKey): service is ServiceWithEvents {
    return service in SERVICE_EVENTS;
}


// Helper type for getting available events for a service
export type AvailableEvents<T extends ServiceKey> = T extends ServiceWithEvents
                                                    ? ServiceEventArray<T>[number]
                                                    : never;

// Helper type for getting available tasks for an event
export type AvailableTasks<T extends ServiceEvent> = T extends EventWithTasks
                                                     ? EventTaskOptions<T>
                                                     : never;


export interface RecipeOverrides {
    model_override: string;
    processor_overrides: Record<string, unknown>;
    other_overrides: Record<string, unknown>;
}

export interface RecipeTaskData {
    recipe_id: string;
    broker_values: BrokerValue[];
    overrides: RecipeOverrides;
}


export interface BrokerDefinitions {
    id: string;
    official_name: string;
    name?: string;
    data_type: string;
    required: boolean;
    default_value?: unknown;
    ready?: string;
}

export interface BrokerValue {
    id: string;
    official_name: string;
    data_type: string;
    value: unknown;
    ready: string;
    [key: string]: unknown;
}

export interface SocketTask {
    task: string;
    index: number;
    stream: boolean;
    taskData: any;
}

export interface RecipeSocketTask extends SocketTask {
    taskData: RecipeTaskData;
}

export interface SocketNamespace {
    name: string;
    description: string;
    availableEvents: string[];
}

export interface SocketService {
    id: string;
    name: string;
    description: string;
    events: SocketEvent[];
}

export interface SocketEvent {
    id: string;
    name: string;
    service: string;
    description: string;
    taskConfig: SocketTaskConfig;
}

export interface SocketTaskConfig {
    allowStreaming?: boolean;
    requiresBrokers?: boolean;
    allowsOverrides?: boolean;
    validationSchema?: any; // Zod schema for validation
}

export interface SocketTask {
    id: string;
    eventId: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    stream: boolean;
    payload: any;
    response?: any;
    error?: string;
    startTime?: string;
    endTime?: string;
}

export interface SocketBroker {
    id: string;
    name: string;
    official_name: string;
    value: any;
    ready: boolean;
    data_type: string;
    validation?: any; // Zod schema for validation
}

export interface SocketState {
    config: {
        namespaces: Record<string, SocketNamespace>;
        services: Record<string, SocketService>;
        events: Record<string, SocketEvent>;
    };
    connection: {
        status: 'disconnected' | 'connecting' | 'connected' | 'error';
        currentNamespace: string | null;
        error: string | null;
        lastConnected: string | null;
    };
    tasks: {
        active: Record<string, SocketTask>;
        history: Record<string, SocketTask>;
        queue: string[]; // Task IDs in queue
    };
    streams: {
        [taskId: string]: string[]; // Array of stream chunks
    };
}
