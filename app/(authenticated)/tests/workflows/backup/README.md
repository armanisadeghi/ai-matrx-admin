# Workflow Editor

The Workflow Editor is a powerful visual tool for creating, editing, and managing workflow diagrams using a node-based interface built with React Flow.

## Features

- **Interactive Workflow Canvas**: Create and edit workflow diagrams with a drag-and-drop interface
- **Multiple Node Types**: Support for various node types including triggers, agents, databases, APIs, and more
- **Node and Edge Properties**: Edit detailed properties for each node and connection
- **Broker System**: Map node inputs and outputs to universal broker IDs for seamless data flow
- **Dark Mode Support**: Full dark mode compatibility for comfortable viewing in any lighting condition
- **Debug Overlay**: Debug workflow data with the integrated JSON viewer
- **Context Menus**: Right-click context menu support for node operations
- **Quick Access Panel**: Quickly add commonly used node types

## Components

The Workflow Editor is built with a modular architecture consisting of these main components:

### Core Components

- `WorkflowEditor.tsx` - The main component that renders the editor canvas
- `WorkflowHeader.tsx` - Page header with title, status, and action buttons
- `WorkflowDebugOverlay.tsx` - Debug overlay for viewing workflow data

### Node Components

The editor supports multiple node types, each with its own component:

- `AgentNode` - For AI agent tasks
- `ToolNode` - For tool tasks
- `TriggerNode` - For workflow triggers
- `DatabaseNode` - For database operations
- `ApiNode` - For API calls
- `TransformNode` - For data transformations
- `ConditionalNode` - For conditional logic
- `LoopNode` - For loop operations
- `DelayNode` - For time delays
- `EmailNode` - For email operations
- `FileOperationNode` - For file operations
- `AuthenticationNode` - For authentication tasks
- `WebhookNode` - For webhook integrations
- `PersonalTaskNode` - For personal tasks
- `CalendarEventNode` - For calendar events

### Utility Components

- `NodeMenu.tsx` - Context menu for adding new nodes
- `NodeContextMenu.tsx` - Context menu for node operations
- `QuickAccessPanel.tsx` - Quick access panel for common node types
- `NodePropertyPanel.tsx` - Panel for editing node properties
- `EdgePropertyPanel.tsx` - Panel for editing edge (connection) properties
- `CustomEdge.tsx` - Custom edge component with labels

## Usage

### Basic Actions

- **Add a node**: Right-click on the canvas or use the quick access panel
- **Connect nodes**: Drag from a node handle to another node's handle
- **Select a node/edge**: Click on a node or edge to select it
- **Move a node**: Click and drag a node to reposition it
- **Delete a node/edge**: Select it and press the delete button in the property panel
- **Pan the canvas**: Click and drag on empty space, or use the controls
- **Zoom in/out**: Use the mouse wheel or zoom controls

### Node Operations

- **Edit node properties**: Click on a node to open the property panel
- **Duplicate a node**: Right-click on a node and select "Duplicate"
- **Delete a node**: Right-click on a node and select "Delete" or use the property panel
- **View node details**: Click on a node to see its properties

### Edge Operations

- **Edit edge properties**: Click on an edge to open the property panel
- **Change edge style**: Select an edge and modify its properties (color, width, style)
- **Add a label**: Select an edge and add a label via the property panel
- **Delete an edge**: Select an edge and click the delete button in the property panel

### Broker System

The Broker System is a powerful way to manage data flow between nodes without explicit edge connections:

- **Map Inputs to Brokers**: Each node can map its input parameters to broker IDs
- **Map Outputs to Brokers**: Each node can map its output results to broker IDs
- **Visualize Broker Connections**: Use the "Show Brokers" button to visualize data flow through brokers
- **Manage Brokers Per Node**: Right-click a node and select "Manage Brokers" to view/edit its broker mappings

#### Broker Workflow

1. Each node maps its required inputs and produced outputs to broker IDs
2. When a node produces output, it's stored in the associated broker
3. When a broker receives data, all nodes that depend on it are notified
4. Nodes can run once all their required input brokers have data

This system allows for more flexible, dynamic workflows where execution order is determined by data availability rather than explicit connections.

### Debug and Export

- **Debug workflow**: Click the "Debug" button to view the current workflow data
- **Save workflow**: Click the "Save" button to save the current workflow
- **Run workflow**: Click the "Run" button to execute the workflow

## Styling

The Workflow Editor includes comprehensive styling for both light and dark modes:

- `reactflow-dark.css` - Custom styling for dark mode React Flow components

## Customization

To add a new node type, follow these steps:

1. Create a new node component in the `nodes` directory
2. Add the node type to the `nodeTypes` mapping in `WorkflowEditor.tsx`
3. Add a new entry in the `addNewNode` function to handle the node creation
4. Add the node to the `NodeMenu.tsx` component for context menu access
5. Update the `getNodeColor` function in `NodePropertyPanel.tsx` to include the new node type color

## Troubleshooting

If you encounter any issues with the workflow editor:

1. Check the browser console for errors
2. Use the debug overlay to inspect the workflow data
3. Make sure all component dependencies are correctly imported

## Dependencies

- React Flow (`reactflow`) - For the core node-based diagramming functionality
- Lucide React icons (`lucide-react`) - For UI icons
- ThemeProvider - For theme management

## Contributing

When contributing to the Workflow Editor:

1. Maintain modular architecture
2. Ensure dark mode compatibility
3. Follow existing code patterns
4. Add appropriate comments
5. Update this README with any new features 



# Brokers

**Broker Definition**: Brokers are uniquely identified (UUID) data carriers in our system, defined in the `data_broker` table, that universally map inputs and outputs across workflows, recipes, and applets. They enable seamless value passing between nodes (UI components, functions, or APIs) by internally mapping node parameters and results to broker IDs. Brokers eliminate explicit edge-based dependencies in workflows by triggering node execution when all required broker values are available, supporting both dynamic data-driven and sequential control flows.

**Implementation Options**:
1. **Internal Node Mapping**: Each node (e.g., API, UI component) includes a configuration interface to map input parameters (e.g., `country`, `category`) and outputs (e.g., `top_stories`) to broker IDs. Stored as node metadata, mappings are managed via a visual workflow builder.
2. **Dynamic Edge Visualization**: Automatically generate workflow edges when a node’s output broker matches another’s input broker, reflecting data dependencies without enforcing control flow.
3. **Workflow Modes**:
   - **Broker-Driven**: Nodes execute when all input brokers are populated, enabling parallel, data-triggered execution.
   - **Sequential**: Traditional edge-based control flow for linear workflows.
   - **Hybrid**: Combines broker-driven flexibility with explicit control edges for mixed workflows.
4. **Storage**: Broker definitions (ID, type, source) reside in `data_broker`. Values are stored transiently or persistently based on workflow needs, linked to broker IDs.
5. **Dependency Management**: Nodes declare broker dependencies internally; a runtime checks broker availability to trigger execution, reducing explicit edge mappings.

**Recommendation**: Prioritize broker-driven mode with internal node mappings for flexibility, using dynamic edge visualization in the workflow builder to reflect broker relationships. Support hybrid mode for users needing explicit control flow. Store broker values transiently for performance, with optional persistence for critical workflows. This balances simplicity, flexibility, and scalability.