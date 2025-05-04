"use client";

import React, { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  buttonText?: string;
  onButtonClick?: () => void;
  secondaryButton?: ReactNode;
}

const EmptyStateCard: React.FC<EmptyStateCardProps> = ({
  title,
  description,
  icon: Icon,
  buttonText,
  onButtonClick,
  secondaryButton
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="bg-blue-50 dark:bg-blue-950/30 p-6 rounded-full mb-6">
        <Icon 
          className="h-12 w-12 text-blue-500 dark:text-blue-400" 
          strokeWidth={1.5} 
        />
      </div>
      
      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
        {title}
      </h3>
      
      <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md">
        {description}
      </p>
      
      {buttonText && (
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            onClick={onButtonClick}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white"
          >
            {buttonText}
          </Button>
          
          {secondaryButton}
        </div>
      )}
    </div>
  );
};

export default EmptyStateCard; 