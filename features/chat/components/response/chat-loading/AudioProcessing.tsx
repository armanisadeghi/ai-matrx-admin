'use client';

import React from 'react';
import styles from './animations.module.css';

interface AudioProcessingProps {
  message?: string;
  className?: string;
}

const AudioProcessing: React.FC<AudioProcessingProps> = ({ 
  message = "Processing audio...", 
  className = "" 
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <div className="relative w-6 h-6 flex items-center justify-center">
        {/* Microphone with sound wave animation */}
        <div className="absolute">
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            className="w-5 h-5 text-primary dark:text-primary-dark"
          >
            {/* Microphone */}
            <rect 
              x="10" 
              y="4" 
              width="4" 
              height="10" 
              rx="2" 
              className="fill-current" 
            />
            <path 
              d="M16 11a4 4 0 0 1-8 0" 
              className="stroke-current" 
              strokeWidth="2" 
              fill="none" 
            />
            <line 
              x1="12" 
              y1="19" 
              x2="12" 
              y2="17" 
              className="stroke-current" 
              strokeWidth="2" 
            />
            <line 
              x1="8" 
              y1="19" 
              x2="16" 
              y2="19" 
              className="stroke-current" 
              strokeWidth="2" 
            />
          </svg>
        </div>
        
        {/* Audio wave bars */}
        <div className="absolute inset-0 flex items-center justify-center space-x-px">
          <div className={`w-0.5 h-2 bg-secondary dark:bg-secondary-dark rounded-full ${styles.audioWave1}`}></div>
          <div className={`w-0.5 h-3 bg-secondary dark:bg-secondary-dark rounded-full ${styles.audioWave2}`}></div>
          <div className={`w-0.5 h-4 bg-secondary dark:bg-secondary-dark rounded-full ${styles.audioWave3}`}></div>
          <div className={`w-0.5 h-3 bg-secondary dark:bg-secondary-dark rounded-full ${styles.audioWave4}`}></div>
          <div className={`w-0.5 h-2 bg-secondary dark:bg-secondary-dark rounded-full ${styles.audioWave5}`}></div>
        </div>
      </div>
      <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{message}</span>
    </div>
  );
};

export default AudioProcessing; 