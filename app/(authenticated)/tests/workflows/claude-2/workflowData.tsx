// 12. Data Files
// src/data/workflowData.js
import React from 'react';
import { Layers, Database, Circle, Workflow, User, GitBranch, FileDown } from 'lucide-react';

export const MOCK_ACTION_TYPES = [
  { id: 'process_data', name: 'Process Data', category: 'Data', description: 'Process data using specified algorithm', 
    inputs: [{name: 'data', type: 'object', required: true}, {name: 'algorithm', type: 'string', required: true}],
    outputs: [{name: 'processed_data', type: 'object'}, {name: 'stats', type: 'object'}]
  },
  // More actions...
];

export const CATEGORIES = {
  'All': <Layers size={18} />,
  'Data': <Database size={18} />,
  'AI': <Circle size={18} />,
  'Network': <Workflow size={18} />,
  'Communication': <User size={18} />,
  'Logic': <GitBranch size={18} />,
  'Database': <Database size={18} />,
  'Output': <FileDown size={18} />
};

// src/data/workflowStyles.js
export const COLORS = {
  action: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    border: 'border-indigo-300 dark:border-indigo-700',
    text: 'text-indigo-800 dark:text-indigo-200',
    shadow: 'shadow-indigo-300/20 dark:shadow-indigo-900/30'
  },
  broker: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    border: 'border-amber-300 dark:border-amber-700',
    text: 'text-amber-800 dark:text-amber-200',
    shadow: 'shadow-amber-300/20 dark:shadow-amber-900/30'
  },
  source: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    border: 'border-emerald-300 dark:border-emerald-700',
    text: 'text-emerald-800 dark:text-emerald-200',
    shadow: 'shadow-emerald-300/20 dark:shadow-emerald-900/30'
  },
  destination: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    border: 'border-purple-300 dark:border-purple-700',
    text: 'text-purple-800 dark:text-purple-200',
    shadow: 'shadow-purple-300/20 dark:shadow-purple-900/30'
  },
  input: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-blue-300 dark:border-blue-700',
    text: 'text-blue-800 dark:text-blue-200'
  },
  output: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    border: 'border-green-300 dark:border-green-700',
    text: 'text-green-800 dark:text-green-200'
  },
  selected: {
    border: 'border-cyan-500 dark:border-cyan-400',
    shadow: 'shadow-cyan-400/30 dark:shadow-cyan-300/30',
    ring: 'ring-2 ring-cyan-400 dark:ring-cyan-300'
  }
};