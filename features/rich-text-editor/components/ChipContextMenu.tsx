'use client';

import React, { createContext, useContext, useCallback, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Copy, Edit, Trash2, Palette } from 'lucide-react';

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

    // Menu items rendered in both dialog and context menu
    const MenuItems = () => (
        <>
            <ContextMenu>
                <ContextMenuItem
                    className='gap-2'
                    onSelect={() => console.log('Copy', activeChip)}
                >
                    <Copy className='h-4 w-4' />
                    Copy
                </ContextMenuItem>
                <ContextMenuItem
                    className='gap-2'
                    onSelect={() => console.log('Edit', activeChip)}
                >
                    <Edit className='h-4 w-4' />
                    Edit
                </ContextMenuItem>
                <ContextMenuItem
                    className='gap-2'
                    onSelect={() => console.log('Change Color', activeChip)}
                >
                    <Palette className='h-4 w-4' />
                    Change Color
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                    className='gap-2 text-destructive focus:text-destructive'
                    onSelect={() => console.log('Delete', activeChip)}
                >
                    <Trash2 className='h-4 w-4' />
                    Delete
                </ContextMenuItem>
            </ContextMenu>
        </>
    );

    return (
        <ChipMenuContext.Provider value={{ showMenu, hideMenu, activeChip }}>
            {children}

            {/* Dialog for double-click */}
            <Dialog
                open={showDialog}
                onOpenChange={setShowDialog}
            >
                <DialogContent className='sm:max-w-[425px]'>
                    <DialogHeader>
                        <DialogTitle>Chip Actions</DialogTitle>
                    </DialogHeader>
                    <div className='grid gap-2'>
                        <MenuItems />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Context Menu for right-click */}
            <ContextMenu>
                <ContextMenuContent>
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
