import React, { useState, useRef, useEffect } from 'react';

interface TruncatedHelpTextProps {
  text: string;
  maxWidth?: string;
  className?: string;
}

const TruncatedHelpText: React.FC<TruncatedHelpTextProps> = ({
  text,
  maxWidth = '100%',
  className = '',
}) => {
  const [isTruncated, setIsTruncated] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if text is truncated on mount and on window resize
  useEffect(() => {
    const checkTruncation = () => {
      if (textRef.current && containerRef.current) {
        const { scrollWidth } = textRef.current;
        const { clientWidth } = containerRef.current;
        setIsTruncated(scrollWidth > clientWidth);
      }
    };
    
    checkTruncation();
    
    // Re-check on window resize
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [text]);

  const closeOverlay = () => {
    setIsOverlayOpen(false);
  };

  return (
    <>
      <div 
        ref={containerRef}
        className="w-full overflow-hidden"
        style={{ maxWidth }}
      >
        {isTruncated ? (
          <button 
            className={`text-sm text-blue-500 dark:text-blue-400 text-left w-full ${className}`}
            onClick={() => setIsOverlayOpen(true)}
          >
            <span 
              ref={textRef}
              className="truncate block w-full whitespace-nowrap"
            >
              {text}
            </span>
          </button>
        ) : (
          <p className={`text-sm text-gray-500 dark:text-gray-400 mt-2 ${className}`}>
            <span 
              ref={textRef}
              className="whitespace-nowrap block"
            >
              {text}
            </span>
          </p>
        )}
      </div>

      {/* Overlay for full text */}
      {isOverlayOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" 
            onClick={closeOverlay}
          >
            {/* Modal */}
            <div 
              className="bg-white dark:bg-gray-800 rounded-lg p-6 m-4 max-w-sm w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-gray-100">Help</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-5">
                {text}
              </p>
              <button
                className="w-full text-center py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                onClick={closeOverlay}
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default TruncatedHelpText;