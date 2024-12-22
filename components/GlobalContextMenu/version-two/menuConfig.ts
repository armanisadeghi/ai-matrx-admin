// menuConfig.ts
import {
    Settings, Download, Upload, Copy, Move,
    Trash, User, LogOut, Moon, Sun,
    ChevronLeft, Languages
} from 'lucide-react';
import { MenuItemConfig } from './types';

export const menuItems: Record<string, MenuItemConfig> = {
    settings: {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        defaultVisible: true,
        subItems: ['theme', 'language'],
        handler: (module, data) => {
            switch(module) {
                case 'fileManager':
                    // Open file manager settings
                    break;
                case 'userProfile':
                    // Open user settings
                    break;
                // ... other module handlers
            }
        }
    },
    theme: {
        id: 'theme',
        label: 'Theme',
        icon: Moon,
        defaultVisible: true,
        subItems: ['lightTheme', 'darkTheme']
    },
    lightTheme: {
        id: 'lightTheme',
        label: 'Light',
        icon: Sun,
        defaultVisible: true,
        handler: () => {/* handle theme change */}
    },
    darkTheme: {
        id: 'darkTheme',
        label: 'Dark',
        icon: Moon,
        defaultVisible: true,
        handler: () => {/* handle theme change */}
    },
    language: {
        id: 'language',
        label: 'Language',
        icon: Languages,
        defaultVisible: false,
    },
    download: {
        id: 'download',
        label: 'Download',
        icon: Download,
        defaultVisible: false,
        modules: ['fileManager'],
        handler: (module, data) => {
            if (module === 'fileManager') {
                // Handle file download
            }
        }
    },
    delete: {
        id: 'delete',
        label: 'Delete',
        icon: Trash,
        danger: true,
        defaultVisible: false,
        handler: (module, data) => {
            switch(module) {
                case 'fileManager':
                    // Handle file deletion
                    break;
                // ... other delete handlers
            }
        }
    },
    // ... more predefined items
};
