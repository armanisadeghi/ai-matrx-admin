import React, { useRef, useEffect, useState } from 'react';
import { Edit, Trash2, Share2, Archive, Copy, MoreVertical } from 'lucide-react';
import clsx from 'clsx';

interface ConversationContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  conversationId: string | null;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onShare?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  menuRef: React.RefObject<HTMLDivElement>;
}

export const ConversationContextMenu: React.FC<ConversationContextMenuProps> = ({
  isOpen,
  position,
  conversationId,
  onClose,
  onEdit,
  onDelete,
  onShare,
  onArchive,
  onDuplicate,
  menuRef
}) => {
  // Adjust position to keep menu within viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 200), // 200px is approximate menu width
    y: Math.min(position.y, window.innerHeight - 250) // 250px is approximate max menu height
  };

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !conversationId) return null;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: `${adjustedPosition.y}px`,
        left: `${adjustedPosition.x}px`,
        zIndex: 50,
      }}
      className="bg-textured shadow-lg rounded-md border border-gray-200 dark:border-gray-700 min-w-[180px] overflow-hidden"
    >
      <div className="py-1">
        <button
          onClick={() => {
            onEdit(conversationId);
            onClose();
          }}
          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Edit size={16} className="mr-3 text-gray-500 dark:text-gray-400" />
          Rename
        </button>
        
        {onShare && (
          <button
            onClick={() => {
              onShare(conversationId);
              onClose();
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Share2 size={16} className="mr-3 text-gray-500 dark:text-gray-400" />
            Share
          </button>
        )}
        
        {onDuplicate && (
          <button
            onClick={() => {
              onDuplicate(conversationId);
              onClose();
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Copy size={16} className="mr-3 text-gray-500 dark:text-gray-400" />
            Duplicate
          </button>
        )}
        
        {onArchive && (
          <button
            onClick={() => {
              onArchive(conversationId);
              onClose();
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Archive size={16} className="mr-3 text-gray-500 dark:text-gray-400" />
            Archive
          </button>
        )}
      </div>
      
      <div className="border-t border-gray-200 dark:border-gray-700 py-1">
        <button
          onClick={() => {
            onDelete(conversationId);
            onClose();
          }}
          className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Trash2 size={16} className="mr-3" />
          Delete
        </button>
      </div>
    </div>
  );
};

// Trigger button component that can be used to open the context menu
export const ContextMenuTrigger: React.FC<{
  onClick: (e: React.MouseEvent) => void;
  className?: string;
}> = ({ onClick, className }) => {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "p-1 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800",
        className
      )}
    >
      <MoreVertical size={16} />
    </button>
  );
};

// Hook to easily implement context menu functionality
export const useContextMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [targetId, setTargetId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const handleOpen = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setPosition({ x: e.clientX, y: e.clientY });
    setTargetId(id);
    setIsOpen(true);
  };
  
  const handleClose = () => {
    setIsOpen(false);
  };
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  return {
    isOpen,
    position,
    targetId,
    menuRef,
    handleOpen,
    handleClose
  };
};

export default ConversationContextMenu;