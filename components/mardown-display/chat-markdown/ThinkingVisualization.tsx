// ThinkingVisualization.jsx
import React, { useState, useEffect, useRef } from 'react';
import { ArrowDown, ArrowUp, Sparkles } from 'lucide-react';
import { thinkingFragments } from './constants';

const ThinkingVisualization = ({ 
  thinkingText, 
  showThinking = true, 
  onToggleThinking 
}) => {
  const [expanded, setExpanded] = useState(false);
  const [particleCount, setParticleCount] = useState(30);
  const [displayFragment, setDisplayFragment] = useState("");
  const [isContentChanging, setIsContentChanging] = useState(false);
  const [fragmentIndex, setFragmentIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const fragmentIntervalRef = useRef(null);
  const prevTextLengthRef = useRef(thinkingText?.length || 0);
  const stableTimeoutRef = useRef(null);
  const lastChangeTimeRef = useRef(Date.now());
  const debounceTimerRef = useRef(null);
  
  const getRandomFragment = (step) => {
    const messages = thinkingFragments[step];
    // Instead of picking a random message each time, we'll use the current index
    // This ensures the same message stays visible during rapid renders
    return messages[fragmentIndex % messages.length];
  };
  
  const toggleExpanded = () => {
    setExpanded(prevState => !prevState);
  };
  
  // Handle container size for particles
  useEffect(() => {
    if (containerRef.current) {
      const width = containerRef.current.offsetWidth;
      setParticleCount(Math.floor(width / 15));
    }
  }, []);
  
  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (expanded && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [thinkingText, expanded]);
  
  // Change fragment every 2-3 seconds, not on every update
  useEffect(() => {
    if (!isContentChanging) return;
    
    // Set up message cycling with deterministic timing
    fragmentIntervalRef.current = setInterval(() => {
      // Increment step (category of thinking)
      setCurrentStep(prevStep => (prevStep + 1) % thinkingFragments.length);
      // Change the fragment index within the category
      setFragmentIndex(prevIndex => prevIndex + 1);
    }, 2500); // Fixed interval of 2.5 seconds
    
    return () => {
      if (fragmentIntervalRef.current) {
        clearInterval(fragmentIntervalRef.current);
      }
    };
  }, [isContentChanging]);
  
  // Update displayed fragment whenever currentStep changes
  useEffect(() => {
    if (isContentChanging) {
      setDisplayFragment(getRandomFragment(currentStep));
    } else {
      setDisplayFragment("Thoughts...");
    }
  }, [currentStep, fragmentIndex, isContentChanging]);
  
  // Detect content changes with debouncing
  useEffect(() => {
    const currentLength = thinkingText?.length || 0;
    
    // If there's a significant change in content length
    if (Math.abs(currentLength - prevTextLengthRef.current) > 2) {
      // Update last change time
      lastChangeTimeRef.current = Date.now();
      
      // Mark as changing if not already
      if (!isContentChanging) {
        setIsContentChanging(true);
        // Initialize fragment
        setDisplayFragment(getRandomFragment(0));
      }
      
      // Clear any existing timeout
      if (stableTimeoutRef.current) {
        clearTimeout(stableTimeoutRef.current);
      }
      
      // Create a new timeout to check for stability
      stableTimeoutRef.current = setTimeout(() => {
        const timeSinceLastChange = Date.now() - lastChangeTimeRef.current;
        // Only mark as stable if no changes for 3 seconds
        if (timeSinceLastChange >= 3000) {
          setIsContentChanging(false);
          setDisplayFragment("Thoughts...");
        }
      }, 3000);
      
      prevTextLengthRef.current = currentLength;
    }
    
    // Clean up on unmount
    return () => {
      if (stableTimeoutRef.current) {
        clearTimeout(stableTimeoutRef.current);
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [thinkingText]);
  
  if (!showThinking) return null;
  
  return (
    <div 
      ref={containerRef} 
      className="relative w-full mb-4 border border-indigo-100 dark:border-indigo-900 rounded-lg bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950 dark:to-blue-950 overflow-hidden"
    >
      {/* Neural network animated background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {Array.from({ length: particleCount }).map((_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute w-1 h-1 bg-indigo-400 dark:bg-indigo-500 rounded-full opacity-40 animate-float-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>
      
      {/* Neural connections */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={`connection-${i}`}
            className="absolute bg-indigo-200 dark:bg-indigo-600 opacity-20 animate-pulse-line"
            style={{
              width: `${30 + Math.random() * 200}px`,
              height: '1px',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              transform: `rotate(${Math.random() * 360}deg)`,
              animationDuration: `${2 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>
      
      {/* Header with sparkle icon and toggle */}
      <div 
        className="relative z-5 flex items-center justify-between px-4 py-2 cursor-pointer"
        onClick={toggleExpanded}
      >
        <div className="flex items-center space-x-2">
          {/* Sparkles icon container with fixed dimensions to prevent layout shifts */}
          <div className="w-5 h-5 flex items-center justify-center">
            {/* Animated Sparkles icon when content is changing */}
            <div className={isContentChanging ? "animate-sparkle" : ""}>
              <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            </div>
          </div>
          
          {/* Animated thinking state text (only visible when collapsed) */}
          {!expanded ? (
            <div className="flex items-center">
              {/* Fixed height container for thinking fragment to prevent layout shifts */}
              <div className="relative h-6 overflow-hidden min-w-[120px]">
                {/* Thinking fragment with controlled transitions */}
                <div className="animate-thinking-text">
                  <span className="font-medium text-indigo-700 dark:text-indigo-300 italic">
                    {displayFragment}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <span className="font-medium text-indigo-700 dark:text-indigo-300">
              AI Thought Process
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onToggleThinking();
            }}
            className="text-sm text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition"
          >
            {showThinking ? 'Hide' : 'Show'}
          </button>
          {expanded ? 
            <ArrowUp className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> : 
            <ArrowDown className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          }
        </div>
      </div>
      
      {/* Thinking content with conditional max height */}
      <div className="relative z-5 px-4 pb-2">
        <div 
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            expanded ? 'max-h-96' : 'max-h-12'
          }`}
        >
          <div 
            ref={contentRef}
            className={`relative font-mono text-sm text-indigo-800 dark:text-indigo-200 whitespace-pre-wrap ${
              !expanded ? 'mask-fade-bottom' : 'max-h-96 overflow-y-auto scrollbar-hide pr-2'
            }`}
          >
            {thinkingText}
          </div>
        </div>
      </div>
      
      {/* Glowing borders effect */}
      <div className="absolute inset-0 border border-indigo-200 dark:border-indigo-700 rounded-lg opacity-50 animate-pulse-slow"></div>
    </div>
  );
};

export default ThinkingVisualization;