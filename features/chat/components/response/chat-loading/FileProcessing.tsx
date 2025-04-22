'use client';

import React from 'react';
import styles from './animations.module.css';

interface FileProcessingProps {
  message?: string;
  className?: string;
}

const FileProcessing: React.FC<FileProcessingProps> = ({ 
  message = "Analyzing Files...", 
  className = "" 
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <div className="relative w-6 h-6">
        <svg viewBox="0 0 36 36" className="w-full h-full">
          <circle 
            cx="18" 
            cy="18" 
            r="14" 
            className="fill-none stroke-secondary dark:stroke-secondary-dark stroke-[3]" 
          />
          <circle 
            cx="18" 
            cy="18" 
            r="14" 
            className={`fill-none stroke-primary dark:stroke-primary-dark stroke-[3] stroke-round origin-center ${styles.progressCircle}`} 
            strokeLinecap="round"
          />
        </svg>
      </div>
      <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{message}</span>
    </div>
  );
};

export default FileProcessing;