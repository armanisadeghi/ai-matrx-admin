'use client';

import React from 'react';
import styles from './animations.module.css';

interface BrainActivityProps {
  message?: string;
  className?: string;
}

const BrainActivity: React.FC<BrainActivityProps> = ({ 
  message = "Thinking...", 
  className = "" 
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <div className="relative w-6 h-6 flex items-center justify-center">
        {/* Brain icon */}
        <div className="absolute">
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            className="w-5 h-5 text-primary dark:text-primary-dark"
          >
            {/* Simplified brain shape */}
            <path 
              d="M12 4C9.5 4 7.5 5.5 7.5 8C7.5 9 7.5 9.5 7 10.5C6.5 11.5 6 12 6 13.5C6 15.5 7.5 17 9.5 17C10.5 17 11 16.5 12 16.5C13 16.5 13.5 17 14.5 17C16.5 17 18 15.5 18 13.5C18 12 17.5 11.5 17 10.5C16.5 9.5 16.5 9 16.5 8C16.5 5.5 14.5 4 12 4Z" 
              className="stroke-current"
              fill="none"
              strokeWidth="1.5"
            />
          </svg>
        </div>
        
        {/* Neural connection dots and paths */}
        <div className="absolute inset-0">
          {/* Connection nodes */}
          <div className={`absolute w-1 h-1 bg-secondary dark:bg-secondary-dark rounded-full left-[8px] top-[10px] ${styles.neuronNode1}`}></div>
          <div className={`absolute w-1 h-1 bg-secondary dark:bg-secondary-dark rounded-full left-[12px] top-[8px] ${styles.neuronNode2}`}></div>
          <div className={`absolute w-1 h-1 bg-secondary dark:bg-secondary-dark rounded-full left-[16px] top-[10px] ${styles.neuronNode3}`}></div>
          <div className={`absolute w-1 h-1 bg-secondary dark:bg-secondary-dark rounded-full left-[10px] top-[14px] ${styles.neuronNode4}`}></div>
          <div className={`absolute w-1 h-1 bg-secondary dark:bg-secondary-dark rounded-full left-[14px] top-[14px] ${styles.neuronNode5}`}></div>
        </div>
        
        {/* Pulse waves radiating from the brain */}
        <div className={`absolute w-full h-full rounded-full border border-secondary/30 dark:border-secondary-dark/30 ${styles.brainPulse1}`}></div>
        <div className={`absolute w-full h-full rounded-full border border-secondary/30 dark:border-secondary-dark/30 ${styles.brainPulse2}`}></div>
      </div>
      <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{message}</span>
    </div>
  );
};

export default BrainActivity; 