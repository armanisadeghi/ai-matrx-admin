import { useCallback, useMemo } from 'react';
import { Node, Edge } from '@xyflow/react';
import { useSelector } from 'react-redux';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { RootState } from '@/lib/redux/store';
import { workflowActions } from '@/lib/redux/workflow/slice';
import { workflowNodeActions } from '@/lib/redux/workflow-node/slice';
import { workflowNodeSelectors } from '@/lib/redux/workflow-node/selectors';
import { workflowSelectors } from '@/lib/redux/workflow/selectors';
import { saveWorkflowFromState } from '@/lib/redux/workflow/thunks';
import { nodeToReactFlow } from '../utils/nodeTransforms';

export const useWorkflowSync = (workflowId: string) => {
  const dispatch = useAppDispatch();
  
  // Get Redux state using selectors
  const workflowData = useAppSelector((state) => workflowSelectors.workflowById(state, workflowId));
  const workflowNodes = useAppSelector((state) => workflowNodeSelectors.nodesByWorkflowId(state, workflowId));
  const isLoading = useAppSelector(workflowSelectors.loading);
  
  // Get current theme
  const currentTheme = useSelector((state: RootState) => state.theme.mode);

  // Convert Redux data to React Flow format ONCE
  const initialNodes = useMemo(() => {
    return workflowNodes.map(nodeToReactFlow);
  }, [workflowNodes]);

  // Generate edges from business data connections ONCE
  const initialEdges = useMemo(() => {
    const edges: Edge[] = [];
    
    workflowNodes.forEach(node => {
      if (node.inputs) {
        node.inputs.forEach((input, inputIndex) => {
          if (input.source_broker_id) {
            // Find the source node that provides this broker (within the same workflow)
            const sourceNode = workflowNodes.find(n => 
              n.outputs?.some(output => output.broker_id === input.source_broker_id)
            );
            
            if (sourceNode) {
              const outputIndex = sourceNode.outputs?.findIndex(
                output => output.broker_id === input.source_broker_id
              ) ?? 0;
              
              edges.push({
                id: `${sourceNode.id}-${node.id}-${inputIndex}`,
                source: sourceNode.id,
                target: node.id,
                sourceHandle: `output-${outputIndex}`,
                targetHandle: `input-${inputIndex}`,
                type: 'smoothstep',
                animated: false,
                style: { 
                  strokeWidth: 2,
                  stroke: currentTheme === 'dark' ? '#6b7280' : '#374151',
                },
              });
            }
          }
        });
      }
    });
    
    return edges;
  }, [workflowNodes, currentTheme]);

  // Simple save function using Redux properly
  const saveWorkflow = useCallback(async (reactFlowNodes: Node[], reactFlowViewport: any) => {
    try {
      // 1. Update UI data in Redux using actions (exclude selected - it's runtime only)
      reactFlowNodes.forEach(node => {
        dispatch(workflowNodeActions.updateNodeUiData({
          nodeId: node.id,
          uiData: {
            position: node.position,
            width: node.measured?.width,
            height: node.measured?.height,
          }
        }));
      });

      // Update viewport in Redux for the selected workflow
      dispatch(workflowActions.updateViewport(reactFlowViewport));

      // 2. Use the new thunk that gets all data directly from state
      await dispatch(saveWorkflowFromState(workflowId)).unwrap();

      console.log('Workflow saved successfully!');
    } catch (error) {
      console.error('Failed to save workflow:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  }, [dispatch, workflowId]);

  return {
    initialNodes,
    initialEdges,
    initialViewport: workflowData?.viewport || { x: 0, y: 0, zoom: 1 },
    saveWorkflow,
    isLoading
  };
}; 