import React, { useState, useEffect } from "react";
import { SocketHeader } from "./HeaderWithCompactOption";
import { SocketHook } from "@/lib/redux/socket/hooks/useSocket";

interface ResponsiveHeaderWrapperProps {
  socketHook: SocketHook;
  scrollThreshold?: number;
}

const ResponsiveHeaderWrapper: React.FC<ResponsiveHeaderWrapperProps> = ({ 
  socketHook, 
  scrollThreshold = 10 // Default threshold of 10px
}) => {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Check if window scroll position is beyond the threshold
      if (window.scrollY > scrollThreshold) {
        setIsCompact(true);
      } else {
        setIsCompact(false);
      }
    };

    // Add scroll event listener
    window.addEventListener("scroll", handleScroll);

    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [scrollThreshold]);

  return (
    <SocketHeader 
      socketHook={socketHook} 
      isCompact={isCompact} 
    />
  );
};

export default ResponsiveHeaderWrapper;