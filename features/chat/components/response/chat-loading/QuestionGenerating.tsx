'use client';

import React from 'react';
import styles from './animations.module.css';

interface QuestionGeneratingProps {
  message?: string;
  className?: string;
}

const QuestionGenerating: React.FC<QuestionGeneratingProps> = ({ 
  message = "Formulating questions...", 
  className = "" 
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <div className="relative w-6 h-6 flex items-center justify-center">
        {/* Question mark icons */}
        <div className={`absolute w-2.5 h-4 transform ${styles.questionMark1}`}>
          <svg 
            width="10" 
            height="16" 
            viewBox="0 0 10 16" 
            fill="none"
            className="text-primary dark:text-primary-dark"
          >
            <path 
              d="M3 6.5C3 5.5 3.5 5 5 5C6.5 5 7 5.5 7 6.5C7 7.5 6.5 8 5 8V10" 
              className="stroke-current"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="5" cy="13" r="1" className="fill-current" />
          </svg>
        </div>
        
        <div className={`absolute w-2 h-3 transform scale-75 ${styles.questionMark2}`}>
          <svg 
            width="10" 
            height="16" 
            viewBox="0 0 10 16" 
            fill="none"
            className="text-secondary dark:text-secondary-dark"
          >
            <path 
              d="M3 6.5C3 5.5 3.5 5 5 5C6.5 5 7 5.5 7 6.5C7 7.5 6.5 8 5 8V10" 
              className="stroke-current"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="5" cy="13" r="1" className="fill-current" />
          </svg>
        </div>
        
        <div className={`absolute w-2 h-3 transform scale-75 ${styles.questionMark3}`}>
          <svg 
            width="10" 
            height="16" 
            viewBox="0 0 10 16" 
            fill="none"
            className="text-secondary dark:text-secondary-dark"
          >
            <path 
              d="M3 6.5C3 5.5 3.5 5 5 5C6.5 5 7 5.5 7 6.5C7 7.5 6.5 8 5 8V10" 
              className="stroke-current"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="5" cy="13" r="1" className="fill-current" />
          </svg>
        </div>
      </div>
      <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{message}</span>
    </div>
  );
};

export default QuestionGenerating; 