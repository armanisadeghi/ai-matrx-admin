// components/AdminIndicator.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Server, ChevronRight, ChevronDown, X, Move, User } from 'lucide-react';
import { TbBrandSocketIo } from 'react-icons/tb';
import { usePathname } from 'next/navigation';
import { PiPathFill } from "react-icons/pi";

interface User {
  id: string;
  email?: string;
  name?: string;
  [key: string]: any;
}

interface AdminIndicatorProps {
  user: User;
  socketConnected?: boolean;
  socketUrl: string;
}

const AdminIndicator = ({ 
  user, 
  socketConnected = false, 
  socketUrl = ""
}: AdminIndicatorProps) => {
  const [size, setSize] = useState('small');
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const currentPath = usePathname();
  const indicatorRef = useRef(null);
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event from bubbling up
    if (indicatorRef.current) {
      const rect = indicatorRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };
  
  // Add this function to handle container clicks
  const handleContainerMouseDown = (e: React.MouseEvent) => {
    // Only trigger drag if clicking on the container itself, not its children
    if (e.currentTarget === e.target) {
      handleMouseDown(e);
    }
  };
  
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);
  
  const cycleSize = (direction = 'up') => {
    const sizes = ['small', 'medium', 'large'];
    const currentIndex = sizes.indexOf(size);
    
    if (direction === 'up') {
      const nextIndex = (currentIndex + 1) % sizes.length;
      setSize(sizes[nextIndex]);
    } else if (direction === 'down') {
      const prevIndex = (currentIndex - 1 + sizes.length) % sizes.length;
      setSize(sizes[prevIndex]);
    }
  };
  
  const SmallIndicator = () => (
    <div 
      className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800 text-white shadow-lg" 
      onMouseDown={handleContainerMouseDown}
    >
      <div 
        className="cursor-move p-1 rounded hover:bg-slate-700" 
        onMouseDown={handleMouseDown}
      >
        <Move size={14} />
      </div>
      <div className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <TbBrandSocketIo size={14} />
      </div>
      <div className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${socketUrl === "Not connected" || socketUrl === "Connection error" ? 'bg-red-500' : (socketUrl.includes('localhost') ? 'bg-green-400' : 'bg-blue-400')}`} />
        <Server size={14} />
      </div>
      <button 
        onClick={(e) => {
          e.stopPropagation(); // Prevent event from bubbling up
          cycleSize('up');
        }} 
        className="p-1 rounded hover:bg-slate-700"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
  
  const MediumIndicator = () => (
    <div 
      className="flex flex-col w-96 rounded-lg bg-slate-800 text-white shadow-lg overflow-hidden" 
      onMouseDown={handleContainerMouseDown}
    >
      <div className="flex justify-between items-center px-2 py-1 bg-slate-900">
        <div className="font-semibold text-sm">Matrx Admin</div>
        <div className="flex items-center gap-1">
          <div 
            className="cursor-move p-1 rounded hover:bg-slate-700" 
            onMouseDown={handleMouseDown}
          >
            <Move size={14} />
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              cycleSize('down');
            }} 
            className="p-1 rounded hover:bg-slate-700"
          >
            <ChevronRight size={14} className="rotate-180" />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              cycleSize('up');
            }} 
            className="p-1 rounded hover:bg-slate-700"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>
      <div className="px-2 py-1 text-xs space-y-1">
        <div className="flex items-center justify-between gap-2">
          <User size={16} />
          <span className="text-blue-400 truncate flex-1 text-right">
            {user.email || user.name || user.id}
          </span>
        </div>
        <div className={`flex items-center justify-between gap-2 ${socketConnected ? 'text-green-400' : 'text-red-400'}`}>
          <TbBrandSocketIo size={16} />
          <span className={socketConnected ? 'text-green-400' : 'text-red-400'}>
            {socketConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Server size={16} />
          <span 
            className={socketUrl === "Not connected" || socketUrl === "Connection error" ? 'text-red-400' : (socketUrl.includes('localhost') ? 'text-green-400' : 'text-blue-400')} 
            title={socketUrl}
          >
            {socketUrl}
          </span>
        </div>
        <div className="flex items-start justify-between gap-2">
          <PiPathFill size={16} />
          <div className="text-xs font-semibold text-blue-400 flex flex-col items-end" title={currentPath}>
            {currentPath.split('/').filter(part => part).map((part, index) => (
              <span key={index} className="text-blue-400">
                {part}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
  
  const LargeIndicator = () => (
    <div 
      className="w-80 rounded-lg bg-slate-800 text-white shadow-lg overflow-hidden"
      onMouseDown={handleContainerMouseDown}
    >
      <div className="flex justify-between items-center px-4 py-3 bg-slate-900">
        <div className="font-semibold">Admin Dashboard</div>
        <div className="flex items-center gap-1">
          <div 
            className="cursor-move p-1 rounded hover:bg-slate-700" 
            onMouseDown={handleMouseDown}
          >
            <Move size={16} />
          </div>
          <div className="flex">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setSize('medium');
              }} 
              className="p-1 rounded hover:bg-slate-700"
            >
              <ChevronRight size={16} className="rotate-180" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setSize('small');
              }} 
              className="p-1 rounded hover:bg-slate-700"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-700 p-3 rounded">
            <div className="text-xs text-slate-400">User ID</div>
            <div className="text-sm font-semibold text-blue-400 truncate" title={user.id}>
              {user.id.slice(0, 8)}...
            </div>
          </div>
          <div className="bg-slate-700 p-3 rounded">
            <div className="text-xs text-slate-400">Socket Status</div>
            <div className={`text-lg font-semibold ${socketConnected ? 'text-green-400' : 'text-red-400'}`}>
              {socketConnected ? 'Online' : 'Offline'}
            </div>
          </div>
          <div className="bg-slate-700 p-3 rounded col-span-2">
            <div className="text-xs text-slate-400">Server URL</div>
            <div className={`text-sm font-semibold ${socketUrl.includes('localhost') ? 'text-yellow-400' : 'text-blue-400'}`} title={socketUrl}>
              {socketUrl}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            View Logs
          </button>
          <button 
            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            User Management
          </button>
        </div>
      </div>
    </div>
  );
  
  const renderIndicator = () => {
    switch(size) {
      case 'medium':
        return <MediumIndicator />;
      case 'large':
        return <LargeIndicator />;
      default:
        return <SmallIndicator />;
    }
  };

  return (
    <div 
      ref={indicatorRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        userSelect: 'none',
        cursor: isDragging ? 'grabbing' : 'default',
        transition: isDragging ? 'none' : 'all 0.2s ease',
        filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25))'
      }}
    >
      {renderIndicator()}
    </div>
  );
};

export default AdminIndicator;