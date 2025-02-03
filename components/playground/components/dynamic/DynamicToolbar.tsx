import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Save, Trash2, Bug, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

// Types for the toolbar configuration
interface ToolbarAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  hideInCollapsed?: boolean;
}

interface SelectorOption {
  id: string;
  label: string;
  value: string;
}

interface ToolbarSelectorConfig {
  options: SelectorOption[];
  defaultValue?: string;
  label?: string;
  onChange: (value: string) => void;
}

export interface DynamicToolbarProps {
  id: string;
  isCollapsed: boolean;
  
  // Selector configuration (optional)
  selector?: ToolbarSelectorConfig;
  
  // Custom actions
  actions?: ToolbarAction[];
  
  // Built-in actions configuration
  showSave?: boolean;
  showDelete?: boolean;
  onSave?: () => void;
  onDelete?: () => void;
  
  // Debug mode
  debug?: boolean;
  onDebugClick?: () => void;
  
  // Drag and drop functionality
  enableDragDrop?: boolean;
  onDragDrop?: (draggedId: string, targetId: string) => void;
  
  // Additional customization
  className?: string;
  selectorClassName?: string;
  actionsClassName?: string;
}

// Action button subcomponent
const ActionButton: React.FC<{
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  className?: string;
}> = ({ onClick, icon, label, className = '' }) => (
  <Button
    variant="ghost"
    size="sm"
    className={`h-6 w-6 p-0 text-muted-foreground hover:text-foreground ${className}`}
    onClick={onClick}
    aria-label={label}
  >
    {icon}
  </Button>
);

// Selector subcomponent
const Selector: React.FC<{
  config: ToolbarSelectorConfig;
  className?: string;
}> = ({ config, className = '' }) => (
  <DropdownMenu>
    <DropdownMenuTrigger className={`text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 ${className}`}>
      {config.options.find(opt => opt.value === config.defaultValue)?.label || config.label || 'Select'}
      <ChevronDown className="h-3 w-3" />
    </DropdownMenuTrigger>
    <DropdownMenuContent className="bg-elevation2 bg-opacity-100">
      {config.options.map((option) => (
        <DropdownMenuItem
          key={option.id}
          onClick={() => config.onChange(option.value)}
        >
          {option.label}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);

export const DynamicToolbar: React.FC<DynamicToolbarProps> = ({
  id,
  isCollapsed = false,
  selector,
  actions = [],
  showSave = true,
  showDelete = true,
  onSave,
  onDelete,
  debug = false,
  onDebugClick,
  enableDragDrop = true,
  onDragDrop,
  className = '',
  selectorClassName = '',
  actionsClassName = ''
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Combine built-in and custom actions
  const allActions: ToolbarAction[] = [
    ...(showSave && onSave ? [{
      id: 'save',
      label: 'Save',
      icon: <Save className="h-4 w-4" />,
      onClick: onSave
    }] : []),
    ...(showDelete && onDelete ? [{
      id: 'delete',
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDelete
    }] : []),
    ...actions,
    ...(debug && onDebugClick ? [{
      id: 'debug',
      label: 'Debug',
      icon: <Bug className="h-4 w-4" />,
      onClick: onDebugClick
    }] : [])
  ];

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    if (!enableDragDrop) return;
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    if (!enableDragDrop) return;
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!enableDragDrop) return;
    e.preventDefault();
    if (!isDragging) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    if (!enableDragDrop) return;
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!enableDragDrop || !onDragDrop) return;
    e.preventDefault();
    setIsDragOver(false);

    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId !== id) {
      onDragDrop(draggedId, id);
    }
  };

  return (
    <div
      draggable={enableDragDrop}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex justify-between items-center px-2 py-1 border-b ${
        enableDragDrop ? 'cursor-move' : ''
      } transition-all ${
        isDragOver ? 'border-t-4 border-t-primary' : ''
      } ${isDragging ? 'opacity-50' : ''} ${className}`}
    >
      {selector && (
        <Selector
          config={selector}
          className={selectorClassName}
        />
      )}
      <div className={`flex gap-1 ${actionsClassName}`}>
        {allActions
          .filter(action => !isCollapsed || !action.hideInCollapsed)
          .map((action) => (
            <ActionButton
              key={action.id}
              onClick={action.onClick}
              icon={action.icon}
              label={action.label}
            />
          ))}
      </div>
    </div>
  );
};

export default DynamicToolbar;
