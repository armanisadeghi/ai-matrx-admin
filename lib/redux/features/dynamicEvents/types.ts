// redux/features/dynamicEvents/types.ts

export interface DynamicEvent {
    eventName: string;
    namespace: string;
    sid: string;
    status: 'assigned' | 'streaming' | 'completed' | 'ongoing' | 'active' | 'inactive';
    textStream: string;
}


export interface TaskDetails {
    task: string;
    index: number;
    stream: boolean;
    taskData: Record<string, any>;
}

export interface EventDetails {
    event: string;
    tasks: TaskDetails[];
}
