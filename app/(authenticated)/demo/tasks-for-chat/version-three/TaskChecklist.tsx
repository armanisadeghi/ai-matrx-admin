'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Check } from 'lucide-react';

// Types
interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  level: number;
  children: ChecklistItem[];
}

interface TaskChecklistProps {
  markdown: string;
  initialState?: Record<string, boolean>;
  onStateChange?: (state: Record<string, boolean>) => void;
}

const TaskChecklist: React.FC<TaskChecklistProps> = ({
  markdown,
  initialState = {},
  onStateChange,
}) => {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [checkState, setCheckState] = useState<Record<string, boolean>>(initialState);

  // Parse markdown into a structured format
  useEffect(() => {
    if (!markdown) return;

    const lines = markdown.split('\n').filter(line => line.trim());
    const rootItems: ChecklistItem[] = [];
    
    // First pass: create flat list of all items with their levels
    const flatItems: (ChecklistItem & { lineIndex: number })[] = [];
    let sectionTitle = '';
    
    lines.forEach((line, lineIndex) => {
      // Handle section titles
      if (line.startsWith('## ')) {
        sectionTitle = line.replace('## ', '').trim();
        return;
      }
      
      // Skip non-list items
      if (!line.trim().startsWith('-')) return;

      // Calculate indentation level
      const indentMatch = line.match(/^(\s*)-/);
      const indent = indentMatch ? indentMatch[1].length : 0;
      const level = Math.floor(indent / 4) + 1;

      // Extract checkbox state and text
      const checkboxMatch = line.match(/-\s*\[([ xX])\]\s*(.*)/);
      
      if (checkboxMatch) {
        const text = checkboxMatch[2].trim();
        const id = generateIdFromText(text);
        const checked = initialState[id] !== undefined 
          ? initialState[id] 
          : checkboxMatch[1].toLowerCase() === 'x';

        flatItems.push({
          id,
          text,
          checked,
          level,
          children: [],
          lineIndex
        });
      } else {
        // Handle regular list items (no checkbox)
        const textMatch = line.match(/-\s*(.*)/);
        if (textMatch) {
          const text = textMatch[1].trim();
          const id = generateIdFromText(text);
          
          flatItems.push({
            id,
            text,
            checked: false,
            level,
            children: [],
            lineIndex
          });
        }
      }
    });

    // Second pass: build the hierarchy
    const itemMap: Record<number, ChecklistItem> = {};
    const levelStacks: number[][] = [[]]; // Stack of item indices for each level
    
    flatItems.forEach(item => {
      const { level, lineIndex } = item;
      const { children, ...itemWithoutChildren } = item;
      
      // Ensure we have enough levels in our stack
      while (levelStacks.length <= level) {
        levelStacks.push([]);
      }
      
      // Create a new item without the lineIndex property
      const newItem: ChecklistItem = {
        ...itemWithoutChildren,
        children: []
      };
      
      // Store the item in our map
      itemMap[lineIndex] = newItem;
      
      if (level === 1) {
        // Root level item
        rootItems.push(newItem);
        levelStacks[1] = [lineIndex];
      } else {
        // Find the parent at the previous level
        const parentLevel = level - 1;
        if (levelStacks[parentLevel].length > 0) {
          const parentIndex = levelStacks[parentLevel][levelStacks[parentLevel].length - 1];
          const parent = itemMap[parentIndex];
          if (parent) {
            parent.children.push(newItem);
          }
        }
        
        // Update the stack for this level
        levelStacks[level] = [lineIndex];
        
        // Clear all deeper levels
        for (let i = level + 1; i < levelStacks.length; i++) {
          levelStacks[i] = [];
        }
      }
    });

    setItems(rootItems);
    
    // Initialize check state from parsed items
    const newCheckState: Record<string, boolean> = { ...initialState };
    const traverseItems = (items: ChecklistItem[]) => {
      items.forEach(item => {
        if (initialState[item.id] === undefined) {
          newCheckState[item.id] = item.checked;
        }
        traverseItems(item.children);
      });
    };
    
    traverseItems(rootItems);
    setCheckState(newCheckState);
  }, [markdown, initialState]);

  // Generate a consistent ID from text content
  const generateIdFromText = (text: string): string => {
    // Create a simplified version of the text for ID generation
    return text.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  };

  // Handle checkbox changes
  const handleCheckChange = useCallback((id: string, checked: boolean) => {
    setCheckState(prev => {
      const newState = { ...prev, [id]: checked };
      
      // Notify parent component of state change
      if (onStateChange) {
        onStateChange(newState);
      }
      
      return newState;
    });
  }, [onStateChange]);

  // Render a single checklist item and its children
  const renderItem = (item: ChecklistItem, index: number) => {
    const isChecked = checkState[item.id] || false;
    
    return (
      <div key={item.id} className="mb-1">
        <div className="flex items-start gap-2">
          <div className="pt-0.5">
            <button
              type="button"
              onClick={() => handleCheckChange(item.id, !isChecked)}
              className={`flex h-5 w-5 items-center justify-center rounded border ${
                isChecked 
                  ? 'bg-blue-500 border-blue-600 dark:bg-blue-600 dark:border-blue-700' 
                  : 'border-gray-300 dark:border-gray-600'
              } transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900`}
              aria-checked={isChecked}
              role="checkbox"
            >
              {isChecked && <Check className="h-3.5 w-3.5 text-white" />}
            </button>
          </div>
          <label 
            className={`text-sm cursor-pointer ${
              isChecked 
                ? 'text-gray-500 dark:text-gray-400 line-through' 
                : 'text-gray-700 dark:text-gray-200'
            }`}
            onClick={() => handleCheckChange(item.id, !isChecked)}
          >
            {item.text}
          </label>
        </div>
        
        {item.children.length > 0 && (
          <div className="ml-7 mt-1 border-l-2 border-gray-200 dark:border-gray-700 pl-3">
            {item.children.map((child, childIndex) => renderItem(child, childIndex))}
          </div>
        )}
      </div>
    );
  };

  // Extract section title from markdown
  const sectionTitle = markdown.match(/^## ([^\n]+)/m)?.[1]?.trim() || '';

  return (
    <div className="bg-textured rounded-lg shadow-sm p-6 max-w-3xl mx-auto">
      {sectionTitle && (
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">
          {sectionTitle}
        </h2>
      )}
      <div className="space-y-1">
        {items.map((item, index) => renderItem(item, index))}
      </div>
    </div>
  );
};

export default TaskChecklist;