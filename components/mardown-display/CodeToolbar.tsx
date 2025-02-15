import React from 'react';
import { Check, Copy, Download, Expand, Minimize, ChevronDown, ChevronUp, Edit2, Eye } from 'lucide-react';
import { cn } from "@/styles/themes/utils";

interface CodeToolbarProps {
  language: string;
  lineCount: number;
  isCopied: boolean;
  isExpanded: boolean;
  isCollapsed: boolean;
  isEditing: boolean;
  onCopy: (e: React.MouseEvent) => void;
  onDownload: (e: React.MouseEvent) => void;
  onExpand: (e: React.MouseEvent) => void;
  onCollapse: (e: React.MouseEvent) => void;
  onEdit: (e: React.MouseEvent) => void;
}

const CodeToolbar: React.FC<CodeToolbarProps> = ({
  language,
  lineCount,
  isCopied,
  isExpanded,
  isCollapsed,
  isEditing,
  onCopy,
  onDownload,
  onExpand,
  onCollapse,
  onEdit,
}) => {
  const buttonClass = "p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors z-10";

  return (
    <div 
      className={cn(
        "flex items-center justify-between px-4 py-2 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700",
        !isEditing && "cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
      )}
      onClick={isEditing ? undefined : (e) => onCollapse(e)}
    >
      <div className="flex items-center space-x-4">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-neutral-500 dark:text-neutral-400 font-mono">
            {language}
          </span>
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            {lineCount} {lineCount === 1 ? 'line' : 'lines'}
          </span>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={(e) => { e.stopPropagation(); onCopy(e); }}
          className={buttonClass}
          title={isCopied ? "Copied!" : "Copy code"}
        >
          {isCopied ? <Check size={16} /> : <Copy size={16} />}
        </button>
        
        <button
          onClick={(e) => { e.stopPropagation(); onDownload(e); }}
          className={buttonClass}
          title="Download code"
        >
          <Download size={16} />
        </button>
        
        <button
          onClick={(e) => { e.stopPropagation(); onExpand(e); }}
          className={buttonClass}
          title={isExpanded ? "Minimize" : "Expand"}
        >
          {isExpanded ? <Minimize size={16} /> : <Expand size={16} />}
        </button>
        
        {!isEditing && (
          <button
            onClick={(e) => { e.stopPropagation(); onCollapse(e); }}
            className={buttonClass}
            title={isCollapsed ? "Expand code" : "Collapse code"}
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        )}
        
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(e); }}
          className={cn(
            buttonClass,
            "bg-neutral-100/90 dark:bg-neutral-800/90 backdrop-blur-sm",
            "border border-neutral-200 dark:border-neutral-700"
          )}
          title={isEditing ? "View code" : "Edit code"}
        >
          {isEditing ? <Eye size={16} /> : <Edit2 size={16} />}
        </button>
      </div>
    </div>
  );
};

export default CodeToolbar;