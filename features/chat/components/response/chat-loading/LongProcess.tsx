'use client';

import React, { useState, useEffect } from 'react';
import styles from './animations.module.css';

interface LongProcessProps {
  messages: string[];
  className?: string;
  messageDuration?: number;
}

const LongProcess: React.FC<LongProcessProps> = ({ 
  messages = ["Processing..."], 
  className = "",
  messageDuration = 4000
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    // Only set up interval if there are multiple messages
    if (messages.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % messages.length);
    }, messageDuration);
    
    return () => clearInterval(interval);
  }, [messages, messageDuration]);

  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex items-center">
        <div className={`w-1 h-2.5 mx-0.5 bg-primary dark:bg-primary-dark rounded-sm ${styles.bounceBar1}`}></div>
        <div className={`w-1 h-2.5 mx-0.5 bg-primary dark:bg-primary-dark rounded-sm ${styles.bounceBar2}`}></div>
        <div className={`w-1 h-2.5 mx-0.5 bg-primary dark:bg-primary-dark rounded-sm ${styles.bounceBar3}`}></div>
        <div className={`w-1 h-2.5 mx-0.5 bg-primary dark:bg-primary-dark rounded-sm ${styles.bounceBar4}`}></div>
      </div>
      <div className="ml-3 relative h-5 overflow-hidden">
        {messages.map((message, index) => (
          <span 
            key={index}
            className={`absolute text-sm text-gray-700 dark:text-gray-300 transition-opacity duration-500 ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}
          >
            {message}
          </span>
        ))}
      </div>
    </div>
  );
};

export default LongProcess;