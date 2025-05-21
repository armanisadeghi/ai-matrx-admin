"use client";

import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/ui/spinner";

interface PreviewLoadingWithMessageProps {
  isLoading: boolean;
  isPreview: boolean;
}

export default function PreviewLoadingWithMessage({ isLoading, isPreview }: PreviewLoadingWithMessageProps) {
  const [showMessage, setShowMessage] = useState(true);
  
  useEffect(() => {
    if (!isLoading && isPreview) {
      const timer = setTimeout(() => {
        setShowMessage(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, isPreview]);
  
  if (!isPreview || (isPreview && !isLoading && !showMessage)) {
    return null;
  }
  
  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-3">
      <LoadingSpinner />
      <p className="text-indigo-600 dark:text-indigo-400 font-medium text-base">
        Not intended to match the exact sizing and spacing
      </p>
    </div>
  );
} 