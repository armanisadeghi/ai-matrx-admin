// 3. Header Component
// src/components/workflow/WorkflowHeader.jsx
import React from 'react';
import { Play, Save, Download, Settings } from 'lucide-react';
import { useWorkflow } from './WorkflowContext';

const WorkflowHeader = () => {
  const { scale, setScale } = useWorkflow();

  const handleZoom = (delta) => {
    setScale(Math.min(Math.max(scale + delta, 0.5), 2));
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 flex justify-between items-center">
      <div className="flex space-x-2 items-center">
        <h1 className="font-bold text-lg">Workflow Builder</h1>
        <div className="flex space-x-1">
          <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <Play size={16} className="text-green-600 dark:text-green-400" />
          </button>
          <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <Save size={16} />
          </button>
          <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <Download size={16} />
          </button>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1 rounded-md bg-gray-100 dark:bg-gray-700 px-2 py-1">
          <button 
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            onClick={() => handleZoom(-0.1)}
          >
            -
          </button>
          <span className="w-12 text-center text-sm">{Math.round(scale * 100)}%</span>
          <button 
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            onClick={() => handleZoom(0.1)}
          >
            +
          </button>
        </div>
        <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
};

export default WorkflowHeader;
