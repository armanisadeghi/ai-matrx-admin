'use client';

import React from 'react';
import styles from './animations.module.css';

interface PlanCreationProps {
  message?: string;
  className?: string;
}

const PlanCreation: React.FC<PlanCreationProps> = ({ 
  message = "Creating plan...", 
  className = "" 
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <div className="relative w-6 h-6 flex items-center justify-center">
        {/* Clipboard/checklist icon */}
        <div className="absolute">
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            className="w-5 h-5 text-primary dark:text-primary-dark"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Clipboard outline */}
            <rect x="8" y="2" width="8" height="4" rx="1" className="stroke-current" />
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" className="stroke-current" />
          </svg>
        </div>
        
        {/* Animated checklist items */}
        <div className={`absolute h-0.5 w-2 bg-secondary dark:bg-secondary-dark left-[9px] top-[10px] ${styles.checkItem1}`}></div>
        <div className={`absolute h-0.5 w-3 bg-secondary dark:bg-secondary-dark left-[12px] top-[10px] ${styles.checkLine1}`}></div>
        
        <div className={`absolute h-0.5 w-2 bg-secondary dark:bg-secondary-dark left-[9px] top-[13px] ${styles.checkItem2}`}></div>
        <div className={`absolute h-0.5 w-3 bg-secondary dark:bg-secondary-dark left-[12px] top-[13px] ${styles.checkLine2}`}></div>
        
        <div className={`absolute h-0.5 w-2 bg-secondary dark:bg-secondary-dark left-[9px] top-[16px] ${styles.checkItem3}`}></div>
        <div className={`absolute h-0.5 w-3 bg-secondary dark:bg-secondary-dark left-[12px] top-[16px] ${styles.checkLine3}`}></div>
        
        {/* Animated pencil */}
        <div className={`absolute w-1.5 h-1.5 bg-secondary dark:bg-secondary-dark transform rotate-45 ${styles.planningPencil}`}></div>
      </div>
      <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{message}</span>
    </div>
  );
};

export default PlanCreation; 