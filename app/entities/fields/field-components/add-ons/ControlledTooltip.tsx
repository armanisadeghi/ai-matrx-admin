import React, { useState, useEffect } from 'react';

interface ControlledTooltipProps {
  text?: string;
  show: boolean;
  onHide?: () => void;
  className?: string;
}

const ControlledTooltip = ({ 
  text, 
  show, 
  onHide,
  className = "" 
}: ControlledTooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [content, setContent] = useState("");

  useEffect(() => {
    if (show && text) {
      setContent(text);
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onHide?.();
      }, 200); // Small delay for fade out animation
      return () => clearTimeout(timer);
    }
  }, [show, text, onHide]);

  if (!isVisible) return null;

  return (
    <div 
      className={`
        absolute -top-8 left-1/2 -translate-x-1/2 
        px-2 py-1 rounded-md text-xs
        bg-black text-white whitespace-nowrap
        transition-opacity duration-200
        ${className}
      `}
    >
      {content}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-black" />
    </div>
  );
};

export default React.memo(ControlledTooltip);