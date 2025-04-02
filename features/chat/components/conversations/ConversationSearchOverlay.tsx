import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight, Maximize2, Minimize2, Edit, Trash2, MoreVertical } from 'lucide-react';
import clsx from 'clsx';
import { useConversationPanel } from '@/features/chat/hooks/useConversationPanel';
import ResponseColumn from '@/features/chat/components/response/ResponseColumn';
import { useRouter } from 'next/navigation';
import useOnClickOutside from '@/hooks/useOnClickOutside';

interface ConversationSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConversationSearchOverlay: React.FC<ConversationSearchOverlayProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const {
    contentSearch,
    setContentSearch,
    labelSearch,
    setLabelSearch,
    groupedConversations,
    handleSelectConversation,
    handlePreviewConversation,
    handleCoordinatedFetch,
    handleContextMenu,
    formatRelativeTime
  } = useConversationPanel();
  
  // Local state for the overlay
  const [selectedForPreview, setSelectedForPreview] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false); // Start collapsed with larger preview area
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuConversationId, setContextMenuConversationId] = useState<string | null>(null);

  // Refs
  const overlayContainerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Use a custom close handler that checks if we should prevent closing
  const handleClose = (e?: MouseEvent) => {
    // If we have a click event, check if it's inside the context menu
    if (e && (
      (contextMenuRef.current && contextMenuRef.current.contains(e.target as Node)) ||
      // Also check for click events on context menu buttons or other UI elements that shouldn't close
      (e.target as HTMLElement).closest('.context-menu-trigger') ||
      (e.target as HTMLElement).closest('.prevent-overlay-close')
    )) {
      return; // Don't close the overlay
    }
    
    // Only close if event is outside our overlay and not on a context menu
    if (!e || !overlayRef.current || !overlayRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  // Custom click outside hook
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && overlayRef.current && !overlayRef.current.contains(event.target as Node)) {
        // If we're showing the context menu and the click is inside it, don't close
        if (showContextMenu && contextMenuRef.current && contextMenuRef.current.contains(event.target as Node)) {
          return;
        }
        handleClose(event);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, showContextMenu]);

  // Focus the search input when overlay opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Reset state when overlay closes
  useEffect(() => {
    if (!isOpen) {
      setContentSearch('');
      setLabelSearch('');
      setSelectedForPreview(null);
      setShowContextMenu(false);
    }
  }, [isOpen, setContentSearch, setLabelSearch]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showContextMenu) {
          e.preventDefault();
          e.stopPropagation();
          setShowContextMenu(false);
        } else {
          handleClose();
        }
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, showContextMenu]);

  // Close context menu when clicking outside, but don't close the overlay
  useEffect(() => {
    const handleContextMenuOutside = (event: MouseEvent) => {
      if (
        contextMenuRef.current && 
        !contextMenuRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('.context-menu-trigger')
      ) {
        setShowContextMenu(false);
      }
    };
    
    if (showContextMenu) {
      document.addEventListener('mousedown', handleContextMenuOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleContextMenuOutside);
    };
  }, [showContextMenu]);

  // Handle selecting a conversation for preview
  const handlePreview = (convoId: string) => {
    setSelectedForPreview(convoId);
    handleCoordinatedFetch(convoId);
  };

  // Handle navigating to a conversation
  const handleNavigate = (convoId: string) => {
    handleSelectConversation(convoId);
    onClose();
  };

  // Handle context menu
  const handleLocalContextMenu = (e: React.MouseEvent, convoId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const boundingRect = overlayContainerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    
    // Adjust position relative to the overlay container
    const x = e.clientX;
    const y = e.clientY;
    
    // Check if the context menu would go off the right edge
    const rightEdgeDistance = window.innerWidth - x;
    const adjustedX = rightEdgeDistance < 200 ? x - (200 - rightEdgeDistance) : x;
    
    setContextMenuPosition({ x: adjustedX, y });
    setContextMenuConversationId(convoId);
    setShowContextMenu(true);
  };

  // Handle context menu actions
  const handleEdit = (id: string) => {
    // Implement your edit logic here
    console.log(`Editing conversation: ${id}`);
    setShowContextMenu(false);
  };

  const handleDelete = (id: string) => {
    // Implement your delete logic here
    console.log(`Deleting conversation: ${id}`);
    setShowContextMenu(false);
  };

  if (!isOpen) return null;

  // Calculate if we have any results
  const hasResults = Object.values(groupedConversations).some(group => group.length > 0);

  return (
    <div 
      ref={overlayContainerRef}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        // Only close if clicking the backdrop, not the content
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        ref={overlayRef}
        className="bg-white dark:bg-gray-950 rounded-lg shadow-xl flex flex-col w-full max-w-7xl h-full max-h-[90vh] mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()} // Prevent clicks from bubbling to backdrop
      >
        {/* Header with search inputs */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex-1 flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search conversations..."
                value={labelSearch}
                onChange={(e) => setLabelSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
              />
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <input
                type="text"
                placeholder="Search in content..."
                value={contentSearch}
                onChange={(e) => setContentSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 prevent-overlay-close"
              aria-label={expanded ? "Collapse panel" : "Expand panel"}
            >
              {expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              onClick={() => onClose()}
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 prevent-overlay-close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Conversation list */}
          <div 
            className={clsx(
              "overflow-y-auto border-r border-gray-200 dark:border-gray-800 transition-all duration-300",
              expanded ? "w-1/2" : "w-1/3"
            )}
          >
            {hasResults ? (
              Object.entries(groupedConversations).map(([section, conversations]) => {
                if (conversations.length === 0) return null;
                
                return (
                  <div key={section} className="mb-4">
                    <div className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 sticky top-0 bg-white dark:bg-gray-950 z-10">
                      {section}
                    </div>
                    <div>
                      {conversations.map((convo) => {
                        const isPreviewSelected = selectedForPreview === convo.id;
                        const date = new Date(convo.updatedAt || convo.createdAt);
                        
                        return (
                          <div
                            key={convo.id}
                            onClick={() => handlePreview(convo.id)}
                            onContextMenu={(e) => handleLocalContextMenu(e, convo.id)}
                            className={clsx(
                              "px-4 py-3 cursor-pointer transition-colors duration-200 flex justify-between items-start",
                              isPreviewSelected 
                                ? "bg-gray-100 dark:bg-gray-800 border-l-4 border-blue-500 dark:border-blue-600" 
                                : "hover:bg-gray-50 dark:hover:bg-gray-900"
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                {convo.label || 'Untitled Conversation'}
                              </h3>
                              <div className="flex items-center mt-1">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatRelativeTime(date)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLocalContextMenu(e, convo.id);
                                }}
                                className="p-1 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 prevent-overlay-close context-menu-trigger"
                              >
                                <MoreVertical size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNavigate(convo.id);
                                }}
                                className="p-1 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 prevent-overlay-close"
                              >
                                <ArrowRight size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center justify-center h-full p-8">
                <div className="text-center">
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-300">No results found</p>
                  <p className="mt-1 text-gray-500 dark:text-gray-400">Try adjusting your search terms</p>
                </div>
              </div>
            )}
          </div>

          {/* Preview area */}
          <div 
            className={clsx(
              "bg-gray-50 dark:bg-gray-900 overflow-auto transition-all duration-300",
              expanded ? "w-1/2" : "w-2/3"
            )}
          >
            {selectedForPreview ? (
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {Object.values(groupedConversations)
                      .flat()
                      .find(c => c.id === selectedForPreview)?.label || 'Preview'}
                  </h2>
                  <button
                    onClick={() => handleNavigate(selectedForPreview)}

                    className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white text-sm flex items-center"
                  >
                    <span>Open</span>
                    <ArrowRight size={14} className="ml-1" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <ResponseColumn />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Select a conversation</h2>
                  <p className="mt-2 text-gray-500 dark:text-gray-400">to preview its contents</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <div
          ref={contextMenuRef}
          style={{
            position: "fixed",
            top: `${contextMenuPosition.y}px`,
            left: `${contextMenuPosition.x}px`,
            zIndex: 60,
          }}
          className="bg-white dark:bg-gray-900 shadow-lg rounded-md p-1 border border-gray-200 dark:border-gray-700"
        >
          <button
            onClick={() => contextMenuConversationId && handleEdit(contextMenuConversationId)}
            className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <Edit size={16} className="mr-2" />
            Edit
          </button>
          <button
            onClick={() => contextMenuConversationId && handleDelete(contextMenuConversationId)}
            className="flex items-center w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <Trash2 size={16} className="mr-2" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default ConversationSearchOverlay;