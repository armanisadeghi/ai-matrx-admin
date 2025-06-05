You are working on the 'workflows' feature of the app.

This is a very large codebase so you must understand the structure for workflows and ensure you follow them exactly.

this is the path for this feature: 
@/features/workflows

The system uses next.js 15 App Router

We do not have src directory.

All components, hooks, utilities and things SPECIFIC to only workflows must live within this workflow 'feature' directory:

@/features/workflows/

├── constants.ts
├── developer-guidelines.md
├── components/
│   ├── WorkflowCard.tsx
│   ├── WorkflowsGrid.tsx
├── react-flow/
│   ├── common/
│   │   ├── NodeDeleteDialog.tsx
│   │   ├── workflowIcons.ts
│   ├── core/
│   │   ├── DebugOverlay.tsx
│   │   ├── NodeEditorManager.tsx
│   │   ├── QuickAccessPanel.tsx
│   │   ├── WorkflowCanvas.tsx
│   │   ├── WorkflowSystem.tsx
│   │   ├── WorkflowSystemProvider.tsx
│   │   ├── WorkflowToolbar.tsx
│   ├── edges/
│   │   ├── CustomEdge.tsx
│   ├── hooks/
│   │   ├── useWorkflowActions.ts
│   │   ├── useWorkflowData.ts
│   ├── node-editor/
│   │   ├── broker-relay-node-editor/
│   │   │   ├── BrokerRelayEditor.tsx
│   │   ├── user-input-node-editor/
│   │   │   ├── UserInputEditor.tsx
│   │   ├── workflow-node-editor/
│   │   │   ├── ArgumentsTab.tsx
│   │   │   ├── BrokersTab.tsx
│   │   │   ├── Dependencies.tsx
│   │   │   ├── example-custom-tab.md
│   │   │   ├── MappingsTab.tsx
│   │   │   ├── NodeObjectTab.tsx
│   │   │   ├── OverviewTab.tsx
│   │   │   ├── WorkflowNodeEditor.tsx
│   ├── nodes/
│   │   ├── BrokerRelayNode.tsx
│   │   ├── NodeFloatingIcon.tsx
│   │   ├── NodeWrapper.tsx
│   │   ├── UserInputNode.tsx
│   │   ├── WorkflowNode.tsx
├── service/
│   ├── workflowService.ts
│   ├── workflowTransformers.ts
├── types/
│   ├── backendTypes.ts
│   ├── index.ts
│   ├── nodeTypes.ts
│   ├── ui-types.ts
├── utils.ts/
│   ├── brokerEdgeAnalyzer.ts
│   ├── node-utils.ts


The Routes for workflows are here: app/(authenticated)/workflows

app/(authenticated)/workflowsworkflows/
├── error.tsx
├── layout.tsx
├── loading.tsx
├── page.tsx
├── new/
│   ├── loading.tsx
│   ├── page.tsx
├── [id]/
│   ├── loading.tsx
│   ├── not-found.tsx
│   ├── page.tsx


Maintain clean, organized code and do not add complexiy to the code.

Always utilize the proper utility functions and services we have for 'logic' and never change the structure of the core data. 

This structure is EXACTLY what we have to have in order for the workflows to actually run in Python so changes to the core data will be determental.

At the same time, UI changes and enhancements are ok and are encouraged, using the best and latest from React-Flow.