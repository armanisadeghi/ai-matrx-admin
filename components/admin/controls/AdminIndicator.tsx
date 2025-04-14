// components/admin/AdminIndicator.tsx
import React, { useState, useRef, useEffect } from "react";
import { useSocketConnection, SocketConnectionHook } from "@/lib/redux/socket/useSocketConnection";
import SmallIndicator from "./SmallIndicator";
import MediumIndicator from "./MediumIndicator";
import LargeIndicator from "./LargeIndicator";

interface User {
  id: string;
  email?: string;
  name?: string;
  userMetadata?: {
    fullName: string;
  };
}

interface AdminIndicatorProps {
  user: User;
}

type IndicatorSize = "small" | "medium" | "large";

interface Position {
  x: number;
  y: number;
}

const AdminIndicator: React.FC<AdminIndicatorProps> = ({ user }) => {
  const {
    socketManager,
    isConnected,
    isAuthenticated,
    getAvailableServers,
    connectToServer,
    overrideNamespace,
    clearServerOverride,
    currentServer,
    currentNamespace,
  } = useSocketConnection();

  const [size, setSize] = useState<IndicatorSize>("small");
  const [position, setPosition] = useState<Position>({ x: 20, y: 60 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const indicatorRef = useRef<HTMLDivElement>(null);

  // Drag handling functions
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (indicatorRef.current) {
      const rect = indicatorRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle dragging event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Size cycling functions
  const cycleSize = (direction: "up" | "down") => {
    const sizes: IndicatorSize[] = ["small", "medium", "large"];
    const currentIndex = sizes.indexOf(size);
    if (direction === "up") {
      const nextIndex = (currentIndex + 1) % sizes.length;
      setSize(sizes[nextIndex]);
    } else if (direction === "down") {
      const prevIndex = (currentIndex - 1 + sizes.length) % sizes.length;
      setSize(sizes[prevIndex]);
    }
  };

  // Render the appropriate indicator based on size
  const renderIndicator = () => {
    switch (size) {
      case "medium":
        return (
          <div
            ref={indicatorRef}
            style={{
              position: "fixed",
              left: `${position.x}px`,
              top: `${position.y}px`,
              zIndex: 9999,
              userSelect: "none",
              cursor: isDragging ? "grabbing" : "default",
              transition: isDragging ? "none" : "all 0.2s ease",
              filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25))",
            }}
          >
            <MediumIndicator 
              user={user}
              isConnected={isConnected}
              isAuthenticated={isAuthenticated}
              currentServer={currentServer}
              currentNamespace={currentNamespace}
              onDragStart={handleMouseDown}
              onSizeUp={() => cycleSize("up")}
              onSizeDown={() => cycleSize("down")}
              getAvailableServers={getAvailableServers}
              connectToServer={connectToServer}
              overrideNamespace={overrideNamespace}
              clearServerOverride={clearServerOverride}
            />
          </div>
        );
      case "large":
        return (
          <LargeIndicator 
            user={user}
            isConnected={isConnected}
            currentServer={currentServer}
            onSizeDown={() => setSize("medium")}
            onSizeSmall={() => setSize("small")}
          />
        );
      default: // "small" case
        return (
          <div
            ref={indicatorRef}
            style={{
              position: "fixed",
              left: `${position.x}px`,
              top: `${position.y}px`,
              zIndex: 9999,
              userSelect: "none",
              cursor: isDragging ? "grabbing" : "default",
              transition: isDragging ? "none" : "all 0.2s ease",
              filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25))",
            }}
          >
            <SmallIndicator 
              isConnected={isConnected}
              currentServer={currentServer}
              onDragStart={handleMouseDown}
              onSizeChange={() => cycleSize("up")}
            />
          </div>
        );
    }
  };

  return <>{renderIndicator()}</>;
};

export default AdminIndicator;