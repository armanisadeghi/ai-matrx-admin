"use client";
import React from 'react';
import { Table, BarChart3, TrendingUp, Star, DollarSign, Sparkles, Trophy } from 'lucide-react';

interface ComparisonLoadingVisualizationProps {
  title?: string;
}

const ComparisonLoadingVisualization: React.FC<ComparisonLoadingVisualizationProps> = ({ 
  title = "Loading Comparison Table..." 
}) => {
  return (
    <div className="w-full max-w-6xl mx-auto py-8">
      <div className="bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-cyan-950/40 rounded-2xl p-8 shadow-lg border-2 border-emerald-200 dark:border-emerald-800/50">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-4">
            <div className="p-4 bg-emerald-500 dark:bg-emerald-600 rounded-2xl shadow-lg">
              <Table className="h-12 w-12 text-white animate-pulse" />
            </div>
            
            {/* Floating comparison icons */}
            <div className="absolute -top-2 -right-2 animate-bounce">
              <div className="p-1.5 bg-yellow-500 dark:bg-yellow-600 rounded-full">
                <Trophy className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="absolute -bottom-1 -left-2 animate-bounce delay-300">
              <div className="p-1.5 bg-blue-500 dark:bg-blue-600 rounded-full">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="absolute top-0 left-8 animate-pulse delay-500">
              <Sparkles className="h-5 w-5 text-emerald-400 dark:text-emerald-300" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Analyzing and organizing comparison data...
          </p>
        </div>

        {/* Animated Table Structure */}
        <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
          {/* Table Header */}
          <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="h-4 bg-emerald-300 dark:bg-emerald-600 rounded w-20 animate-pulse" />
              <div className="h-4 bg-blue-300 dark:bg-blue-600 rounded w-16 animate-pulse delay-100" />
              <div className="h-4 bg-purple-300 dark:bg-purple-600 rounded w-18 animate-pulse delay-200" />
              <div className="h-4 bg-orange-300 dark:bg-orange-600 rounded w-14 animate-pulse delay-300" />
              <div className="h-4 bg-pink-300 dark:bg-pink-600 rounded w-22 animate-pulse delay-400" />
            </div>
          </div>
          
          {/* Table Rows */}
          {[1, 2, 3].map((row) => (
            <div key={row} className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
              <div className="flex items-center gap-4">
                {/* Item Name */}
                <div className="flex items-center gap-2">
                  {row === 1 && (
                    <Trophy className="h-4 w-4 text-yellow-500 animate-pulse" />
                  )}
                  <div className={`h-4 rounded ${
                    row === 1 ? 'bg-yellow-300 dark:bg-yellow-600 w-24' :
                    row === 2 ? 'bg-gray-300 dark:bg-gray-600 w-20' :
                    'bg-orange-300 dark:bg-orange-600 w-22'
                  } animate-pulse`} style={{ animationDelay: `${row * 100}ms` }} />
                </div>
                
                {/* Criteria Values */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-3 w-3 text-gray-300 dark:text-gray-600 animate-pulse" style={{ animationDelay: `${row * 100 + star * 50}ms` }} />
                  ))}
                </div>
                
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((dollar) => (
                    <DollarSign key={dollar} className="h-3 w-3 text-gray-300 dark:text-gray-600 animate-pulse" style={{ animationDelay: `${row * 100 + dollar * 50}ms` }} />
                  ))}
                </div>
                
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-16 animate-pulse" style={{ animationDelay: `${row * 150}ms` }} />
                
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-12 animate-pulse" style={{ animationDelay: `${row * 200}ms` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Analysis Metrics */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Items', icon: Table, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-950/30' },
            { label: 'Criteria', icon: BarChart3, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-950/30' },
            { label: 'Analysis', icon: TrendingUp, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-950/30' }
          ].map((metric, index) => (
            <div key={index} className="bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700 animate-pulse" style={{ animationDelay: `${index * 200}ms` }}>
              <div className={`flex items-center gap-3 ${metric.color} mb-3`}>
                <div className={`p-2 ${metric.bgColor} rounded-lg`}>
                  <metric.icon className="h-4 w-4" />
                </div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-16" />
              </div>
              <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-8" />
            </div>
          ))}
        </div>

        {/* Progress Indicators */}
        <div className="space-y-4 mb-8">
          {[
            { label: 'Parsing JSON data', progress: 85, color: 'from-emerald-500 to-teal-500' },
            { label: 'Analyzing criteria', progress: 65, color: 'from-blue-500 to-indigo-500' },
            { label: 'Calculating scores', progress: 40, color: 'from-purple-500 to-pink-500' },
            { label: 'Preparing visualization', progress: 20, color: 'from-orange-500 to-red-500' }
          ].map((step, index) => (
            <div key={index} className="space-y-2" style={{ animationDelay: `${index * 300}ms` }}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300 font-medium">{step.label}</span>
                <span className="text-gray-500 dark:text-gray-400">{step.progress}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${step.color} animate-pulse transition-all duration-1000`}
                  style={{ 
                    width: `${step.progress}%`,
                    animationDelay: `${index * 300 + 500}ms`
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Winners Podium Preview */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 rounded-xl p-6 border border-yellow-200 dark:border-yellow-800/50 mb-6">
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="h-5 w-5 text-yellow-500 animate-pulse" />
              <div className="h-4 bg-yellow-300 dark:bg-yellow-600 rounded w-32 animate-pulse" />
            </div>
          </div>
          <div className="flex items-end justify-center gap-4">
            {/* 2nd place */}
            <div className="text-center animate-pulse" style={{ animationDelay: '200ms' }}>
              <div className="bg-gray-300 dark:bg-gray-600 rounded-lg h-16 w-16 mb-2 mx-auto" />
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-12 mx-auto mb-1" />
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-8 mx-auto" />
            </div>
            
            {/* 1st place */}
            <div className="text-center animate-pulse">
              <div className="bg-yellow-400 dark:bg-yellow-500 rounded-lg h-20 w-20 mb-2 mx-auto" />
              <div className="h-3 bg-yellow-300 dark:bg-yellow-600 rounded w-16 mx-auto mb-1" />
              <div className="h-2 bg-yellow-200 dark:bg-yellow-700 rounded w-10 mx-auto" />
            </div>
            
            {/* 3rd place */}
            <div className="text-center animate-pulse" style={{ animationDelay: '400ms' }}>
              <div className="bg-orange-300 dark:bg-orange-600 rounded-lg h-12 w-12 mb-2 mx-auto" />
              <div className="h-3 bg-orange-300 dark:bg-orange-600 rounded w-10 mx-auto mb-1" />
              <div className="h-2 bg-orange-200 dark:bg-orange-700 rounded w-6 mx-auto" />
            </div>
          </div>
        </div>

        {/* Loading Text */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800/50 rounded-full border border-gray-200 dark:border-gray-700">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-emerald-500 dark:bg-emerald-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-teal-500 dark:bg-teal-400 rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-cyan-500 dark:bg-cyan-400 rounded-full animate-bounce delay-200" />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              Building comparison matrix
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonLoadingVisualization;
