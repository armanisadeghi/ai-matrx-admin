'use client';

import React from 'react';
import styles from './animations.module.css';

interface FinalProcessingProps {
  message?: string;
  className?: string;
}

const FinalProcessing: React.FC<FinalProcessingProps> = ({ 
  message = "Making final adjustments...", 
  className = "" 
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      {/* Bouncing Bars Animation */}
      <div className="flex items-center">
        <div className={`w-1 h-2.5 mx-0.5 bg-primary dark:bg-primary-dark rounded-sm ${styles.bounceBar1}`}></div>
        <div className={`w-1 h-2.5 mx-0.5 bg-primary dark:bg-primary-dark rounded-sm ${styles.bounceBar2}`}></div>
        <div className={`w-1 h-2.5 mx-0.5 bg-primary dark:bg-primary-dark rounded-sm ${styles.bounceBar3}`}></div>
        <div className={`w-1 h-2.5 mx-0.5 bg-primary dark:bg-primary-dark rounded-sm ${styles.bounceBar4}`}></div>
      </div>
      
      {/* Message with static text (no fade effect) to ensure it's always visible */}
      <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
        {message}
      </span>
    </div>
  );
};

export default FinalProcessing; 