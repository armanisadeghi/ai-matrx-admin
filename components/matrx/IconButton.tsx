import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface IconButtonProps {
  // Icon component to render
  icon: React.ComponentType<{ size?: number }>;
  // Optional click handler
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  // Optional size for the icon (defaults to 22)
  size?: number;
  // Optional title for tooltip
  title?: string;
  // Optional className for additional styling
  className?: string;
  // Optional initial state if button needs to track state
  initialState?: boolean;
  // If true, component will use internal state management
  useInternalState?: boolean;
  // External state control (optional)
  isActive?: boolean;
  // Optional custom hover background color
  hoverBgClass?: string;
  // Optional disabled state
  disabled?: boolean;
  // Optional aria-label for accessibility
  ariaLabel?: string;
}

const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  onClick,
  size = 22,
  title,
  className,
  initialState = false,
  useInternalState = false,
  isActive,
  hoverBgClass = 'hover:bg-current/10',
  disabled = false,
  ariaLabel,
}) => {
  // Internal state management if needed
  const [internalState, setInternalState] = useState(initialState);

  // Determine if we should use internal or external state
  const active = useInternalState ? internalState : isActive;

  // Handle click events
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    
    if (useInternalState) {
      setInternalState(!internalState);
    }
    
    onClick?.(e);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      aria-label={ariaLabel || title}
      title={title}
      className={cn(
        "relative inline-flex items-center justify-center",
        "p-1.5 rounded-md transition-colors",
        "text-muted-foreground cursor-pointer",
        hoverBgClass,
        disabled && "opacity-50 cursor-not-allowed",
        active && "text-primary",
        className
      )}
    >
      <Icon size={size} />
    </button>
  );
};

export default IconButton;