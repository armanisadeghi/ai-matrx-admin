'use client';

import React from 'react';
import styles from './animations.module.css';

interface RecipeProcessingProps {
  message?: string;
  className?: string;
}

const RecipeProcessing: React.FC<RecipeProcessingProps> = ({ 
  message = "Finding recipes...", 
  className = "" 
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <div className="relative w-28 h-6 flex items-center">
        {/* Workflow nodes and connections */}
        <div className="absolute inset-0 flex items-center">
          {/* Nodes */}
          <div className={`w-2 h-2 rounded-full bg-primary dark:bg-primary-dark ${styles.neuronNode1}`}></div>
          <div className={`w-1.5 h-[1px] bg-zinc-400 dark:bg-zinc-600 ${styles.connectionLine1}`}></div>
          
          <div className={`w-2.5 h-2.5 rounded-full bg-secondary dark:bg-secondary-dark ${styles.neuronNode2}`}></div>
          <div className={`w-2 h-[1px] bg-zinc-400 dark:bg-zinc-600 ${styles.connectionLine2}`}></div>
          
          <div className={`w-3 h-3 rounded-full bg-primary dark:bg-primary-dark ${styles.neuronNode3}`}></div>
          <div className={`w-1.5 h-[1px] bg-zinc-400 dark:bg-zinc-600 ${styles.connectionLine3}`}></div>
          
          <div className={`w-2 h-2 rounded-full bg-secondary dark:bg-secondary-dark ${styles.neuronNode4}`}></div>
          <div className={`w-2 h-[1px] bg-zinc-400 dark:bg-zinc-600 ${styles.connectionLine4}`}></div>
          
          <div className={`w-2.5 h-2.5 rounded-full bg-primary dark:bg-primary-dark ${styles.neuronNode5}`}></div>
        </div>
        
        {/* Animated data elements */}
        <div className="absolute inset-0">
          <div className={`absolute w-1 h-1 rounded-full bg-yellow-400 dark:bg-yellow-500 top-1 left-1 ${styles.sparkle1}`}></div>
          <div className={`absolute w-1 h-1 rounded-full bg-blue-400 dark:bg-blue-500 top-3 left-6 ${styles.sparkle2}`}></div>
          <div className={`absolute w-1 h-1 rounded-full bg-green-400 dark:bg-green-500 top-2 left-14 ${styles.sparkle3}`}></div>
          <div className={`absolute w-1 h-1 rounded-full bg-indigo-400 dark:bg-indigo-500 top-4 left-20 ${styles.sparkle1}`}></div>
        </div>
        
        {/* Processing indicator */}
        <div className="absolute right-0 flex items-center space-x-0.5">
          <div className={`w-0.5 h-2 bg-primary dark:bg-primary-dark rounded-sm ${styles.bounceBar1}`}></div>
          <div className={`w-0.5 h-2 bg-primary dark:bg-primary-dark rounded-sm ${styles.bounceBar2}`}></div>
          <div className={`w-0.5 h-2 bg-primary dark:bg-primary-dark rounded-sm ${styles.bounceBar3}`}></div>
        </div>
      </div>
      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{message}</span>
    </div>
  );
};

export default RecipeProcessing; 