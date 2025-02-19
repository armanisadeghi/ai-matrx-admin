// NotificationToast.tsx
import React, { useEffect } from 'react';

interface NotificationToastProps {
  message: string;
  visible: boolean;
  onHide: () => void;
  duration?: number;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ 
  message, 
  visible, 
  onHide,
  duration = 3000
}) => {
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (visible) {
      timer = setTimeout(() => {
        onHide();
      }, duration);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [visible, onHide, duration]);

  if (!visible) return null;

  return (
    <div className="fixed top-4 right-4 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded shadow-md z-50 transition-opacity duration-300">
      <div className="flex">
        <div className="py-1">
          <svg className="fill-current h-6 w-6 text-green-500 dark:text-green-300 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z"/>
          </svg>
        </div>
        <div>
          <p className="font-bold">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default NotificationToast;