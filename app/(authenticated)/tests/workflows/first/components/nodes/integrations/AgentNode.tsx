// src/components/nodes/AgentNode.jsx
import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Bot } from 'lucide-react';

function AgentNode({ data, isConnectable }) {
  return (
    <div className="border border-gray-300 rounded-lg bg-white dark:bg-gray-800 shadow-md w-64">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-400"
      />
      
      <div className="p-4">
        <div className="flex items-center">
          <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg mr-3">
            <Bot className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{data.label}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{data.subLabel}</div>
          </div>
        </div>
        
        <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
          {data.props && data.props.map((prop, index) => (
            <div 
              key={index}
              className="flex items-center mb-2"
            >
              <div className="w-3 h-3 bg-indigo-400 rounded-full mr-2"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">{prop}</span>
            </div>
          ))}
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

export default memo(AgentNode);