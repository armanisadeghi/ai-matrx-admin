"use client";
import React from 'react';
import { 
  Network, GitBranch, Users, Database, Server, Globe, Settings,
  Sparkles, ArrowRight, ArrowDown, Circle, Square, Diamond,
  Layers, Cpu, HardDrive, Triangle, Zap, Move, RotateCcw
} from 'lucide-react';

interface DiagramLoadingVisualizationProps {
  title?: string;
}

const DiagramLoadingVisualization: React.FC<DiagramLoadingVisualizationProps> = ({ 
  title = "Loading Interactive Diagram..." 
}) => {
  return (
    <div className="w-full max-w-6xl mx-auto py-8">
      <div className="bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-purple-950/40 rounded-2xl p-8 shadow-lg border-2 border-blue-200 dark:border-blue-800/50">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-4">
            <div className="p-4 bg-blue-500 dark:bg-blue-600 rounded-2xl shadow-lg">
              <Network className="h-12 w-12 text-white animate-pulse" />
            </div>
            
            {/* Floating diagram icons */}
            <div className="absolute -top-2 -right-2 animate-bounce">
              <div className="p-1.5 bg-green-500 dark:bg-green-600 rounded-full">
                <GitBranch className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="absolute -bottom-1 -left-2 animate-bounce delay-300">
              <div className="p-1.5 bg-purple-500 dark:bg-purple-600 rounded-full">
                <Database className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="absolute top-0 left-8 animate-pulse delay-500">
              <Sparkles className="h-5 w-5 text-blue-400 dark:text-blue-300" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Rendering interactive flow diagram...
          </p>
        </div>

        {/* Diagram Structure Preview */}
        <div className="bg-textured/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Network className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-pulse" />
            <div className="h-4 bg-blue-300 dark:bg-blue-600 rounded w-32 animate-pulse" />
          </div>
          
          {/* Flow Diagram Preview */}
          <div className="flex flex-col items-center space-y-6">
            
            {/* Top Level */}
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3 p-4 bg-green-100 dark:bg-green-950/30 rounded-lg border-2 border-green-300 dark:border-green-700 animate-pulse">
                <Circle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div className="h-4 bg-green-300 dark:bg-green-600 rounded w-20" />
              </div>
              
              <ArrowRight className="h-6 w-6 text-gray-400 animate-pulse delay-200" />
              
              <div className="flex items-center gap-3 p-4 bg-blue-100 dark:bg-blue-950/30 rounded-lg border-2 border-blue-300 dark:border-blue-700 animate-pulse delay-300">
                <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div className="h-4 bg-blue-300 dark:bg-blue-600 rounded w-24" />
              </div>
            </div>
            
            {/* Vertical Connection */}
            <ArrowDown className="h-6 w-6 text-gray-400 animate-pulse delay-400" />
            
            {/* Decision Node */}
            <div className="flex items-center gap-3 p-4 bg-orange-100 dark:bg-orange-950/30 rounded-lg border-2 border-orange-300 dark:border-orange-700 animate-pulse delay-500">
              <Diamond className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <div className="h-4 bg-orange-300 dark:bg-orange-600 rounded w-28" />
            </div>
            
            {/* Branch Connections */}
            <div className="flex items-center gap-12">
              <div className="flex flex-col items-center space-y-3">
                <ArrowDown className="h-4 w-4 text-gray-400 animate-pulse delay-600" />
                <div className="flex items-center gap-3 p-3 bg-purple-100 dark:bg-purple-950/30 rounded-lg border border-purple-300 dark:border-purple-700 animate-pulse delay-700">
                  <Database className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <div className="h-3 bg-purple-300 dark:bg-purple-600 rounded w-16" />
                </div>
              </div>
              
              <div className="flex flex-col items-center space-y-3">
                <ArrowDown className="h-4 w-4 text-gray-400 animate-pulse delay-800" />
                <div className="flex items-center gap-3 p-3 bg-red-100 dark:bg-red-950/30 rounded-lg border border-red-300 dark:border-red-700 animate-pulse delay-900">
                  <Square className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <div className="h-3 bg-red-300 dark:bg-red-600 rounded w-14" />
                </div>
              </div>
            </div>
            
            {/* System Nodes */}
            <div className="flex items-center gap-6 mt-4">
              <div className="flex items-center gap-2 p-3 bg-teal-100 dark:bg-teal-950/30 rounded-lg border border-teal-300 dark:border-teal-700 animate-pulse delay-1000">
                <Globe className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <div className="h-3 bg-teal-300 dark:bg-teal-600 rounded w-12" />
              </div>
              
              <ArrowRight className="h-4 w-4 text-gray-300 animate-pulse delay-1100" />
              
              <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 animate-pulse delay-1200">
                <Server className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-16" />
              </div>
              
              <ArrowRight className="h-4 w-4 text-gray-300 animate-pulse delay-1300" />
              
              <div className="flex items-center gap-2 p-3 bg-yellow-100 dark:bg-yellow-950/30 rounded-lg border border-yellow-300 dark:border-yellow-700 animate-pulse delay-1400">
                <Cpu className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <div className="h-3 bg-yellow-300 dark:bg-yellow-600 rounded w-10" />
              </div>
            </div>
          </div>
        </div>

        {/* Diagram Types */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {[
            { type: 'Flowchart', icon: GitBranch, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-950/30' },
            { type: 'Mind Map', icon: Sparkles, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-950/30' },
            { type: 'Org Chart', icon: Users, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-950/30' },
            { type: 'Network', icon: Network, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-950/30' },
            { type: 'System', icon: Server, color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-100 dark:bg-indigo-950/30' },
            { type: 'Process', icon: Settings, color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-100 dark:bg-teal-950/30' }
          ].map((item, index) => (
            <div key={index} className="bg-textured/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700 animate-pulse" style={{ animationDelay: `${index * 150}ms` }}>
              <div className={`flex items-center gap-2 ${item.color} mb-2`}>
                <div className={`p-1.5 ${item.bgColor} rounded`}>
                  <item.icon className="h-3 w-3" />
                </div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-16" />
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            </div>
          ))}
        </div>

        {/* Node Types Legend */}
        <div className="bg-textured/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Layers className="h-5 w-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            <div className="h-4 bg-indigo-300 dark:bg-indigo-600 rounded w-24 animate-pulse" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Start/End', icon: Circle, color: 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300' },
              { label: 'Process', icon: Square, color: 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300' },
              { label: 'Decision', icon: Diamond, color: 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300' },
              { label: 'Data', icon: Database, color: 'bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300' },
              { label: 'System', icon: Server, color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' }
            ].map((node, index) => (
              <div key={index} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${node.color} text-xs font-medium animate-pulse`} style={{ animationDelay: `${index * 100}ms` }}>
                <node.icon className="h-3 w-3" />
                <span>{node.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Features Preview */}
        <div className="bg-textured/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Move className="h-5 w-5 text-green-600 dark:text-green-400 animate-pulse" />
            <div className="h-4 bg-green-300 dark:bg-green-600 rounded w-32 animate-pulse" />
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg animate-pulse">
              <Move className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <div>
                <div className="h-3 bg-blue-300 dark:bg-blue-600 rounded w-20 mb-1" />
                <div className="h-2 bg-blue-200 dark:bg-blue-700 rounded w-16" />
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg animate-pulse delay-200">
              <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <div>
                <div className="h-3 bg-purple-300 dark:bg-purple-600 rounded w-16 mb-1" />
                <div className="h-2 bg-purple-200 dark:bg-purple-700 rounded w-20" />
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg animate-pulse delay-400">
              <RotateCcw className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <div>
                <div className="h-3 bg-orange-300 dark:bg-orange-600 rounded w-18 mb-1" />
                <div className="h-2 bg-orange-200 dark:bg-orange-700 rounded w-14" />
              </div>
            </div>
          </div>
        </div>

        {/* Processing Steps */}
        <div className="space-y-3 mb-8">
          {[
            { label: 'Parsing diagram structure', progress: 95, color: 'from-blue-500 to-indigo-500' },
            { label: 'Creating interactive nodes', progress: 80, color: 'from-indigo-500 to-purple-500' },
            { label: 'Building connections', progress: 65, color: 'from-purple-500 to-pink-500' },
            { label: 'Optimizing layout', progress: 45, color: 'from-pink-500 to-red-500' },
            { label: 'Enabling interactions', progress: 25, color: 'from-red-500 to-orange-500' }
          ].map((step, index) => (
            <div key={index} className="space-y-2 animate-pulse" style={{ animationDelay: `${index * 200}ms` }}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300 font-medium">{step.label}</span>
                <span className="text-gray-500 dark:text-gray-400">{step.progress}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${step.color} transition-all duration-1000`}
                  style={{ 
                    width: `${step.progress}%`,
                    animationDelay: `${index * 200 + 500}ms`
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Loading Text */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-textured/50 rounded-full border border-gray-200 dark:border-gray-700">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-purple-500 dark:bg-purple-400 rounded-full animate-bounce delay-200" />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              Rendering interactive diagram
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagramLoadingVisualization;
