import { ReactNode } from 'react';
import {Dispatch} from "redux";
import { type VariantProps } from "class-variance-authority";
import {buttonVariants} from "@/components/ui";

export type CommandType =
    | 'entity'
    | 'feature'
    | 'module'
    | 'schema'
    | 'service'
    | 'navigation'
    | 'custom';

export type CommandScope =
    | 'single'
    | 'relationship'
    | 'custom';

export type CommandStatus = 'idle' | 'loading' | 'success' | 'error';

// Base Context Interface
export interface BaseContext {
    type: CommandType;
    scope: CommandScope;
    status?: CommandStatus;
    metadata?: Record<string, unknown>;
}

// Command Context that extends BaseContext
export interface CommandContext<
    TState = unknown,
    TParams = unknown
> extends BaseContext {
    stateKey?: string;
    state?: TState;
    params?: TParams;
    parentContext?: CommandContext;
}

export interface CommandResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: Error;
    context?: CommandContext;
}

// Base Command Configuration
export interface BaseCommandConfig {
    name: string;
    type: CommandType;
    scope: CommandScope;

    // Display properties
    component: React.ComponentType<any>;
    className?: string;
    label?: string;
    icon?: ReactNode;
    tooltip?: string;

    // Component variants
    variant?: VariantProps<typeof buttonVariants>["variant"];
    size?: VariantProps<typeof buttonVariants>["size"];

    // State and visibility
    defaultVisible?: boolean;
    defaultEnabled?: boolean;
    status?: CommandStatus;

    // Access control
    requiredPermissions?: string[];

    // Callbacks
    onBeforeExecute?: (context: CommandContext) => Promise<boolean>;
    onAfterExecute?: (result: CommandResult) => void;
    onError?: (error: Error, context: CommandContext) => void;

    // Optional metadata
    metadata?: Record<string, unknown>;
}

export interface TableCommandContext<TData = unknown> extends BaseContext {
    data: TData;
    rowId?: string | number;
    tableId?: string;
    selectedRows?: (string | number)[];
}

export interface TableCommandConfig<TData = unknown> extends BaseCommandConfig {
    // Table-specific configuration
    isVisible?: (context: TableCommandContext<TData>) => boolean;
    isEnabled?: (context: TableCommandContext<TData>) => boolean;
    onExecuteTable?: (context: TableCommandContext<TData>) => Promise<void>;
    onErrorTable?: (error: Error, context: TableCommandContext<TData>) => void;
}

export interface ReduxCommandContext<
    TState = unknown,
    TPayload = unknown
> extends BaseContext {
    sliceName: string;
    key: string | number;
    state: TState;
    dispatch: Dispatch;
    payload?: TPayload;
    relatedKeys?: (string | number)[];
}

export interface ReduxCommandConfig<
    TState = unknown,
    TPayload = unknown
> extends BaseCommandConfig {
    slice: {
        name: string;
        selector: (state: any, key: string | number) => TState;
        action: string | ((payload: TPayload) => any);
    };

    isVisible?: (context: ReduxCommandContext<TState, TPayload>) => boolean;
    isEnabled?: (context: ReduxCommandContext<TState, TPayload>) => boolean;
    hasPermission?: (context: ReduxCommandContext<TState, TPayload>) => boolean;

    onBeforeExecute?: (context: ReduxCommandContext<TState, TPayload>) => Promise<boolean>;
    onExecuteRedux?: (context: ReduxCommandContext<TState, TPayload>) => Promise<void>;
    onAfterExecuteRedux?: (context: ReduxCommandContext<TState, TPayload>) => Promise<void>;
    onErrorRedux?: (error: Error, context: ReduxCommandContext<TState, TPayload>) => void;

    parentHandler?: (context: ReduxCommandContext<TState, TPayload>) => Promise<void>;
}


// Command Handler Interface
export interface CommandHandler<TResult = void, TContext extends CommandContext = CommandContext> {
    execute: (context: TContext) => Promise<CommandResult<TResult>>;
    validate?: (context: TContext) => boolean | Promise<boolean>;
    prepare?: (context: TContext) => Promise<TContext>;
    cleanup?: (result: CommandResult<TResult>, context: TContext) => void;
}


export interface Command<
    TResult = void,
    TContext extends BaseContext = CommandContext
> {
    config: BaseCommandConfig;
    execute: (
        context?: TContext,
        callback?: (result: CommandResult<TResult>) => void
    ) => Promise<CommandResult<TResult>>;
    getContext: () => TContext;
    prepareExecution: () => Promise<TContext>;
}





// Base Command Configuration
export interface BaseCommandConfig {
    name: string;                      // Unique identifier
    type: CommandType;                 // Type of command
    scope: CommandScope;              // Scope of operation

    // Display properties
    component: React.ComponentType<any>; // The actual component to render
    className?: string;                 // Styling (for cn utility)
    label?: string;
    icon?: ReactNode;
    tooltip?: string;

    // State and visibility
    defaultVisible?: boolean;
    defaultEnabled?: boolean;
    status?: CommandStatus;

    // Access control
    requiredPermissions?: string[];

    // Context and handling
    context?: CommandContext;
    handler?: CommandHandler;           // Primary handler
    overrideHandler?: CommandHandler;   // Optional override handler

    // Callbacks
    onBeforeExecute?: (context: CommandContext) => Promise<boolean>;
    onAfterExecute?: (result: CommandResult) => void;
    onError?: (error: Error, context: CommandContext) => void;

    // Optional metadata
    metadata?: Record<string, unknown>;
}


// HOC Props for creating command components
export interface WithCommandProps<TProps = {}> {
    command: Command;
    onExecute?: (result: CommandResult) => void;
    onPrepare?: (context: CommandContext) => void;
    disableHandler?: boolean;         // Disable internal handler
    useCallbackOnly?: boolean;        // Use only callback handling
    className?: string;
    children?: ReactNode;
}
