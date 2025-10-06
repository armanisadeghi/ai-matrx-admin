import React from 'react';

export default function MatrxMiniLoader() {
  return (
    <div className="flex flex-col items-center gap-3">
      <h2 className="text-lg font-light text-indigo-500 dark:text-indigo-400 tracking-wider">
        Initializing Matrx<span className="animate-pulse">...</span>
      </h2>
      
      {/* Progress bar */}
      <div className="w-80 h-0.5 bg-indigo-100 dark:bg-indigo-900 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 dark:from-indigo-400 dark:to-blue-400 animate-progress shadow-lg shadow-indigo-500/50 dark:shadow-indigo-400/30" />
      </div>

      <style jsx>{`
        @keyframes progress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }

        .animate-progress {
          animation: progress 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}