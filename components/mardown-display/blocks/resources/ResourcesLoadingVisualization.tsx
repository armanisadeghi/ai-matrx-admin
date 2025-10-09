"use client";
import React from 'react';
import { FolderOpen, BookOpen, ExternalLink, Star, Sparkles } from 'lucide-react';

interface ResourcesLoadingVisualizationProps {
  title?: string;
}

const ResourcesLoadingVisualization: React.FC<ResourcesLoadingVisualizationProps> = ({ 
  title = "Loading Resources..." 
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto py-8">
      <div className="bg-gradient-to-br from-violet-100 via-purple-50 to-fuchsia-100 dark:from-violet-950/40 dark:via-purple-950/30 dark:to-fuchsia-950/40 rounded-2xl p-8 shadow-lg border-2 border-violet-200 dark:border-violet-800/50">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-4">
            <div className="p-4 bg-violet-500 dark:bg-violet-600 rounded-2xl shadow-lg">
              <FolderOpen className="h-12 w-12 text-white animate-bounce" />
            </div>
            
            {/* Floating sparkles */}
            <div className="absolute -top-2 -right-2 animate-pulse">
              <Sparkles className="h-6 w-6 text-violet-400 dark:text-violet-300" />
            </div>
            <div className="absolute -bottom-1 -left-2 animate-pulse delay-300">
              <Sparkles className="h-4 w-4 text-purple-400 dark:text-purple-300" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Organizing your learning materials...
          </p>
        </div>

        {/* Animated Progress Bars */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/30 rounded-lg">
              <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-full animate-pulse" style={{ width: '75%' }} />
              </div>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Documentation</span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-950/30 rounded-lg">
              <ExternalLink className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 rounded-full animate-pulse delay-150" style={{ width: '60%' }} />
              </div>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Tools & Links</span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-950/30 rounded-lg">
              <Star className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 rounded-full animate-pulse delay-300" style={{ width: '85%' }} />
              </div>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Categorizing</span>
          </div>
        </div>

        {/* Loading Cards Preview */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((index) => (
            <div 
              key={index}
              className="bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700 animate-pulse"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-2 flex-1">
                  <div className="w-8 h-8 bg-gradient-to-br from-violet-200 to-purple-200 dark:from-violet-800 dark:to-purple-800 rounded-md animate-pulse" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded mb-2 animate-pulse" />
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
                  </div>
                </div>
                <div className="flex gap-1">
                  <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              </div>

              {/* Card Content */}
              <div className="space-y-2 mb-4">
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-5/6 animate-pulse" />
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-12 animate-pulse" />
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <div key={star} className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  ))}
                </div>
              </div>

              {/* Card Button */}
              <div className="h-8 bg-gradient-to-r from-violet-300 to-purple-300 dark:from-violet-700 dark:to-purple-700 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Loading Text */}
        <div className="text-center mt-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800/50 rounded-full border border-gray-200 dark:border-gray-700">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-violet-500 dark:bg-violet-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-purple-500 dark:bg-purple-400 rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-fuchsia-500 dark:bg-fuchsia-400 rounded-full animate-bounce delay-200" />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              Curating resources for you
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourcesLoadingVisualization;
