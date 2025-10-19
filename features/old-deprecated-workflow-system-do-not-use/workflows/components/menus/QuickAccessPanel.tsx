"use client";

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Brain, 
  Code, 
  User, 
  Database, 
  Mail, 
  Calendar, 
  FileText, 
  Webhook, 
  Search,
  Loader,
  Filter,
  ChevronDown,
  ChevronRight,
  ArrowRightLeft
} from 'lucide-react';
import { useRegisteredFunctionWithFetch } from '@/lib/redux/entity/hooks/functions-and-args';

interface QuickAccessPanelProps {
  onAddNode: (type: string, nodeData?: any) => void;
}

const QuickAccessPanel: React.FC<QuickAccessPanelProps> = ({ onAddNode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFunctionBrowser, setShowFunctionBrowser] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['core']));
  
  // Real database functions
  const { 
    registeredFunctionRecords, 
    registeredFunctionIsLoading,
    fetchRegisteredFunctionAll 
  } = useRegisteredFunctionWithFetch();

  // Fetch functions on first expand
  React.useEffect(() => {
    if (showFunctionBrowser && Object.keys(registeredFunctionRecords).length === 0 && !registeredFunctionIsLoading) {
      fetchRegisteredFunctionAll();
    }
  }, [showFunctionBrowser, registeredFunctionRecords, registeredFunctionIsLoading, fetchRegisteredFunctionAll]);

  // Filter and categorize functions
  const filteredFunctions = useMemo(() => {
    const functions = Object.values(registeredFunctionRecords);
    
    if (!searchTerm) return functions;
    
    const search = searchTerm.toLowerCase();
    return functions.filter(func => 
      func.name?.toLowerCase().includes(search) ||
      func.funcName?.toLowerCase().includes(search) ||
      func.description?.toLowerCase().includes(search)
    );
  }, [registeredFunctionRecords, searchTerm]);

  // Group functions by category (we'll use a simple categorization for now)
  const categorizedFunctions = useMemo(() => {
    const categories: { [key: string]: typeof filteredFunctions } = {
      'Recipe Related': [],
      'Multi-Recipe Handling': [],
      'Processors/Extractors': [],
      'API Related': [],
      'AI Chat': [],
      'Document/Image Processing': [],
      'Database Interactions': [],
      'AI Tools (MCP)': [],
      'Data/Knowledge': [],
      'Other': []
    };

    filteredFunctions.forEach(func => {
      // Simple categorization based on function name patterns
      const name = func.name?.toLowerCase() || func.funcName?.toLowerCase() || '';
      
      if (name.includes('recipe') || name.includes('agent')) {
        categories['Recipe Related'].push(func);
      } else if (name.includes('multi') || name.includes('batch') || name.includes('iterate')) {
        categories['Multi-Recipe Handling'].push(func);
      } else if (name.includes('extract') || name.includes('process') || name.includes('convert') || name.includes('transform')) {
        categories['Processors/Extractors'].push(func);
      } else if (name.includes('api') || name.includes('http') || name.includes('request')) {
        categories['API Related'].push(func);
      } else if (name.includes('chat') || name.includes('ai') || name.includes('gpt')) {
        categories['AI Chat'].push(func);
      } else if (name.includes('pdf') || name.includes('doc') || name.includes('image') || name.includes('file')) {
        categories['Document/Image Processing'].push(func);
      } else if (name.includes('database') || name.includes('sql') || name.includes('db')) {
        categories['Database Interactions'].push(func);
      } else if (name.includes('tool') || name.includes('mcp')) {
        categories['AI Tools (MCP)'].push(func);
      } else if (name.includes('data') || name.includes('knowledge') || name.includes('kb')) {
        categories['Data/Knowledge'].push(func);
      } else {
        categories['Other'].push(func);
      }
    });

    // Filter out empty categories
    return Object.entries(categories).filter(([_, functions]) => functions.length > 0);
  }, [filteredFunctions]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const handleAddFunction = (functionData: any) => {
    onAddNode('genericFunction', {
      label: functionData.name || functionData.funcName || 'Function',
      functionId: functionData.id,
      functionName: functionData.name || functionData.funcName,
      status: 'pending',
      description: functionData.description,
      functionArgs: [], // Will be populated by the node from ArgData
      brokerInputs: {},
      brokerOutputs: {}
    });
  };

  return (
    <div className="w-80 bg-textured border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Quick Access
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Add nodes to your workflow
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Core Workflow Nodes */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Core Workflow
            </h3>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => onAddNode('recipe')}
              className="w-full flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
            >
              <div className="p-1 bg-purple-100 dark:bg-purple-900/50 rounded">
                <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-purple-900 dark:text-purple-100">Recipe</div>
                <div className="text-xs text-purple-600 dark:text-purple-400">AI agent specialist</div>
              </div>
            </button>

            <button
              onClick={() => onAddNode('userInput')}
              className="w-full flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
            >
              <div className="p-1 bg-emerald-100 dark:bg-emerald-900/50 rounded">
                <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-emerald-900 dark:text-emerald-100">User Input</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400">Collect user data</div>
              </div>
            </button>
          </div>
        </div>

        {/* Processors/Extractors Section */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Processors & Extractors
            </h3>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => onAddNode('processor', { processorType: 'extract', label: 'Data Extractor' })}
              className="w-full flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <div className="p-1 bg-blue-100 dark:bg-blue-900/50 rounded">
                <Search className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">Data Extractor</div>
                <div className="text-xs text-blue-600 dark:text-blue-400">Extract data from sources</div>
              </div>
            </button>

            <button
              onClick={() => onAddNode('processor', { processorType: 'transform', label: 'Data Transformer' })}
              className="w-full flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            >
              <div className="p-1 bg-green-100 dark:bg-green-900/50 rounded">
                <ArrowRightLeft className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-green-900 dark:text-green-100">Data Transformer</div>
                <div className="text-xs text-green-600 dark:text-green-400">Transform data formats</div>
              </div>
            </button>

            <button
              onClick={() => onAddNode('processor', { processorType: 'convert', label: 'Data Converter' })}
              className="w-full flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
            >
              <div className="p-1 bg-purple-100 dark:bg-purple-900/50 rounded">
                <Code className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-purple-900 dark:text-purple-100">Data Converter</div>
                <div className="text-xs text-purple-600 dark:text-purple-400">Convert between formats</div>
              </div>
            </button>
          </div>
        </div>

        {/* Database Functions Browser */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Database Functions
            </h3>
            <button
              onClick={() => setShowFunctionBrowser(!showFunctionBrowser)}
              className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {showFunctionBrowser ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {Object.keys(registeredFunctionRecords).length} functions
            </button>
          </div>

          {showFunctionBrowser && (
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search functions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
                />
              </div>

              {/* Loading State */}
              {registeredFunctionIsLoading && (
                <div className="flex items-center justify-center p-4">
                  <Loader className="h-5 w-5 text-gray-400 animate-spin" />
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading functions...</span>
                </div>
              )}

              {/* Function Categories */}
              {!registeredFunctionIsLoading && categorizedFunctions.length > 0 && (
                <div className="space-y-2">
                  {categorizedFunctions.map(([category, functions]) => (
                    <div key={category}>
                      <button
                        onClick={() => toggleCategory(category)}
                        className="w-full flex items-center justify-between p-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
                      >
                        <span>{category} ({functions.length})</span>
                        {expandedCategories.has(category) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      
                      {expandedCategories.has(category) && (
                        <div className="ml-2 space-y-1">
                          {functions.slice(0, 5).map((func) => (
                            <button
                              key={func.id}
                              onClick={() => handleAddFunction(func)}
                              className="w-full flex items-center gap-2 p-2 text-left text-sm text-gray-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-md"
                            >
                              <Code className="h-3 w-3 flex-shrink-0" />
                              <div className="min-w-0">
                                <div className="truncate font-medium">
                                  {func.name || func.funcName}
                                </div>
                                {func.description && (
                                  <div className="text-xs text-gray-500 dark:text-gray-500 truncate">
                                    {func.description}
                                  </div>
                                )}
                              </div>
                            </button>
                          ))}
                          {functions.length > 5 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 pl-2">
                              +{functions.length - 5} more functions
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* No Functions Found */}
              {!registeredFunctionIsLoading && filteredFunctions.length === 0 && searchTerm && (
                <div className="text-center py-4">
                  <Search className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No functions found matching "{searchTerm}"
                  </p>
                </div>
              )}

              {/* Empty State */}
              {!registeredFunctionIsLoading && Object.keys(registeredFunctionRecords).length === 0 && (
                <div className="text-center py-4">
                  <Database className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No functions available
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Generic Function Quick Add */}
        {!showFunctionBrowser && (
          <div className="px-4 pb-4">
            <button
              onClick={() => onAddNode('genericFunction')}
              className="w-full flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
            >
              <div className="p-1 bg-indigo-100 dark:bg-indigo-900/50 rounded">
                <Code className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-indigo-900 dark:text-indigo-100">Function</div>
                <div className="text-xs text-indigo-600 dark:text-indigo-400">Database function</div>
              </div>
            </button>
          </div>
        )}

        {/* Integration Nodes */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Integration Nodes
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onAddNode('agent')}
              className="flex flex-col items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <Brain className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <span className="text-xs text-gray-700 dark:text-gray-300">Agent</span>
            </button>
            
            <button
              onClick={() => onAddNode('api')}
              className="flex flex-col items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <Webhook className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <span className="text-xs text-gray-700 dark:text-gray-300">API</span>
            </button>

            <button
              onClick={() => onAddNode('database')}
              className="flex flex-col items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <Database className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <span className="text-xs text-gray-700 dark:text-gray-300">Database</span>
            </button>

            <button
              onClick={() => onAddNode('email')}
              className="flex flex-col items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <Mail className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <span className="text-xs text-gray-700 dark:text-gray-300">Email</span>
            </button>

            <button
              onClick={() => onAddNode('calendar')}
              className="flex flex-col items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <span className="text-xs text-gray-700 dark:text-gray-300">Calendar</span>
            </button>

            <button
              onClick={() => onAddNode('fileOperation')}
              className="flex flex-col items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <span className="text-xs text-gray-700 dark:text-gray-300">File Ops</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickAccessPanel; 