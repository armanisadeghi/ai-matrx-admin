"use client";
import React, { useState, useEffect } from "react";
import RecipeContent from "./RecipeContent";
import { SocketHook } from "@/lib/redux/socket/hooks/useSocket";

interface PersistentRecipeContentProps {
  socketHook: SocketHook;
  isVisible: boolean;
}

const PersistentRecipeContent: React.FC<PersistentRecipeContentProps> = ({ 
  socketHook, 
  isVisible 
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div 
      style={{ 
        display: isVisible ? 'block' : 'none',
        height: '100%',
        width: '100%'
      }}
    >
      <RecipeContent socketHook={socketHook} />
    </div>
  );
};

export default PersistentRecipeContent;