'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import IconButton from '@/components/official/IconButton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { 
  Search, 
  X, 
  ChevronDown, 
  ChevronRight,
  ArrowDown,
  ArrowUp,
  CaseSensitive,
  Regex,
  WholeWord,
  Replace,
  ReplaceAll,
} from 'lucide-react';

interface FindReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetElement?: HTMLTextAreaElement | HTMLInputElement | null;
  onReplace?: (newText: string) => void;
}

export function FindReplaceModal({ isOpen, onClose, targetElement, onReplace }: FindReplaceModalProps) {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [matches, setMatches] = useState<number[]>([]);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  
  const findInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Focus find input when opened
  useEffect(() => {
    if (isOpen && findInputRef.current) {
      // Double RAF for maximum reliability - ensures DOM is fully rendered
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (findInputRef.current) {
            findInputRef.current.focus();
            findInputRef.current.select();
          }
        });
      });
    }
  }, [isOpen]);

  // Find all matches when search text changes
  useEffect(() => {
    if (!targetElement || !findText) {
      setMatches([]);
      setCurrentIndex(-1);
      return;
    }

    const content = targetElement.value;
    let foundMatches: number[] = [];

    try {
      if (useRegex) {
        const flags = caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(findText, flags);
        let match;
        while ((match = regex.exec(content)) !== null) {
          foundMatches.push(match.index);
        }
      } else {
        const searchText = caseSensitive ? findText : findText.toLowerCase();
        const searchContent = caseSensitive ? content : content.toLowerCase();
        
        let index = 0;
        const searchTerm = wholeWord 
          ? new RegExp(`\\b${findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, caseSensitive ? 'g' : 'gi')
          : null;

        if (wholeWord && searchTerm) {
          let match;
          while ((match = searchTerm.exec(searchContent)) !== null) {
            foundMatches.push(match.index);
          }
        } else {
          while ((index = searchContent.indexOf(searchText, index)) !== -1) {
            foundMatches.push(index);
            index += searchText.length;
          }
        }
      }
    } catch (e) {
      // Invalid regex, ignore
    }

    setMatches(foundMatches);
    setCurrentIndex(foundMatches.length > 0 ? 0 : -1);

    // Highlight first match
    if (foundMatches.length > 0 && targetElement) {
      targetElement.setSelectionRange(foundMatches[0], foundMatches[0] + findText.length);
    }
  }, [findText, targetElement, caseSensitive, useRegex, wholeWord]);

  const handleNext = () => {
    if (matches.length === 0 || !targetElement) return;
    
    const nextIndex = (currentIndex + 1) % matches.length;
    setCurrentIndex(nextIndex);
    
    const start = matches[nextIndex];
    targetElement.focus();
    targetElement.setSelectionRange(start, start + findText.length);
  };

  const handlePrevious = () => {
    if (matches.length === 0 || !targetElement) return;
    
    const prevIndex = currentIndex === 0 ? matches.length - 1 : currentIndex - 1;
    setCurrentIndex(prevIndex);
    
    const start = matches[prevIndex];
    targetElement.focus();
    targetElement.setSelectionRange(start, start + findText.length);
  };

  const handleReplaceOne = () => {
    if (!targetElement || currentIndex === -1 || !findText || matches.length === 0) return;

    const content = targetElement.value;
    const matchStart = matches[currentIndex];
    
    // Get the actual text to replace (handle regex matches)
    let matchLength = findText.length;
    if (useRegex) {
      try {
        const flags = caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(findText, flags);
        const match = regex.exec(content.substring(matchStart));
        if (match) {
          matchLength = match[0].length;
        }
      } catch (e) {
        // Invalid regex
        return;
      }
    }
    
    const matchEnd = matchStart + matchLength;
    const newContent = content.substring(0, matchStart) + replaceText + content.substring(matchEnd);
    
    if (onReplace) {
      onReplace(newContent);
    } else {
      targetElement.value = newContent;
    }

    // Trigger re-search after a short delay to update matches
    setTimeout(() => {
      const lengthDiff = replaceText.length - matchLength;
      
      // Update remaining match positions
      const updatedMatches = matches
        .filter((_, idx) => idx !== currentIndex)
        .map(pos => pos > matchStart ? pos + lengthDiff : pos);
      
      setMatches(updatedMatches);
      
      // Move to next match or adjust current index
      if (updatedMatches.length > 0) {
        const nextIdx = Math.min(currentIndex, updatedMatches.length - 1);
        setCurrentIndex(nextIdx);
        targetElement.setSelectionRange(updatedMatches[nextIdx], updatedMatches[nextIdx] + findText.length);
      } else {
        setCurrentIndex(-1);
      }
    }, 10);
  };

  const handleReplaceAll = () => {
    if (!targetElement || matches.length === 0 || !findText) return;

    let content = targetElement.value;
    let newContent: string;

    try {
      if (useRegex) {
        const flags = caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(findText, flags);
        newContent = content.replace(regex, replaceText);
      } else if (wholeWord) {
        const regex = new RegExp(`\\b${findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, caseSensitive ? 'g' : 'gi');
        newContent = content.replace(regex, replaceText);
      } else {
        // Simple string replacement
        if (caseSensitive) {
          newContent = content.split(findText).join(replaceText);
        } else {
          const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
          newContent = content.replace(regex, replaceText);
        }
      }
    } catch (e) {
      // Invalid regex
      return;
    }

    if (onReplace) {
      onReplace(newContent);
    } else {
      targetElement.value = newContent;
    }

    // Clear matches after replace all
    setMatches([]);
    setCurrentIndex(-1);
  };

  const handleClose = () => {
    setFindText('');
    setReplaceText('');
    setMatches([]);
    setCurrentIndex(-1);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <TooltipProvider>
      <div className="fixed top-16 right-4 z-[100] bg-card border border-border rounded-lg shadow-lg w-[420px]">
        {/* Find Row */}
        <div className="flex items-center gap-1 p-2 border-b border-border">
          <IconButton
            icon={showReplace ? ChevronDown : ChevronRight}
            tooltip={showReplace ? "Hide Replace" : "Show Replace"}
            size="sm"
            onClick={() => setShowReplace(!showReplace)}
          />
          
          <div className="flex-1 relative">
            <Input
              ref={findInputRef}
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              placeholder="Find"
              className="h-7 text-sm pr-16"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.shiftKey ? handlePrevious() : handleNext();
                } else if (e.key === 'Escape') {
                  handleClose();
                }
              }}
            />
            {findText && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {matches.length > 0 ? `${currentIndex + 1}/${matches.length}` : 'No results'}
              </div>
            )}
          </div>

          <IconButton
            icon={ArrowUp}
            tooltip="Previous Match (Shift+Enter)"
            size="sm"
            onClick={handlePrevious}
            disabled={matches.length === 0}
          />
          
          <IconButton
            icon={ArrowDown}
            tooltip="Next Match (Enter)"
            size="sm"
            onClick={handleNext}
            disabled={matches.length === 0}
          />

          <div className="w-px h-5 bg-border" />

          <IconButton
            icon={CaseSensitive}
            tooltip="Match Case"
            size="sm"
            variant={caseSensitive ? "default" : "ghost"}
            onClick={() => setCaseSensitive(!caseSensitive)}
          />

          <IconButton
            icon={WholeWord}
            tooltip="Match Whole Word"
            size="sm"
            variant={wholeWord ? "default" : "ghost"}
            onClick={() => setWholeWord(!wholeWord)}
          />

          <IconButton
            icon={Regex}
            tooltip="Use Regular Expression"
            size="sm"
            variant={useRegex ? "default" : "ghost"}
            onClick={() => setUseRegex(!useRegex)}
          />

          <div className="w-px h-5 bg-border" />

          <IconButton
            icon={X}
            tooltip="Close (Esc)"
            size="sm"
            onClick={handleClose}
          />
        </div>

        {/* Replace Row */}
        {showReplace && (
          <div className="flex items-center gap-1 p-2">
            <div className="w-6" /> {/* Spacer for alignment */}
            
            <div className="flex-1">
              <Input
                ref={replaceInputRef}
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="Replace"
                className="h-7 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.shiftKey ? handleReplaceAll() : handleReplaceOne();
                  } else if (e.key === 'Escape') {
                    handleClose();
                  }
                }}
              />
            </div>

            <IconButton
              icon={Replace}
              tooltip="Replace (Enter)"
              size="sm"
              onClick={handleReplaceOne}
              disabled={currentIndex === -1}
            />

            <IconButton
              icon={ReplaceAll}
              tooltip="Replace All (Shift+Enter)"
              size="sm"
              onClick={handleReplaceAll}
              disabled={matches.length === 0}
            />

            {/* Empty space to align with find row */}
            <div className="w-[108px]" />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

