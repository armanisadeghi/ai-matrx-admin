'use client';

import React from 'react';
import styles from './animations.module.css';

interface ExpertConnectingProps {
  message?: string;
  className?: string;
}

const ExpertConnecting: React.FC<ExpertConnectingProps> = ({ 
  message = "Connecting with experts...", 
  className = "" 
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <div className="relative w-6 h-6 flex items-center justify-center">
        {/* People/network icon */}
        <div className="absolute">
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            className="w-5 h-5 text-primary dark:text-primary-dark"
            strokeWidth="1.5"
          >
            {/* Simplified people network */}
            <circle cx="9" cy="9" r="2.5" className="stroke-current" />
            <circle cx="16" cy="15" r="2.5" className="stroke-current" />
            <circle cx="16" cy="7" r="1.5" className="stroke-current" />
            <circle cx="9" cy="16" r="1.5" className="stroke-current" />
          </svg>
        </div>
        
        {/* Animated connection lines */}
        <div className={`absolute h-px w-2.5 bg-secondary dark:bg-secondary-dark top-[9px] left-[11px] ${styles.connectionLine1}`}></div>
        <div className={`absolute h-4 w-px bg-secondary dark:bg-secondary-dark top-[10px] left-[16px] ${styles.connectionLine2}`}></div>
        <div className={`absolute h-px w-3 bg-secondary dark:bg-secondary-dark top-[16px] left-[10px] ${styles.connectionLine3}`}></div>
        <div className={`absolute h-3.5 w-px bg-secondary dark:bg-secondary-dark top-[10px] left-[9px] ${styles.connectionLine4}`}></div>
        
        {/* Pulse animations for the connection points */}
        <div className={`absolute w-1.5 h-1.5 rounded-full border border-secondary dark:border-secondary-dark left-[8.25px] top-[8.25px] ${styles.connectionPulse1}`}></div>
        <div className={`absolute w-1.5 h-1.5 rounded-full border border-secondary dark:border-secondary-dark left-[15.25px] top-[14.25px] ${styles.connectionPulse2}`}></div>
      </div>
      <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{message}</span>
    </div>
  );
};

export default ExpertConnecting; 