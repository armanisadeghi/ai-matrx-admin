"use client";
import { CopyPlus, Trash2, Edit, Link, Copy, Package } from "lucide-react";
import { Node } from "reactflow";
import { NodeData } from "../WorkflowEditor";
import { useEffect, useRef } from "react";

interface NodeContextMenuProps {
  node: Node<NodeData>;
  position: { x: number; y: number };
  onClose: () => void;
  onDelete: (nodeId: string) => void;
  onDuplicate: (nodeId: string) => void;
  onEdit: (nodeId: string) => void;
  onViewBrokers?: (nodeId: string) => void;
}

const NodeContextMenu: React.FC<NodeContextMenuProps> = ({
  node,
  position,
  onClose,
  onDelete,
  onDuplicate,
  onEdit,
  onViewBrokers
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Add click-outside detection to close the menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && event.target && !menuRef.current.contains(event.target as HTMLElement)) {
        onClose();
      }
    };

    // Add the event listener after a small delay to avoid immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div 
      ref={menuRef}
      className="absolute z-10 bg-white dark:bg-gray-800 shadow-md rounded-md border border-gray-200 dark:border-gray-700 p-1"
      style={{ 
        left: position.x, 
        top: position.y,
        minWidth: '160px'
      }}
    >
      <ul className="text-sm">
        <li>
          <button 
            onClick={() => { onEdit(node.id); onClose(); }}
            className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
          >
            <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            Edit Properties
          </button>
        </li>
        {onViewBrokers && (
          <li>
            <button 
              onClick={() => { onViewBrokers(node.id); onClose(); }}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
            >
              <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              Manage Brokers
            </button>
          </li>
        )}
        <li>
          <button 
            onClick={() => { onDuplicate(node.id); onClose(); }}
            className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
          >
            <Copy className="h-4 w-4 text-green-600 dark:text-green-400" />
            Duplicate
          </button>
        </li>
        <li className="border-t border-gray-200 dark:border-gray-700 my-1"></li>
        <li>
          <button 
            onClick={() => { onDelete(node.id); onClose(); }}
            className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500 dark:text-red-400 rounded flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </li>
      </ul>
    </div>
  );
};

export default NodeContextMenu; 