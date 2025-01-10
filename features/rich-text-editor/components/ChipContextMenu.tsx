'use client';

import React, { createContext, useContext, useCallback, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuGroup,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuPortal,
} from '@/components/ui/context-menu';
import { Copy, Edit, Trash2, Palette, MoreHorizontal } from 'lucide-react';

interface ChipMenuState {
  chipId: string;
  editorId: string;
}

interface ChipMenuContextValue {
  showMenu: (editorId: string, chipId: string, x: number, y: number) => void;
  hideMenu: () => void;
  activeChip: ChipMenuState | null;
}

const ChipMenuContext = createContext<ChipMenuContextValue | null>(null);

const MenuItems = ({ onClose }: { onClose?: () => void }) => {
  const { activeChip } = useChipMenu();

  const handleAction = (action: string) => {
    console.log(`${action}:`, activeChip);
    onClose?.();
  };

  return (
    <ContextMenuGroup>
      <ContextMenuItem 
        className="gap-2 cursor-pointer" 
        onSelect={() => handleAction('copy')}
      >
        <Copy className="h-4 w-4" />
        <div className="flex flex-col flex-1">
          <span>Copy Content</span>
          <span className="text-xs text-muted-foreground">Copy chip content to clipboard</span>
        </div>
      </ContextMenuItem>
      
      <ContextMenuItem 
        className="gap-2 cursor-pointer" 
        onSelect={() => handleAction('edit')}
      >
        <Edit className="h-4 w-4" />
        <div className="flex flex-col flex-1">
          <span>Edit</span>
          <span className="text-xs text-muted-foreground">Modify chip content or properties</span>
        </div>
      </ContextMenuItem>

      <ContextMenuSub>
        <ContextMenuSubTrigger className="gap-2">
          <Palette className="h-4 w-4" />
          <div className="flex flex-col flex-1">
            <span>Change Color</span>
            <span className="text-xs text-muted-foreground">Select a new color for the chip</span>
          </div>
        </ContextMenuSubTrigger>
        <ContextMenuPortal>
          <ContextMenuSubContent className="w-48">
            <ContextMenuItem onSelect={() => handleAction('color-blue')}>
              Blue
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => handleAction('color-green')}>
              Green
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => handleAction('color-red')}>
              Red
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuPortal>
      </ContextMenuSub>

      <ContextMenuSeparator />
      
      <ContextMenuItem 
        className="gap-2 text-destructive focus:text-destructive cursor-pointer"
        onSelect={() => handleAction('delete')}
      >
        <Trash2 className="h-4 w-4" />
        <div className="flex flex-col flex-1">
          <span>Delete</span>
          <span className="text-xs text-muted-foreground">Remove this chip</span>
        </div>
      </ContextMenuItem>
    </ContextMenuGroup>
  );
};

export const ChipMenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeChip, setActiveChip] = useState<ChipMenuState | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const showMenu = useCallback((editorId: string, chipId: string, x: number, y: number) => {
    setActiveChip({ chipId, editorId });
    setShowDialog(true);
  }, []);

  const hideMenu = useCallback(() => {
    setActiveChip(null);
    setShowDialog(false);
  }, []);

  return (
    <ChipMenuContext.Provider value={{ showMenu, hideMenu, activeChip }}>
      {children}
      
      {/* Dialog for double-click */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Chip Options</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 pt-4">
            <MenuItems onClose={() => setShowDialog(false)} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Context Menu for right-click */}
      <ContextMenu>
        <ContextMenuContent className="w-64">
          <MenuItems />
        </ContextMenuContent>
      </ContextMenu>
    </ChipMenuContext.Provider>
  );
};

export const useChipMenu = () => {
  const context = useContext(ChipMenuContext);
  if (!context) {
    throw new Error('useChipMenu must be used within ChipMenuProvider');
  }
  return context;
};