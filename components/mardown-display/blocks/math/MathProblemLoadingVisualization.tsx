"use client";

import React from "react";
import { motion } from "framer-motion";
import { Calculator, BookOpen, Lightbulb } from "lucide-react";

const MathProblemLoadingVisualization: React.FC = () => {
    return (
        <div className="w-full max-w-4xl mx-auto p-6 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
            >
                {/* Header */}
                <div className="flex items-center gap-3">
                    <motion.div
                        animate={{
                            rotate: [0, 360],
                            scale: [1, 1.1, 1],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    >
                        <Calculator className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </motion.div>
                    <div>
                        <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100">
                            Generating Math Problem
                        </h3>
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                            Creating interactive learning experience...
                        </p>
                    </div>
                </div>

                {/* Loading indicators */}
                <div className="space-y-4">
                    {/* Problem statement loading */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center gap-3 p-4 bg-white/50 dark:bg-zinc-800/50 rounded-lg"
                    >
                        <BookOpen className="h-5 w-5 text-blue-500" />
                        <div className="flex-1">
                            <div className="h-3 bg-blue-200 dark:bg-blue-800 rounded animate-pulse w-3/4"></div>
                            <div className="h-3 bg-blue-200 dark:bg-blue-800 rounded animate-pulse w-1/2 mt-2"></div>
                        </div>
                    </motion.div>

                    {/* Steps loading */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex items-center gap-3 p-4 bg-white/50 dark:bg-zinc-800/50 rounded-lg"
                    >
                        <Lightbulb className="h-5 w-5 text-yellow-500" />
                        <div className="flex-1 space-y-2">
                            <div className="h-3 bg-yellow-200 dark:bg-yellow-800 rounded animate-pulse w-5/6"></div>
                            <div className="h-3 bg-yellow-200 dark:bg-yellow-800 rounded animate-pulse w-4/6"></div>
                            <div className="h-3 bg-yellow-200 dark:bg-yellow-800 rounded animate-pulse w-3/6"></div>
                        </div>
                    </motion.div>

                    {/* Solution loading */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        className="flex items-center gap-3 p-4 bg-white/50 dark:bg-zinc-800/50 rounded-lg"
                    >
                        <Calculator className="h-5 w-5 text-green-500" />
                        <div className="flex-1">
                            <div className="h-3 bg-green-200 dark:bg-green-800 rounded animate-pulse w-2/3"></div>
                        </div>
                    </motion.div>
                </div>

                {/* Progress bar */}
                <div className="relative h-2 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
                    <motion.div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                        animate={{
                            width: ["0%", "100%"],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    />
                </div>
            </motion.div>
        </div>
    );
};

export default MathProblemLoadingVisualization;

