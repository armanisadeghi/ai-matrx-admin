'use client';

import React, { useState } from 'react';
import { IconButton, IconButtonProps } from '@/components/ui/icon-button';
import { CheckCircle2 } from 'lucide-react';

interface ActionFeedbackButtonProps extends Omit<IconButtonProps, 'icon' | 'tooltip'> {
  // Required props
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  
  // Additional props specific to ActionFeedbackButton
  successIcon?: React.ReactNode;
  successTooltip?: string;
  feedbackDuration?: number;
  
  // Override disabledTooltip to make it more visible
  disabledTooltip?: string;
}

/**
 * ActionFeedbackButton - A button that shows visual feedback after an action
 * 
 * This component extends the IconButton and adds visual feedback functionality.
 * It's designed for UI actions that need visual confirmation like save, reset,
 * or other operations where users should see that their action was successful
 * without using alerts or toasts.
 * 
 * It inherits all the tooltip functionality and styling options from IconButton.
 */
const ActionFeedbackButton: React.FC<ActionFeedbackButtonProps> = ({
  // Base icon button props
  icon,
  tooltip,
  variant = 'ghost',
  size = 'sm',
  className = '',
  disabled = false,
  showTooltipOnDisabled = true,
  disabledTooltip,
  
  // Action feedback specific props
  successIcon = <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400" />,
  successTooltip = "Success!",
  feedbackDuration = 2000,
  
  // Event handlers
  onClick,
  ...props
}) => {
  const [showSuccess, setShowSuccess] = useState(false);

  const handleClick = () => {
    // Call the provided onClick handler
    onClick();
    
    // Show success state
    setShowSuccess(true);
    
    // Reset after the specified duration
    setTimeout(() => {
      setShowSuccess(false);
    }, feedbackDuration);
  };

  return (
    <IconButton
      // Visual state based on success state
      icon={showSuccess ? successIcon : icon}
      tooltip={showSuccess ? successTooltip : tooltip}
      
      // Pass through all IconButton props
      variant={variant}
      size={size}
      className={className}
      disabled={disabled || showSuccess} // Prevent multiple clicks during success animation
      showTooltipOnDisabled={showTooltipOnDisabled}
      disabledTooltip={disabledTooltip}
      
      // Override the onClick handler with our own
      onClick={handleClick}
      
      // Pass through any additional props
      {...props}
    />
  );
};

export default ActionFeedbackButton; 