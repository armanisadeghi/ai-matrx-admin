import React, { useState } from 'react';
import { Lightbulb, Workflow, Bot, Zap, Globe } from 'lucide-react';

// The main component - accepts an onSelect callback and itemCounts object
const AppletSourceSelection = ({ onSelect, itemCounts = {} }) => {
  const [selectedSource, setSelectedSource] = useState(null);
  
  const sources = [
    {
      id: 'workflow',
      name: 'Workflow',
      icon: Workflow,
      description: 'Create automated sequences'
    },
    {
      id: 'ai-recipe',
      name: 'AI Recipe',
      icon: Lightbulb,
      description: 'Use pre-built AI solutions'
    },
    {
      id: 'ai-agent',
      name: 'AI Agent',
      icon: Bot,
      description: 'Deploy autonomous agents'
    },
    {
      id: 'action',
      name: 'Action',
      icon: Zap,
      description: 'Execute direct operations'
    },
    {
      id: 'api-integration',
      name: 'API Integration',
      icon: Globe,
      description: 'Connect external services'
    }
  ];

  const handleSelect = (source) => {
    const count = itemCounts[source.id] || 0;
    if (count === 0) return;
    
    setSelectedSource(source.id);
    if (onSelect) {
      onSelect(source.id);
    }
  };

  return (
    <div className="w-full py-4">
      <div className="flex flex-row space-x-3 overflow-x-auto pb-2">
        {sources.map((source) => {
          const count = itemCounts[source.id] || 0;
          const isDisabled = count === 0;
          const isSelected = selectedSource === source.id;
          
          return (
            <div
              key={source.id}
              onClick={() => handleSelect(source)}
              className={`
                relative rounded-lg border flex-1 min-w-36 p-3 flex flex-col items-center text-center 
                transition-all duration-200 cursor-pointer
                ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md'}
                ${isSelected 
                  ? 'border-slate-600 dark:border-slate-400 bg-slate-100 dark:bg-slate-800 ring-2 ring-slate-200 dark:ring-slate-700' 
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'}
              `}
            >
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center mb-2
                ${isSelected 
                  ? 'bg-slate-600 dark:bg-slate-500 text-white' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}
                transition-colors duration-200
              `}>
                {React.createElement(source.icon, { 
                  size: 20,
                  className: isDisabled ? 'text-slate-400 dark:text-slate-600' : ''
                })}
              </div>
              
              <h3 className="font-medium text-sm mb-1 text-slate-800 dark:text-slate-200">{source.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{source.description}</p>
              
              <div className={`
                absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full
                ${count > 0 
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600'}
              `}>
                {count}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AppletSourceSelection;
