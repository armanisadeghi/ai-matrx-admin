"use client";
import React from "react";
import { Presentation, Layers, FileText } from "lucide-react";

const PresentationLoadingVisualization: React.FC = () => {
    return (
        <div className="w-full py-8">
            <div className="max-w-4xl mx-auto">
                {/* Presentation-shaped container with animated background */}
                <div className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 dark:from-gray-900 dark:via-blue-950/30 dark:to-gray-900 rounded-2xl p-8 border-2 border-blue-200 dark:border-blue-800/50 shadow-2xl overflow-hidden min-h-[400px] flex flex-col">
                    
                    {/* Animated background grid pattern */}
                    <div className="absolute inset-0 opacity-10 dark:opacity-5">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-transparent to-indigo-400 animate-gradient-shift"></div>
                        <div className="grid grid-cols-8 grid-rows-6 h-full w-full">
                            {Array.from({ length: 48 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="border border-blue-300/20 dark:border-blue-700/20 animate-pulse"
                                    style={{
                                        animationDelay: `${(i % 12) * 0.1}s`,
                                        animationDuration: '3s'
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Floating orbs animation */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-10 left-10 w-32 h-32 bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-2xl animate-float"></div>
                        <div className="absolute bottom-10 right-10 w-40 h-40 bg-indigo-400/20 dark:bg-indigo-500/10 rounded-full blur-2xl animate-float-delayed"></div>
                        <div className="absolute top-1/2 left-1/2 w-36 h-36 bg-blue-300/20 dark:bg-blue-600/10 rounded-full blur-2xl animate-float-slow"></div>
                    </div>

                    {/* Content */}
                    <div className="relative z-10 flex-1 flex flex-col items-center justify-center space-y-6">
                        
                        {/* Animated presentation mockup */}
                        <div className="relative mb-4">
                            {/* Stacked slides effect */}
                            <div className="relative">
                                <div className="absolute -top-2 -left-2 w-48 h-32 bg-blue-200 dark:bg-blue-900/40 rounded-lg shadow-lg transform rotate-[-3deg] opacity-40 animate-slide-stack-1"></div>
                                <div className="absolute -top-1 -left-1 w-48 h-32 bg-blue-300 dark:bg-blue-800/50 rounded-lg shadow-lg transform rotate-[-1.5deg] opacity-60 animate-slide-stack-2"></div>
                                <div className="relative w-48 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 rounded-lg shadow-2xl flex items-center justify-center animate-pulse-slow">
                                    <Layers className="h-16 w-16 text-white/90 animate-bounce-slow" />
                                    <FileText className="h-5 w-5 text-blue-100 dark:text-blue-200 absolute top-3 right-3 animate-fade-pulse" />
                                </div>
                            </div>
                        </div>

                        {/* Loading Text */}
                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center justify-center gap-2">
                                <Presentation className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                Creating Presentation
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Assembling slides with professional styling...
                            </p>
                        </div>

                        {/* Animated Progress Bar */}
                        <div className="w-full max-w-md space-y-2">
                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                                <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 rounded-full animate-shimmer-fast" 
                                     style={{ 
                                         width: '100%',
                                         backgroundSize: '200% 100%'
                                     }}>
                                </div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-500">
                                <span className="animate-pulse">Processing...</span>
                                <span className="animate-pulse" style={{ animationDelay: '0.5s' }}>Building...</span>
                                <span className="animate-pulse" style={{ animationDelay: '1s' }}>Almost ready...</span>
                            </div>
                        </div>

                        {/* Loading Steps with Icons */}
                        <div className="w-full max-w-md space-y-3 pt-4">
                            <div className="flex items-center gap-3 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-3 shadow-sm animate-slide-in-1">
                                <div className="h-8 w-8 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center shadow-md animate-pulse">
                                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Analyzing content</p>
                                    <div className="mt-1 h-1 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 dark:bg-blue-600 rounded-full animate-progress-infinite-1" style={{ width: '50%' }}></div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-3 shadow-sm animate-slide-in-2">
                                <div className="h-8 w-8 rounded-full bg-indigo-500 dark:bg-indigo-600 flex items-center justify-center shadow-md animate-pulse" style={{ animationDelay: '0.3s' }}>
                                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Designing layout</p>
                                    <div className="mt-1 h-1 bg-indigo-200 dark:bg-indigo-900 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 dark:bg-indigo-600 rounded-full animate-progress-infinite-2" style={{ width: '50%' }}></div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-3 shadow-sm animate-slide-in-3">
                                <div className="h-8 w-8 rounded-full bg-blue-600 dark:bg-blue-700 flex items-center justify-center shadow-md animate-pulse" style={{ animationDelay: '0.6s' }}>
                                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Applying theme</p>
                                    <div className="mt-1 h-1 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-600 dark:bg-blue-700 rounded-full animate-progress-infinite-3" style={{ width: '50%' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom decorative line */}
                    <div className="relative z-10 mt-6 h-1 bg-gradient-to-r from-transparent via-blue-500 dark:via-blue-600 to-transparent rounded-full animate-pulse"></div>
                </div>
            </div>
            
            <style jsx>{`
                @keyframes shimmer-fast {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                @keyframes gradient-shift {
                    0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.3; }
                    50% { transform: scale(1.1) rotate(5deg); opacity: 0.5; }
                }
                @keyframes float {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(20px, -20px); }
                }
                @keyframes float-delayed {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(-20px, 20px); }
                }
                @keyframes float-slow {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(10px, -10px) scale(1.1); }
                }
                @keyframes slide-stack-1 {
                    0%, 100% { transform: rotate(-3deg) translateY(0); }
                    50% { transform: rotate(-3deg) translateY(-2px); }
                }
                @keyframes slide-stack-2 {
                    0%, 100% { transform: rotate(-1.5deg) translateY(0); }
                    50% { transform: rotate(-1.5deg) translateY(-1px); }
                }
                @keyframes pulse-slow {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.9; transform: scale(1.02); }
                }
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes fade-pulse {
                    0%, 100% { opacity: 0.4; }
                    50% { opacity: 0.8; }
                }
                @keyframes slide-in-1 {
                    from { opacity: 0; transform: translateX(-20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes slide-in-2 {
                    from { opacity: 0; transform: translateX(-20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes slide-in-3 {
                    from { opacity: 0; transform: translateX(-20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes progress-infinite-1 {
                    0%, 100% { transform: translateX(-20%); opacity: 0.8; }
                    50% { transform: translateX(70%); opacity: 1; }
                }
                @keyframes progress-infinite-2 {
                    0%, 100% { transform: translateX(-10%); opacity: 0.8; }
                    50% { transform: translateX(80%); opacity: 1; }
                }
                @keyframes progress-infinite-3 {
                    0%, 100% { transform: translateX(0%); opacity: 0.8; }
                    50% { transform: translateX(90%); opacity: 1; }
                }
                
                .animate-shimmer-fast {
                    animation: shimmer-fast 3s infinite linear;
                }
                .animate-gradient-shift {
                    animation: gradient-shift 12s ease-in-out infinite;
                }
                .animate-float {
                    animation: float 10s ease-in-out infinite;
                }
                .animate-float-delayed {
                    animation: float-delayed 11s ease-in-out infinite;
                }
                .animate-float-slow {
                    animation: float-slow 15s ease-in-out infinite;
                }
                .animate-slide-stack-1 {
                    animation: slide-stack-1 4s ease-in-out infinite;
                }
                .animate-slide-stack-2 {
                    animation: slide-stack-2 4s ease-in-out infinite 0.2s;
                }
                .animate-pulse-slow {
                    animation: pulse-slow 5s ease-in-out infinite;
                }
                .animate-bounce-slow {
                    animation: bounce-slow 4s ease-in-out infinite;
                }
                .animate-fade-pulse {
                    animation: fade-pulse 3s ease-in-out infinite;
                }
                .animate-slide-in-1 {
                    animation: slide-in-1 0.8s ease-out 0.3s both;
                }
                .animate-slide-in-2 {
                    animation: slide-in-2 0.8s ease-out 0.5s both;
                }
                .animate-slide-in-3 {
                    animation: slide-in-3 0.8s ease-out 0.7s both;
                }
                .animate-progress-infinite-1 {
                    animation: progress-infinite-1 4s ease-in-out infinite;
                }
                .animate-progress-infinite-2 {
                    animation: progress-infinite-2 4.5s ease-in-out infinite;
                }
                .animate-progress-infinite-3 {
                    animation: progress-infinite-3 5s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default PresentationLoadingVisualization;

