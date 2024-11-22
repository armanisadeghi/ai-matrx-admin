import {
    Link,
    Pencil,
    Upload,
    Calendar,
    Clock,
    Globe,
    Code,
    // Common actions
    Download,
    Trash2,         // Delete
    Plus,           // Add
    Search,         // Search
    Filter,         // Filter
    Settings,       // Settings
    Save,           // Save
    Share,          // Share

    // Content/Document related
    File,
    FileText,
    Image,
    Folder,
    Copy,

    // Communication
    Mail,
    MessageCircle,  // Comment
    Bell,           // Notifications

    // Navigation
    Home,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,

    // User related
    User,
    Users,          // Groups
    LogIn,
    LogOut,

    // Status/Info
    Info,
    AlertCircle,    // Warning
    CheckCircle,    // Success
    XCircle,        // Error

    // Media controls
    Play,
    Pause,
    StopCircle as Stop,
    SkipBack,
    SkipForward,

    // Misc
    Eye,            // View
    EyeOff,         // Hide
    Lock,
    Unlock,
    Star,          // Favorite
    Heart,         // Like
    RefreshCw,     // Refresh
} from 'lucide-react';



const iconRegistry = {
    Link,
    Pencil,
    Upload,
    Calendar,
    Clock,
    Globe,
    Code,
    Download,
    Trash2,
    Plus,
    Search,
    Filter,
    Settings,
    Save,
    Share,
    File,
    FileText,
    Image,
    Folder,
    Copy,
    Mail,
    MessageCircle,
    Bell,
    Home,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    User,
    Users,
    LogIn,
    LogOut,
    Info,
    AlertCircle,
    CheckCircle,
    XCircle,
    Play,
    Pause,
    Stop,
    SkipBack,
    SkipForward,
    Eye,
    EyeOff,
    Lock,
    Unlock,
    Star,
    Heart,
    RefreshCw,
};


export const PRESENTATION_TYPES = {
    MODAL: 'modal',
    SHEET: 'sheet',
    POPOVER: 'popover',
    INLINE: 'inline',
    CUSTOM: 'custom',
    DROPDOWN: 'dropdown',
    TOOLTIP: 'tooltip',
    DRAWER: 'drawer',
    COLLAPSE: 'collapse',
    HOVER_CARD: 'hoverCard',
    CONTEXT_MENU: 'contextMenu',
    DRAWER_BOTTOM: 'drawerBottom',
    DRAWER_SIDE: 'drawerSide',
    DRAWER_CENTER: 'drawerCenter',
} as const;


export const TRIGGER_TYPES = {
    BUTTON: 'button',
    ICON: 'icon',
    LINK: 'link',
    TEXT: 'text',
    CHIP: 'chip',
    BADGE: 'badge',
    CARD: 'card',
    CUSTOM: 'custom',
    FLOATING_BUTTON: 'floatingButton',
    TOGGLE: 'toggle',
    DROPDOWN: 'dropdown',
    DROPDOWN_BASIC: 'dropdownBasic',
    DROPDOWN_CHECKBOX: 'dropdownCheckbox',
    DROPDOWN_RADIO: 'dropdownRadio',
    IMAGE: 'image',
    TOOLTIP: 'tooltip',
    TAB: 'tab'
} as const;


export const PRESENTATION_COMPONENTS = {
    QUICK_LIST: 'QuickReferenceList',
    SIMPLE_TABLE: 'SimpleTable',
    DATA_TABLE: 'DataTable',
    CUSTOM: 'custom'
} as const;


export const ACTION_TYPES = {
    REDUX: 'redux',
    HOOK: 'hook',
    COMMAND: 'command',
    DIRECT: 'direct',
    COMPONENT: 'component'
} as const;

