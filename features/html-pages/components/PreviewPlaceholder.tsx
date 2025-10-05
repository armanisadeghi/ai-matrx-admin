"use client";

import React from 'react';
import { Globe, Sparkles, FileCode2 } from 'lucide-react';

interface PreviewPlaceholderProps {
    isLoading?: boolean;
}

export function PreviewPlaceholder({ isLoading = false }: PreviewPlaceholderProps) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
                <div className="flex flex-col items-center space-y-6 p-8">
                    {/* Animated loading icon */}
                    <div className="relative">
                        <div className="absolute inset-0 animate-ping opacity-20">
                            <Globe className="w-20 h-20 text-blue-500 dark:text-blue-400" />
                        </div>
                        <Globe className="w-20 h-20 text-blue-500 dark:text-blue-400 animate-pulse" />
                    </div>
                    
                    {/* Loading bars */}
                    <div className="space-y-3 w-64">
                        <div className="h-3 bg-gradient-to-r from-blue-400 to-purple-400 dark:from-blue-500 dark:to-purple-500 rounded-full animate-pulse"></div>
                        <div className="h-3 w-48 bg-gradient-to-r from-purple-400 to-pink-400 dark:from-purple-500 dark:to-pink-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                        <div className="h-3 w-56 bg-gradient-to-r from-pink-400 to-blue-400 dark:from-pink-500 dark:to-blue-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    
                    {/* Loading text */}
                    <div className="text-center space-y-2">
                        <p className="text-lg font-medium text-gray-700 dark:text-gray-300 animate-pulse">
                            Generating preview...
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Building your HTML page
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
            <div className="flex flex-col items-center space-y-6 p-8 text-center max-w-md">
                {/* Icon arrangement */}
                <div className="relative">
                    <div className="absolute -top-4 -left-4 opacity-30">
                        <Sparkles className="w-8 h-8 text-yellow-400 dark:text-yellow-300 animate-pulse" />
                    </div>
                    <div className="absolute -bottom-4 -right-4 opacity-30">
                        <Sparkles className="w-6 h-6 text-purple-400 dark:text-purple-300 animate-pulse" style={{ animationDelay: '500ms' }} />
                    </div>
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl">
                        <div className="flex space-x-4">
                            <div className="transform -rotate-12 opacity-60">
                                <FileCode2 className="w-12 h-12 text-blue-400 dark:text-blue-300" />
                            </div>
                            <div className="transform translate-y-2">
                                <Globe className="w-16 h-16 text-blue-500 dark:text-blue-400" />
                            </div>
                            <div className="transform rotate-12 opacity-60">
                                <FileCode2 className="w-12 h-12 text-purple-400 dark:text-purple-300" />
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Message */}
                <div className="space-y-3">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                        Ready to Generate
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                        Click <span className="font-semibold text-blue-600 dark:text-blue-400">"Generate Page"</span> or <span className="font-semibold text-blue-600 dark:text-blue-400">"Update Page"</span> to create your HTML preview
                    </p>
                </div>
                
                {/* Feature hints */}
                <div className="grid grid-cols-2 gap-3 pt-4">
                    <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 backdrop-blur-sm">
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            <span className="font-medium text-gray-800 dark:text-gray-200">Edit</span> source files
                        </p>
                    </div>
                    <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 backdrop-blur-sm">
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            <span className="font-medium text-gray-800 dark:text-gray-200">Customize</span> metadata
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

