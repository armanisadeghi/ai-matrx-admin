'use client';

import React, { useEffect } from 'react';
import styles from './animations.module.css';

interface WebSearchProps {
  message?: string;
  className?: string;
}

const WebSearch: React.FC<WebSearchProps> = ({ 
  message = "Searching the web...", 
  className = "" 
}) => {
  // Log when component mounts to help with debugging
  useEffect(() => {
    console.log('WebSearch component mounted');
    return () => console.log('WebSearch component unmounted');
  }, []);

  return (
    <div className={`flex items-center ${className}`}>
      <div className="relative w-6 h-6 flex items-center justify-center">
        {/* Magnifying glass icon with animation */}
        <div className="absolute">
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            className={`w-5 h-5 text-blue-500 dark:text-blue-400 ${styles.pulseProgress}`}
            stroke="currentColor"
          >
            <circle 
              cx="11" 
              cy="11" 
              r="7" 
              strokeWidth="2" 
              fill="none"
            />
            <line 
              x1="16" 
              y1="16" 
              x2="20" 
              y2="20" 
              strokeWidth="2" 
              strokeLinecap="round"
            />
          </svg>
        </div>
        
        {/* Pulsing wave effect */}
        <div className={`absolute w-full h-full rounded-full border-2 border-blue-300 dark:border-blue-600 opacity-0 ${styles.searchWave1}`}></div>
        <div className={`absolute w-full h-full rounded-full border-2 border-blue-300 dark:border-blue-600 opacity-0 ${styles.searchWave2}`}></div>
      </div>
      <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">{message}</span>
    </div>
  );
};

export default WebSearch; 