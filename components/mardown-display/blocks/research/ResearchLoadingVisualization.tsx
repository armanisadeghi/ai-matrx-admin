"use client";
import React from "react";
import { BookOpen, Sparkles, Search, Database } from "lucide-react";

const ResearchLoadingVisualization: React.FC = () => {
    return (
        <div className="w-full py-6">
            <div className="max-w-2xl mx-auto">
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-2xl p-6 border-2 border-emerald-200 dark:border-emerald-800/50 shadow-lg">
                    <div className="flex flex-col items-center justify-center space-y-4">
                        {/* Animated Icon */}
                        <div className="relative">
                            <div className="absolute inset-0 animate-ping opacity-20" style={{ animationDuration: '2s' }}>
                                <BookOpen className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <BookOpen className="h-12 w-12 text-emerald-600 dark:text-emerald-400 animate-pulse" style={{ animationDuration: '2s' }} />
                            <Sparkles className="h-5 w-5 text-teal-600 dark:text-teal-400 absolute -top-1 -right-1 animate-bounce" style={{ animationDuration: '1s' }} />
                        </div>

                        {/* Loading Text */}
                        <div className="text-center space-y-1">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                                Analyzing Research
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Processing scientific data and findings...
                            </p>
                        </div>

                        {/* Animated Progress Bar */}
                        <div className="w-full max-w-xs h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 rounded-full animate-shimmer" 
                                 style={{ 
                                     width: '100%',
                                     backgroundSize: '200% 100%',
                                     animation: 'shimmer 2s infinite linear'
                                 }}>
                            </div>
                        </div>

                        {/* Loading Steps */}
                        <div className="w-full space-y-1.5 text-xs">
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                <div className="h-2 w-2 rounded-full bg-green-600 dark:bg-green-400 animate-pulse"></div>
                                <span>Parsing research structure</span>
                            </div>
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                <div className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                                <span>Extracting key findings</span>
                            </div>
                            <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
                                <div className="h-2 w-2 rounded-full bg-teal-600 dark:bg-teal-400 animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                                <span>Organizing research data</span>
                            </div>
                            <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
                                <div className="h-2 w-2 rounded-full bg-cyan-600 dark:bg-cyan-400 animate-pulse" style={{ animationDelay: '0.9s' }}></div>
                                <span>Creating interactive report</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style jsx>{`
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            `}</style>
        </div>
    );
};

export default ResearchLoadingVisualization;
