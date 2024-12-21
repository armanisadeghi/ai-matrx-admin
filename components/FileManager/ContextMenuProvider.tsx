// components/FileManager/ContextMenuProvider.tsx
import React, { createContext, useContext, useState } from 'react';

interface ContextMenuState {
    x: number;
    y: number;
    isOpen: boolean;
    type: 'file' | 'folder' | null;
    data: any;
}

interface ContextMenuContextType {
    menuState: ContextMenuState;
    openMenu: (event: React.MouseEvent, type: 'file' | 'folder', data: any) => void;
    closeMenu: () => void;
}

const ContextMenuContext = createContext<ContextMenuContextType>({
    menuState: { x: 0, y: 0, isOpen: false, type: null, data: null },
    openMenu: () => {},
    closeMenu: () => {},
});

export const ContextMenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [menuState, setMenuState] = useState<ContextMenuState>({
        x: 0,
        y: 0,
        isOpen: false,
        type: null,
        data: null,
    });

    const openMenu = (event: React.MouseEvent, type: 'file' | 'folder', data: any) => {
        event.preventDefault();
        setMenuState({
            x: event.clientX,
            y: event.clientY,
            isOpen: true,
            type,
            data,
        });
    };

    const closeMenu = () => {
        setMenuState(prev => ({ ...prev, isOpen: false }));
    };

    // Close menu when clicking outside
    React.useEffect(() => {
        const handleClick = () => closeMenu();
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    return (
        <ContextMenuContext.Provider value={{ menuState, openMenu, closeMenu }}>
            {children}
        </ContextMenuContext.Provider>
    );
};

export const useContextMenu = () => useContext(ContextMenuContext);