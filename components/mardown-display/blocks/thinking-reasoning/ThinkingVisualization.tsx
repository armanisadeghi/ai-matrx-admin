import React, { useState, useEffect, useRef } from "react";
import { ArrowDown, ArrowUp, Sparkles } from "lucide-react";
import { aiProcessText, tagMappings } from "../../chat-markdown/constants";

// Helper function to get tag type from a line
const getTagType = (line) => {
  if (!line || !line.startsWith("###")) return null;
  
  for (const [tagType, regex] of Object.entries(tagMappings)) {
    if (regex.test(line)) {
      return tagType;
    }
  }
  return null;
};

// Helper function to get a random message for a tag type
const getRandomMessage = (tagType) => {
  if (!tagType || !aiProcessText[tagType]) return "Thoughts...";
  const messages = aiProcessText[tagType];
  return messages[Math.floor(Math.random() * messages.length)];
};

const ThinkingVisualization = ({ thinkingText, showThinking = true }) => {
  const [expanded, setExpanded] = useState(false);
  const [particleCount, setParticleCount] = useState(30);
  const [displayFragment, setDisplayFragment] = useState("Thoughts...");
  const [isContentChanging, setIsContentChanging] = useState(false);
  const [reachedFinalTag, setReachedFinalTag] = useState(false);
  
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const prevTextLengthRef = useRef(thinkingText?.length || 0);
  const prevTagTypeRef = useRef(null);
  const tagCountRef = useRef(0);
  const isScrollingRef = useRef(false);

  // Count detected tags and update message only when a new tag is found
  useEffect(() => {
    if (!thinkingText) {
      setDisplayFragment("Thoughts...");
      setReachedFinalTag(false);
      prevTagTypeRef.current = null;
      tagCountRef.current = 0;
      return;
    }

    const lines = thinkingText.split("\n");
    let tagCount = 0;
    let lastTagType = null;
    
    // Count tags and find the last one
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const tagType = getTagType(line);
      
      if (tagType) {
        tagCount++;
        lastTagType = tagType;
        
        // Check if it's a final tag
        if (tagType === 'readyToRespond' || tagType === 'preparingQuestionsToAsk') {
          setReachedFinalTag(true);
        }
      }
    }
    
    // Only update if we found more tags than before
    if (tagCount > tagCountRef.current) {
      tagCountRef.current = tagCount;
      
      // Only update message if tag type changed
      if (lastTagType !== prevTagTypeRef.current) {
        prevTagTypeRef.current = lastTagType;
        setDisplayFragment(getRandomMessage(lastTagType));
      }
    }
  }, [thinkingText]);

  // Detect content changes for visual effect (Sparkles animation)
  useEffect(() => {
    const currentLength = thinkingText?.length || 0;
    if (currentLength !== prevTextLengthRef.current) {
      setIsContentChanging(true);
      prevTextLengthRef.current = currentLength;
      
      // Reset isContentChanging after a short delay to stop the animation
      const timeout = setTimeout(() => {
        setIsContentChanging(false);
      }, 500);
      
      return () => clearTimeout(timeout);
    }
  }, [thinkingText]);

  // Set particle count based on container width
  useEffect(() => {
    if (containerRef.current) {
      const width = containerRef.current.offsetWidth;
      setParticleCount(Math.floor(width / 15));
    }
  }, []);

  // Auto-scroll content to bottom whenever content changes
  useEffect(() => {
    if (contentRef.current) {
      // More aggressive auto-scrolling during streaming
      const scrollToBottom = () => {
        if (contentRef.current && !isScrollingRef.current) {
          contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
      };
      
      // Initial scroll
      scrollToBottom();
      
      // Set up multiple scrolls with small delays to ensure it keeps up with streaming
      const scrollInterval = setInterval(scrollToBottom, 100);
      
      // Clean up interval when content stops changing
      const clearScrolling = setTimeout(() => {
        clearInterval(scrollInterval);
      }, 1000);
      
      return () => {
        clearInterval(scrollInterval);
        clearTimeout(clearScrolling);
      };
    }
  }, [thinkingText]);
  
  // Handle manual scrolling detection
  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 20; // 20px tolerance for better experience
        
        // If user scrolled away from bottom, mark as manual scrolling
        if (!isAtBottom) {
          isScrollingRef.current = true;
          
          // Reset auto-scroll after user inactivity (3 seconds)
          const inactivityTimer = setTimeout(() => {
            isScrollingRef.current = false;
          }, 3000);
          
          // Store the timer so we can clear it if needed
          return () => clearTimeout(inactivityTimer);
        } else {
          // If user scrolled back to bottom, resume auto-scrolling immediately
          isScrollingRef.current = false;
        }
      }
    };
    
    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('scroll', handleScroll);
      return () => contentElement.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const toggleExpanded = (e) => {
    // Prevent the click from affecting the scroll position
    e.stopPropagation();
    setExpanded((prevState) => !prevState);
  };

  if (!showThinking) return null;

  return (
    <div
      ref={containerRef}
      className="relative w-full mb-4 border border-indigo-100 dark:border-indigo-900 rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950 dark:to-blue-950 overflow-hidden"
    >
      {/* Neural network animated background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ zIndex: 1 }}>
        {Array.from({ length: particleCount }).map((_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute w-1 h-1 bg-indigo-400 dark:bg-indigo-500 rounded-full opacity-40 animate-float-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>
      
      {/* Neural connections */}
      <div className="absolute inset-0 w-full h-full overflow-hidden rounded-t-2xl" style={{ zIndex: 2 }}>
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={`connection-${i}`}
            className="absolute bg-indigo-200 dark:bg-indigo-600 opacity-20 animate-pulse-line"
            style={{
              width: `${30 + Math.random() * 200}px`,
              height: "1px",
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              transform: `rotate(${Math.random() * 360}deg)`,
              animationDuration: `${2 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>
      
      {/* Header with sparkle icon and toggle */}
      <div
        className="relative flex items-center justify-between px-4 py-2 cursor-pointer rounded-t-2xl"
        onClick={toggleExpanded}
        style={{ zIndex: 10 }}
      >
        <div className="flex items-center space-x-2">
          {/* Sparkles icon container with fixed dimensions */}
          <div className="w-5 h-5 flex items-center justify-center">
            <div className={isContentChanging ? "animate-sparkle" : ""}>
              <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            </div>
          </div>
          
          {/* Display message */}
          {!expanded ? (
            <div className="flex items-center">
              <div className="relative h-6 overflow-hidden min-w-[120px]">
                {/* Only animate if not a final tag */}
                <div className={reachedFinalTag ? "" : "animate-thinking-text"}>
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
        
        {/* Toggle controls */}
        <div className="flex items-center space-x-4">
          {expanded ? (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-indigo-500 dark:text-indigo-400">Hide</span>
              <ArrowUp className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-indigo-500 dark:text-indigo-400">Show</span>
              <ArrowDown className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            </div>
          )}
        </div>
      </div>
      
      {/* Thinking content - using scrollable containers both when expanded and collapsed */}
      <div className="relative px-4 pb-2 pt-0" style={{ zIndex: 3 }}>
        <div 
          className={`transition-all duration-300 ease-in-out ${
            expanded ? "max-h-96" : "max-h-12"
          } p-0 m-0`}
        >
          <div
            ref={contentRef}
            className="relative font-mono text-xs text-indigo-800 dark:text-indigo-200 whitespace-pre-wrap overflow-y-auto scrollbar-none pr-2 pt-0 mt-0"
            style={{ 
              scrollBehavior: "smooth",
              height: expanded ? "24rem" : "3rem", // Fixed height to ensure scrolling works in both states
              padding: 0,
              margin: 0
            }}
            onClick={(e) => e.stopPropagation()} // Allow clicking and dragging within the content area
          >
            {thinkingText}
          </div>
        </div>
      </div>
      
      {/* Glowing borders effect */}
      <div
        className="absolute inset-0 border border-indigo-200 dark:border-indigo-700 rounded-2xl opacity-50 animate-pulse-slow"
        style={{ zIndex: 0 }}
      ></div>
    </div>
  );
};

export default ThinkingVisualization;