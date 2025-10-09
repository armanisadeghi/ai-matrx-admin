"use client";
import React from "react";
import { Calendar, Sparkles, Clock } from "lucide-react";

const TimelineLoadingVisualization: React.FC = () => {
    return (
        <div className="w-full py-6">
            <div className="max-w-2xl mx-auto">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl p-6 border-2 border-blue-200 dark:border-blue-800/50 shadow-lg">
                    <div className="flex flex-col items-center justify-center space-y-4">
                        {/* Animated Icon */}
                        <div className="relative">
                            <div className="absolute inset-0 animate-ping opacity-20" style={{ animationDuration: '2s' }}>
                                <Calendar className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                            </div>
                            <Calendar className="h-12 w-12 text-blue-600 dark:text-blue-400 animate-pulse" style={{ animationDuration: '2s' }} />
                            <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400 absolute -top-1 -right-1 animate-bounce" style={{ animationDuration: '1s' }} />
                        </div>

                        {/* Loading Text */}
                        <div className="text-center space-y-1">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                                Building Timeline
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Organizing events and milestones...
                            </p>
                        </div>

                        {/* Animated Progress Bar */}
                        <div className="w-full max-w-xs h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 rounded-full animate-shimmer" 
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
                                <span>Parsing timeline structure</span>
                            </div>
                            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                <div className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                                <span>Organizing events by period</span>
                            </div>
                            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                <div className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                                <span>Creating interactive timeline</span>
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

export default TimelineLoadingVisualization;
