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
│   │   ├── workflowIcons.ts
│   ├── components/
│   │   ├── CustomEdge.tsx
│   │   ├── NodeDeleteDialog.tsx
│   │   ├── NodeFloatingIcon.tsx
│   ├── core/
│   │   ├── DebugOverlay.tsx
│   │   ├── NodeEditorManager.tsx
│   │   ├── QuickAccessPanel.tsx
│   │   ├── WorkflowCanvas.tsx
│   │   ├── WorkflowSystem.tsx
│   │   ├── WorkflowSystemProvider.tsx
│   │   ├── WorkflowToolbar.tsx
│   ├── hooks/
│   │   ├── useWorkflowActions.ts
│   │   ├── useWorkflowData.ts
│   ├── node-editor/
│   │   ├── ArgumentsTab.tsx
│   │   ├── BrokersTab.tsx
│   │   ├── Dependencies.tsx
│   │   ├── example-custom-tab.md
│   │   ├── MappingsTab.tsx
│   │   ├── NodeEditor.tsx
│   │   ├── NodeObjectTab.tsx
│   │   ├── OverviewTab.tsx
│   ├── nodes/
│   │   ├── BrokerRelayEditor.tsx
│   │   ├── BrokerRelayNode.tsx
│   │   ├── UserInputEditor.tsx
│   │   ├── UserInputNode.tsx
│   │   ├── WorkflowNode.tsx
│   │   ├── WorkflowNodeWrapper.tsx
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