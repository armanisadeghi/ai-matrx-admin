'use client';

import React from 'react';
import styles from './animations.module.css';

interface DocumentReadingProps {
  message?: string;
  className?: string;
}

const DocumentReading: React.FC<DocumentReadingProps> = ({ 
  message = "Reading content...", 
  className = "" 
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <div className="relative w-6 h-6 flex items-center justify-center">
        {/* Document icon */}
        <div className="absolute">
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            className="w-5 h-5 text-primary dark:text-primary-dark"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Document body */}
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" className="stroke-current" />
            {/* Document corner fold */}
            <polyline points="14 2 14 8 20 8" className="stroke-current" />
          </svg>
        </div>
        
        {/* Animated reading lines */}
        <div className={`absolute w-3.5 top-[8px] left-[7px] h-0.5 bg-secondary dark:bg-secondary-dark rounded-full ${styles.readingLine1}`}></div>
        <div className={`absolute w-3.5 top-[11px] left-[7px] h-0.5 bg-secondary dark:bg-secondary-dark rounded-full ${styles.readingLine2}`}></div>
        <div className={`absolute w-3.5 top-[14px] left-[7px] h-0.5 bg-secondary dark:bg-secondary-dark rounded-full ${styles.readingLine3}`}></div>
        <div className={`absolute w-3.5 top-[17px] left-[7px] h-0.5 bg-secondary dark:bg-secondary-dark rounded-full ${styles.readingLine4}`}></div>
      </div>
      <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{message}</span>
    </div>
  );
};

export default DocumentReading; 