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
    RefreshCw, LucideIcon,     // Refresh
} from 'lucide-react';
import {AdvancedIcon, Icon, SimpleIcon} from "./IconRegistry";
import { IconNames } from './IconRegistry';

export type IconVariant = {
    ICON: typeof Icon;
    SIMPLE: typeof SimpleIcon;
    ADVANCED: typeof AdvancedIcon;
    default: typeof AdvancedIcon;
};
export const ICON_OPTIONS = {
    LINK: {
        ICON: Link,
        SIMPLE: Link,
        ADVANCED: Link,
        default: Link,
    } as IconVariant,
    PENCIL: {
        ICON: Pencil,
        SIMPLE: Pencil,
        ADVANCED: Pencil,
        default: Pencil
    } as IconVariant,
    UPLOAD: {
        ICON: Upload,
        SIMPLE: Upload,
        ADVANCED: Upload,
        default: Upload
    } as IconVariant,
    CALENDAR: {
        ICON: Calendar,
        SIMPLE: Calendar,
        ADVANCED: Calendar,
        default: Calendar
    } as IconVariant,
    CLOCK: {
        ICON: Clock,
        SIMPLE: Clock,
        ADVANCED: Clock,
        default: Clock
    } as IconVariant,
    GLOBE: {
        ICON: Globe,
        SIMPLE: Globe,
        ADVANCED: Globe,
        default: Globe
    } as IconVariant,
    CODE: {
        ICON: Code,
        SIMPLE: Code,
        ADVANCED: Code,
        default: Code
    } as IconVariant,
    DOWNLOAD: {
        ICON: Download,
        SIMPLE: Download,
        ADVANCED: Download,
        default: Download
    } as IconVariant,
    DELETE: {
        ICON: Trash2,
        SIMPLE: Trash2,
        ADVANCED: Trash2,
        default: Trash2
    } as IconVariant,
    ADD: {
        ICON: Plus,
        SIMPLE: Plus,
        ADVANCED: Plus,
        default: Plus
    } as IconVariant,
    SEARCH: {
        ICON: Search,
        SIMPLE: Search,
        ADVANCED: Search,
        default: Search
    } as IconVariant,
    FILTER: {
        ICON: Filter,
        SIMPLE: Filter,
        ADVANCED: Filter,
        default: Filter
    } as IconVariant,
    SETTINGS: {
        ICON: Settings,
        SIMPLE: Settings,
        ADVANCED: Settings,
        default: Settings
    } as IconVariant,
    SAVE: {
        ICON: Save,
        SIMPLE: Save,
        ADVANCED: Save,
        default: Save
    } as IconVariant,
    SHARE: {
        ICON: Share,
        SIMPLE: Share,
        ADVANCED: Share,
        default: Share
    } as IconVariant,
    FILE: {
        ICON: File,
        SIMPLE: File,
        ADVANCED: File,
        default: File
    } as IconVariant,
    FILETEXT: {
        ICON: FileText,
        SIMPLE: FileText,
        ADVANCED: FileText,
        default: FileText
    } as IconVariant,
    IMAGE: {
        ICON: Image,
        SIMPLE: Image,
        ADVANCED: Image,
        default: Image
    } as IconVariant,
    FOLDER: {
        ICON: Folder,
        SIMPLE: Folder,
        ADVANCED: Folder,
        default: Folder
    } as IconVariant,
    COPY: {
        ICON: Copy,
        SIMPLE: Copy,
        ADVANCED: Copy,
        default: Copy
    } as IconVariant,
    MAIL: {
        ICON: Mail,
        SIMPLE: Mail,
        ADVANCED: Mail,
        default: Mail
    } as IconVariant,
    COMMENT: {
        ICON: MessageCircle,
        SIMPLE: MessageCircle,
        ADVANCED: MessageCircle,
        default: MessageCircle
    } as IconVariant,
    NOTIFICATIONS: {
        ICON: Bell,
        SIMPLE: Bell,
        ADVANCED: Bell,
        default: Bell
    } as IconVariant,
    HOME: {
        ICON: Home,
        SIMPLE: Home,
        ADVANCED: Home,
        default: Home
    } as IconVariant,
    CHEVRONLEFT: {
        ICON: ChevronLeft,
        SIMPLE: ChevronLeft,
        ADVANCED: ChevronLeft,
        default: ChevronLeft
    } as IconVariant,
    CHEVRONRIGHT: {
        ICON: ChevronRight,
        SIMPLE: ChevronRight,
        ADVANCED: ChevronRight,
        default: ChevronRight
    } as IconVariant,
    CHEVRONDOWN: {
        ICON: ChevronDown,
        SIMPLE: ChevronDown,
        ADVANCED: ChevronDown,
        default: ChevronDown
    } as IconVariant,
    CHEVRONUP: {
        ICON: ChevronUp,
        SIMPLE: ChevronUp,
        ADVANCED: ChevronUp,
        default: ChevronUp
    } as IconVariant,
    USER: {
        ICON: User,
        SIMPLE: User,
        ADVANCED: User,
        default: User
    } as IconVariant,
    GROUPS: {
        ICON: Users,
        SIMPLE: Users,
        ADVANCED: Users,
        default: Users
    } as IconVariant,
    LOGIN: {
        ICON: LogIn,
        SIMPLE: LogIn,
        ADVANCED: LogIn,
        default: LogIn
    } as IconVariant,
    LOGOUT: {
        ICON: LogOut,
        SIMPLE: LogOut,
        ADVANCED: LogOut,
        default: LogOut
    } as IconVariant,
    INFO: {
        ICON: Info,
        SIMPLE: Info,
        ADVANCED: Info,
        default: Info
    } as IconVariant,
    WARNING: {
        ICON: AlertCircle,
        SIMPLE: AlertCircle,
        ADVANCED: AlertCircle,
        default: AlertCircle
    } as IconVariant,
    SUCCESS: {
        ICON: CheckCircle,
        SIMPLE: CheckCircle,
        ADVANCED: CheckCircle,
        default: CheckCircle
    } as IconVariant,
    ERROR: {
        ICON: XCircle,
        SIMPLE: XCircle,
        ADVANCED: XCircle,
        default: XCircle
    } as IconVariant,
    PLAY: {
        ICON: Play,
        SIMPLE: Play,
        ADVANCED: Play,
        default: Play
    } as IconVariant,
    PAUSE: {
        ICON: Pause,
        SIMPLE: Pause,
        ADVANCED: Pause,
        default: Pause
    } as IconVariant,
    STOP: {
        ICON: Stop,
        SIMPLE: Stop,
        ADVANCED: Stop,
        default: Stop
    } as IconVariant,
    SKIPBACK: {
        ICON: SkipBack,
        SIMPLE: SkipBack,
        ADVANCED: SkipBack,
        default: SkipBack
    } as IconVariant,
    SKIPFORWARD: {
        ICON: SkipForward,
        SIMPLE: SkipForward,
        ADVANCED: SkipForward,
        default: SkipForward
    } as IconVariant,
    VIEW: {
        ICON: Eye,
        SIMPLE: Eye,
        ADVANCED: Eye,
        default: Eye
    } as IconVariant,
    HIDE: {
        ICON: EyeOff,
        SIMPLE: EyeOff,
        ADVANCED: EyeOff,
        default: EyeOff
    } as IconVariant,
    LOCK: {
        ICON: Lock,
        SIMPLE: Lock,
        ADVANCED: Lock,
        default: Lock
    } as IconVariant,
    UNLOCK: {
        ICON: Unlock,
        SIMPLE: Unlock,
        ADVANCED: Unlock,
        default: Unlock
    } as IconVariant,
    FAVORITE: {
        ICON: Star,
        SIMPLE: Star,
        ADVANCED: Star,
        default: Star
    } as IconVariant,
    LIKE: {
        ICON: Heart,
        SIMPLE: Heart,
        ADVANCED: Heart,
        default: Heart
    } as IconVariant,
    REFRESH: {
        ICON: RefreshCw,
        SIMPLE: RefreshCw,
        ADVANCED: RefreshCw,
        default: RefreshCw
    } as IconVariant,
} as const;
