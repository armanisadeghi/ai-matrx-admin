import React, { useState, useRef, useEffect } from 'react';
import { Activity, Server, Database, Settings, ChevronRight, ChevronDown, X, Move } from 'lucide-react';
import { SocketManager } from '@/lib/redux/socket/manager';

const AdminIndicator = ({ isAdmin = true, socketConnected = true, isLocalhost = true }) => {
  const [size, setSize] = useState('small'); // 'small', 'medium', 'large'
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  
  const indicatorRef = useRef(null);
  
  // Handle dragging functionality
  const handleMouseDown = (e) => {
    if (indicatorRef.current) {
      const rect = indicatorRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };
  
  const handleMouseMove = (e) => {
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
  
  // Add and remove event listeners
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
  
  // Cycle through sizes
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
  
  // Small size component
  const SmallIndicator = () => (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-white shadow-lg">
      <div 
        className="cursor-move p-1 rounded hover:bg-slate-700" 
        onMouseDown={handleMouseDown}
      >
        <Move size={14} />
      </div>
      
      <div className="flex items-center">
        <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <Activity size={14} className="ml-1" />
      </div>
      
      <div className="flex items-center">
        <div className={`w-2 h-2 rounded-full ${isLocalhost ? 'bg-yellow-400' : 'bg-blue-400'}`} />
        <Server size={14} className="ml-1" />
      </div>
      
      <button 
        onClick={() => cycleSize('up')}
        className="p-1 rounded hover:bg-slate-700"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
  
  // Medium size component
  const MediumIndicator = () => (
    <div className="flex flex-col w-48 rounded-lg bg-slate-800 text-white shadow-lg overflow-hidden">
      <div className="flex justify-between items-center px-3 py-2 bg-slate-900">
        <div className="font-semibold text-xs">Admin Controls</div>
        <div className="flex items-center gap-1">
          <div 
            className="cursor-move p-1 rounded hover:bg-slate-700" 
            onMouseDown={handleMouseDown}
          >
            <Move size={14} />
          </div>
          <div className="flex">
            <button 
              onClick={() => cycleSize('down')}
              className="p-1 rounded hover:bg-slate-700"
            >
              <ChevronRight size={14} className="rotate-180" />
            </button>
            <button 
              onClick={() => cycleSize('up')}
              className="p-1 rounded hover:bg-slate-700"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        </div>
      </div>
      
      <div className="px-3 py-2 text-xs">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-1">
            <Activity size={14} />
            <span>Socket Status</span>
          </div>
          <span className={socketConnected ? 'text-green-400' : 'text-red-400'}>
            {socketConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-1">
            <Server size={14} />
            <span>Environment</span>
          </div>
          <span className={isLocalhost ? 'text-yellow-400' : 'text-blue-400'}>
            {isLocalhost ? 'Localhost' : 'Production'}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1">
            <Database size={14} />
            <span>Active Users</span>
          </div>
          <span>234</span>
        </div>
      </div>
      
      <div className="px-3 py-2 border-t border-slate-700">
        <button 
          onClick={() => setSize('large')}
          className="w-full text-xs py-1 px-2 bg-slate-700 hover:bg-slate-600 rounded flex items-center justify-center gap-1"
        >
          <Settings size={12} />
          <span>Admin Panel</span>
        </button>
      </div>
    </div>
  );
  
  // Large size component - placeholder for your existing component
  const LargeIndicator = () => (
    <div className="w-80 rounded-lg bg-slate-800 text-white shadow-lg overflow-hidden">
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
              onClick={() => setSize('medium')}
              className="p-1 rounded hover:bg-slate-700"
            >
              <ChevronRight size={16} className="rotate-180" />
            </button>
            <button 
              onClick={() => setSize('small')}
              className="p-1 rounded hover:bg-slate-700"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <div className="text-sm mb-4">
          This is where your full admin component would go. 
          You mentioned you already have a great component for this.
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-700 p-3 rounded">
            <div className="text-xs text-slate-400">Server Status</div>
            <div className="text-lg font-semibold text-green-400">Online</div>
          </div>
          <div className="bg-slate-700 p-3 rounded">
            <div className="text-xs text-slate-400">Active Users</div>
            <div className="text-lg font-semibold">234</div>
          </div>
          <div className="bg-slate-700 p-3 rounded">
            <div className="text-xs text-slate-400">Database</div>
            <div className="text-lg font-semibold text-blue-400">Connected</div>
          </div>
          <div className="bg-slate-700 p-3 rounded">
            <div className="text-xs text-slate-400">Environment</div>
            <div className="text-lg font-semibold text-yellow-400">Localhost</div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm">
            View Logs
          </button>
          <button className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm">
            User Management
          </button>
        </div>
      </div>
    </div>
  );
  
  // Display the appropriate size
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

  // Only display for admins
  if (!isAdmin) return null;
  
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