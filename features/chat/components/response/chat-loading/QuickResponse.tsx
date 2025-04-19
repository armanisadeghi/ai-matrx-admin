'use client';

import React from 'react';
import styles from './animations.module.css';

interface QuickResponseProps {
  message?: string;
  className?: string;
}

const QuickResponse: React.FC<QuickResponseProps> = ({ 
  message = "Thinking...", 
  className = "" 
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex items-center">
        <div className={`w-1.5 h-1.5 rounded-full bg-primary dark:bg-primary-dark mx-0.5 ${styles.pulseDot1}`}></div>
        <div className={`w-1.5 h-1.5 rounded-full bg-primary dark:bg-primary-dark mx-0.5 ${styles.pulseDot2}`}></div>
        <div className={`w-1.5 h-1.5 rounded-full bg-primary dark:bg-primary-dark mx-0.5 ${styles.pulseDot3}`}></div>
      </div>
      <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{message}</span>
    </div>
  );
};

export default QuickResponse;