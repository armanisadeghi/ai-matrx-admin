// 4. Component Library Sidebar
// src/components/workflow/ComponentLibrary.jsx
import React, { useState } from 'react';
import { Search, Layers, GitBranch, User, Database, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useWorkflow } from './WorkflowContext';
import { MOCK_ACTION_TYPES, CATEGORIES } from '../workflowData';

const ComponentLibrary = () => {
  const { addAction, addBroker, addSource, addDestination } = useWorkflow();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedPanels, setExpandedPanels] = useState({
    actionLibrary: true,
    brokers: true
  });

  const togglePanel = (panel) => {
    setExpandedPanels(prev => ({
      ...prev,
      [panel]: !prev[panel]
    }));
  };

  // Filter actions by search term and category
  const filteredActions = MOCK_ACTION_TYPES.filter(action => {
    const matchesSearch = searchTerm === '' || 
      action.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      action.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || action.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
      {/* Action Library */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <button 
          className="w-full p-3 flex items-center justify-between font-medium"
          onClick={() => togglePanel('actionLibrary')}
        >
          <span className="flex items-center">
            <Layers className="mr-2" size={18} />
            Action Library
          </span>
          {expandedPanels.actionLibrary ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        
        {expandedPanels.actionLibrary && (
          <div className="p-2">
            <div className="relative mb-2">
              <input
                type="text"
                className="w-full pl-8 pr-2 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
                placeholder="Search actions..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-2 top-1.5 text-gray-400" size={16} />
            </div>
            
            <div className="flex flex-wrap gap-1 mb-2">
              {Object.entries(CATEGORIES).map(([category, icon]) => (
                <button
                  key={category}
                  className={`px-2 py-1 rounded-md text-xs flex items-center ${
                    selectedCategory === category 
                      ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200' 
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {React.cloneElement(icon, { size: 14, className: 'mr-1' })}
                  {category}
                </button>
              ))}
            </div>
            
            <div className="max-h-60 overflow-y-auto pr-1">
              {filteredActions.map(action => (
                <div 
                  key={action.id}
                  className="mb-1 p-2 bg-gray-50 dark:bg-gray-700 rounded-md cursor-move hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors border border-gray-200 dark:border-gray-600"
                  draggable
                  onDragEnd={() => addAction(action)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {CATEGORIES[action.category] && 
                        React.cloneElement(CATEGORIES[action.category], { 
                          size: 16, 
                          className: 'mr-2 text-indigo-600 dark:text-indigo-400' 
                        })
                      }
                      <span className="font-medium text-sm">{action.name}</span>
                    </div>
                    <Plus size={14} className="text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{action.description}</p>
                </div>
              ))}
              
              {filteredActions.length === 0 && (
                <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                  No actions match your search
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Brokers */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <button 
          className="w-full p-3 flex items-center justify-between font-medium"
          onClick={() => togglePanel('brokers')}
        >
          <span className="flex items-center">
            <GitBranch className="mr-2" size={18} />
            Brokers & Connections
          </span>
          {expandedPanels.brokers ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        
        {expandedPanels.brokers && (
          <div className="p-2">
            <div className="mb-1 p-2 bg-amber-50 dark:bg-amber-900/30 rounded-md cursor-move hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors border border-amber-200 dark:border-amber-800"
              onClick={addBroker}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <GitBranch size={16} className="mr-2 text-amber-600 dark:text-amber-400" />
                  <span className="font-medium text-sm">Data Broker</span>
                </div>
                <Plus size={14} className="text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Connects data between actions</p>
            </div>
            
            <div className="mb-1 p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-md cursor-move hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors border border-emerald-200 dark:border-emerald-800"
              onClick={addSource}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <User size={16} className="mr-2 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-medium text-sm">Input Source</span>
                </div>
                <Plus size={14} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">User-provided input data</p>
            </div>
            
            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-md cursor-move hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors border border-purple-200 dark:border-purple-800"
              onClick={() => addDestination('userOutput')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <User size={16} className="mr-2 text-purple-600 dark:text-purple-400" />
                  <span className="font-medium text-sm">Output Destination</span>
                </div>
                <Plus size={14} className="text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Send data to user or database</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComponentLibrary;
