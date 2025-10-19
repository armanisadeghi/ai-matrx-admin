// workflows/components/nodes/TriggerNode.tsx
import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { MessageCircle, Zap } from 'lucide-react';

function TriggerNode({ data, isConnectable }) {
  return (
    <div className="border border-gray-300 rounded-lg bg-textured shadow-md w-52">
      <div className="absolute -left-3 top-1/2 transform -translate-y-1/2">
        <div className="flex items-center justify-center w-6 h-6 bg-red-300 dark:bg-gray-700 rounded-md">
          <Zap className="h-4 w-4 text-red-600 dark:text-gray-300" />
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex items-center">
          <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg mr-3">
            <MessageCircle className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          </div>
          <div>
            <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{data.label}</div>
          </div>
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-400"
      />
    </div>
  );
}

export default memo(TriggerNode);