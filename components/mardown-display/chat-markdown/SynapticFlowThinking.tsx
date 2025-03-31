import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// You might want a utility for cleaner conditional classes: npm install clsx
// import clsx from 'clsx';

// --- Icon Component (Example using Heroicons SVG syntax) ---
const ChevronDownIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const ChevronUpIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
    </svg>
);


// --- Main Thinking Component ---
const SynapticFlowThinking = ({ thinkingTextStream = "", isThinking = false, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [currentFullText, setCurrentFullText] = useState("");
  const [displayFragments, setDisplayFragments] = useState([]); // Fragments to show in collapsed view
  const fragmentIntervalRef = useRef(null);

  const simulatedKeywords = [
    "Analyzing input...",
    "Considering context...",
    "Generating draft...",
    "Refining steps...",
    "Checking constraints...",
    "Structuring thoughts...",
    "Cross-referencing...",
    "Finalizing chain...",
  ];

  // Simulate receiving the full thinking stream
  useEffect(() => {
    if (isThinking) {
      // In a real app, you'd append chunks from the stream here
      // For simulation, let's just set it after a delay
       const timer = setTimeout(() => {
         setCurrentFullText(thinkingTextStream || "Thinking complete. Preparing response..."); // Use provided stream or default
       }, 1500); // Simulate time to get full text
       return () => clearTimeout(timer);
    } else {
      // Optionally clear or keep the text when isThinking becomes false
      // setCurrentFullText("");
    }
  }, [isThinking, thinkingTextStream]);


  // Simulate cycling through fragments when collapsed and thinking
  useEffect(() => {
    if (isThinking && !isExpanded) {
      setDisplayFragments([simulatedKeywords[0]]); // Start with the first
      let index = 1;
      fragmentIntervalRef.current = setInterval(() => {
        setDisplayFragments([simulatedKeywords[index % simulatedKeywords.length]]);
        index++;
      }, 2000); // Cycle every 2 seconds
    } else {
      clearInterval(fragmentIntervalRef.current);
      setDisplayFragments([]); // Clear fragments when expanded or not thinking
    }

    // Cleanup interval on unmount or when conditions change
    return () => clearInterval(fragmentIntervalRef.current);

  }, [isThinking, isExpanded]); // Rerun when these change

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Dynamic classes based on state
  const triggerAreaClasses = `
    relative flex items-center justify-between w-full p-3
    border rounded-md cursor-pointer
    bg-gray-50 dark:bg-gray-800
    border-gray-200 dark:border-gray-700
    hover:bg-gray-100 dark:hover:bg-gray-700
    hover:border-gray-300 dark:hover:border-gray-600
    transition-colors duration-200 ease-in-out
    overflow-hidden min-h-[48px] // Ensure minimum height
  `;

  const contentAreaClasses = `
    mt-2 p-3 border rounded-md
    bg-white dark:bg-gray-900
    border-gray-200 dark:border-gray-700
    text-sm text-gray-700 dark:text-gray-300
    font-mono whitespace-pre-wrap overflow-auto // Allow scrolling if needed
    max-h-60 // Set a max height for scrollability
  `;


  return (
    <div className="mb-4"> {/* Spacing below the component */}
      {/* --- Trigger Area (Always Visible) --- */}
      <div
        className={triggerAreaClasses}
        onClick={handleToggleExpand}
        role="button"
        aria-expanded={isExpanded}
        aria-controls="thinking-content"
        tabIndex={0} // Make it focusable
        onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') handleToggleExpand(); }} // Keyboard accessible
      >
        {/* --- Collapsed State Content --- */}
        {!isExpanded && (
          <div className="flex items-center space-x-2 overflow-hidden">
             {/* Pulsing indicator when actively thinking */}
            {isThinking && (
              <motion.div
                className="w-2 h-2 bg-blue-500 rounded-full"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity }}
                aria-hidden="true"
              />
            )}

            {/* Show "Thinking..." text or cycled fragments */}
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
              {isThinking && displayFragments.length > 0 ? (
                 <AnimatePresence mode="wait">
                   <motion.span
                     key={displayFragments[0]} // Key change triggers animation
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     transition={{ duration: 0.5 }}
                     className="italic"
                   >
                    {displayFragments[0]}
                   </motion.span>
                 </AnimatePresence>
              ) : (
                isThinking ? "Thinking..." : "Show thought process" // Fallback texts
              )}
            </span>
          </div>
        )}

        {/* --- Expanded State Title (Optional) --- */}
        {isExpanded && (
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            AI Thought Process
          </span>
        )}

        {/* --- Expand/Collapse Icon --- */}
        <div className="flex-shrink-0">
          {isExpanded
              ? <ChevronUpIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              : <ChevronDownIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          }
        </div>
      </div>

      {/* --- Expandable Content Area --- */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id="thinking-content"
            key="content" // Needed for AnimatePresence exit animation
            initial="collapsed"
            animate="open"
            exit="collapsed"
            variants={{
              open: { opacity: 1, height: 'auto', marginTop: '0.5rem' },
              collapsed: { opacity: 0, height: 0, marginTop: '0rem' }
            }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }} // Cubic bezier for smooth easing
            className="overflow-hidden" // Crucial for height animation
          >
            {/* Apply styles directly to the content block */}
            <div className={contentAreaClasses}>
              {isThinking && !currentFullText ? (
                <span className="italic text-gray-500 dark:text-gray-400">Processing...</span>
              ) : (
                currentFullText || <span className="italic text-gray-500 dark:text-gray-400">No thought process data available.</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SynapticFlowThinking;