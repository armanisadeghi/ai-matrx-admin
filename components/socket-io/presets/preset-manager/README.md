# Socket Preset Manager

A modular, Redux-first system for executing socket tasks from presets with clean separation of concerns.

## Key Principles

- **Redux-First**: All state management goes through Redux - no complex local state
- **Modular**: Easy to swap trigger components, response components, and layouts
- **Minimal UI Opinions**: The core system doesn't force specific UI patterns
- **Clean Interfaces**: Well-defined TypeScript interfaces for all component contracts

## Core Components

### SocketPresetManager

The main orchestrator component that coordinates execution and renders trigger/response components.

```tsx
<SocketPresetManager
  config={{
    presetName: "my-preset",
    sourceData: { foo: "bar" },
    onExecuteStart: (data) => console.log('Starting:', data),
    onExecuteComplete: (taskId) => console.log('Complete:', taskId),
    onExecuteError: (error) => console.error('Error:', error),
  }}
  TriggerComponent={SocketButtonTrigger}
  ResponseComponent={SocketPanelResponseWrapper}
/>
```

### useSocketPresetExecution Hook

The core hook that handles Redux integration and execution logic:

```tsx
const { isExecuting, taskId, error, execute } = useSocketPresetExecution(config);
```

## Trigger Components

Components that implement `SocketPresetTriggerProps`:

### SocketButtonTrigger

A simple button trigger:

```tsx
<SocketButtonTrigger 
  config={config}
  onExecute={handleExecute}
  isExecuting={isExecuting}
  buttonText="Execute Task"
  variant="outline"
/>
```

## Response Components

Components that implement `SocketPresetResponseProps`:

### SocketPanelResponseWrapper

Wraps the existing SocketPanelResponse with the new interface:

```tsx
<SocketPanelResponseWrapper
  taskId={taskId}
  isExecuting={isExecuting}
  error={error}
/>
```

## Usage Examples

### Simple Usage

```tsx
import { SimpleExecuteExample } from './examples/SimpleExecuteExample';

<SimpleExecuteExample
  presetName="analyze-data"
  sourceData={{ input: "test" }}
  buttonText="Analyze"
/>
```

### Custom Layout

```tsx
<SocketPresetManager config={config} TriggerComponent={MyTrigger} ResponseComponent={MyResponse}>
  {({ triggerElement, responseElement, taskId, isExecuting, error }) => (
    <div className="my-custom-layout">
      <div className="trigger-area">{triggerElement}</div>
      <div className="response-area">{responseElement}</div>
      <div className="status">Status: {isExecuting ? 'Running' : 'Ready'}</div>
    </div>
  )}
</SocketPresetManager>
```

## Creating Custom Components

### Custom Trigger Component

```tsx
interface MyTriggerProps extends SocketPresetTriggerProps {
  customProp?: string;
}

const MyTrigger: React.FC<MyTriggerProps> = ({ config, onExecute, isExecuting, customProp }) => {
  return (
    <button 
      onClick={() => onExecute(config.sourceData)}
      disabled={isExecuting}
    >
      {customProp} - {isExecuting ? 'Running...' : 'Execute'}
    </button>
  );
};
```

### Custom Response Component

```tsx
const MyResponse: React.FC<SocketPresetResponseProps> = ({ taskId, isExecuting, error }) => {
  if (error) return <div>Error: {error}</div>;
  if (!taskId) return <div>No results yet</div>;
  
  return <div>Task {taskId} completed!</div>;
};
```

## Migration from SocketExecuteButton

The old `SocketExecuteButton` did too many things:
- ❌ Mixed UI, state, and execution logic
- ❌ Hard to customize specific parts
- ❌ Opinionated about layout and styling

The new system:
- ✅ Separates concerns cleanly
- ✅ Easy to swap any component
- ✅ Redux-first state management  
- ✅ Flexible layouts through composition
- ✅ Well-defined TypeScript interfaces

## Type Definitions

```tsx
interface SocketPresetExecutionConfig {
  presetName: string;
  sourceData: any;
  onExecuteStart?: (data: any) => void;
  onExecuteComplete?: (taskId: string) => void;
  onExecuteError?: (error: string) => void;
}

interface SocketPresetTriggerProps {
  config: SocketPresetExecutionConfig;
  onExecute: (data?: any) => void;
  isExecuting?: boolean;
}

interface SocketPresetResponseProps {
  taskId: string | null;
  isExecuting?: boolean;
  error?: string | null;
}
``` 