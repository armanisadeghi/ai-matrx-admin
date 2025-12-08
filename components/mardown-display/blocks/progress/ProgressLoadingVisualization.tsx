"use client";
import React from 'react';
import { BarChart3, Target, CheckCircle2, TrendingUp, Sparkles, Zap } from 'lucide-react';

interface ProgressLoadingVisualizationProps {
  title?: string;
}

const ProgressLoadingVisualization: React.FC<ProgressLoadingVisualizationProps> = ({ 
  title = "Loading Progress Tracker..." 
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto py-8">
      <div className="bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-purple-950/40 rounded-2xl p-8 shadow-lg border-2 border-blue-200 dark:border-blue-800/50">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-4">
            <div className="p-4 bg-blue-500 dark:bg-blue-600 rounded-2xl shadow-lg">
              <BarChart3 className="h-12 w-12 text-white animate-pulse" />
            </div>
            
            {/* Floating icons */}
            <div className="absolute -top-2 -right-2 animate-bounce">
              <div className="p-1.5 bg-green-500 dark:bg-green-600 rounded-full">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="absolute -bottom-1 -left-2 animate-bounce delay-300">
              <div className="p-1.5 bg-purple-500 dark:bg-purple-600 rounded-full">
                <Target className="h-4 w-4 text-white" />
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
            Setting up your progress tracking...
          </p>
        </div>

        {/* Animated Progress Categories */}
        <div className="space-y-6 mb-8">
          {[
            { name: 'Fundamentals', progress: 75, color: 'from-blue-500 to-blue-600', delay: 0 },
            { name: 'Advanced Topics', progress: 45, color: 'from-green-500 to-green-600', delay: 200 },
            { name: 'Practice Projects', progress: 30, color: 'from-purple-500 to-purple-600', delay: 400 }
          ].map((category, index) => (
            <div key={index} className="space-y-3" style={{ animationDelay: `${category.delay}ms` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 bg-gradient-to-br ${category.color} rounded-lg animate-pulse`}>
                    <Target className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24 animate-pulse mb-1" />
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-12 animate-pulse" />
                  <TrendingUp className="h-4 w-4 text-gray-400 animate-pulse" />
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                <div 
                  className={`h-full bg-gradient-to-r ${category.color} animate-pulse transition-all duration-1000`}
                  style={{ 
                    width: `${category.progress}%`,
                    animationDelay: `${category.delay + 500}ms`
                  }}
                />
              </div>
              
              {/* Task Items */}
              <div className="ml-6 space-y-2">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex items-center gap-3 animate-pulse" style={{ animationDelay: `${category.delay + item * 100}ms` }}>
                    <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-full" />
                    <div className="flex-1">
                      <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-full mb-1" />
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    </div>
                    <div className="flex gap-1">
                      <div className="w-12 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="w-8 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Overall Progress Section */}
        <div className="bg-textured/50 rounded-xl p-6 border-border mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg animate-pulse">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-32 animate-pulse mb-1" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
              </div>
            </div>
            <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-16 animate-pulse" />
          </div>
          
          {/* Overall Progress Bar */}
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 animate-pulse transition-all duration-1500"
              style={{ width: '58%' }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Goals', icon: Target, color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Completed', icon: CheckCircle2, color: 'text-green-600 dark:text-green-400' },
            { label: 'In Progress', icon: TrendingUp, color: 'text-orange-600 dark:text-orange-400' },
            { label: 'Categories', icon: BarChart3, color: 'text-purple-600 dark:text-purple-400' }
          ].map((stat, index) => (
            <div key={index} className="bg-textured/50 rounded-lg p-3 border-border animate-pulse" style={{ animationDelay: `${index * 150}ms` }}>
              <div className={`flex items-center gap-2 ${stat.color} mb-2`}>
                <stat.icon className="h-4 w-4" />
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-16" />
              </div>
              <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-8" />
            </div>
          ))}
        </div>

        {/* Loading Text */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-textured/50 rounded-full border-border">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-purple-500 dark:bg-purple-400 rounded-full animate-bounce delay-200" />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              Calculating progress metrics
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressLoadingVisualization;
