import React from 'react';
import {
    AlertCircle,
    Bell,
    Calendar, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp,
    Clock,
    Code, Copy,
    Download, Eye, EyeOff, File, FileText, Filter, Folder,
    Globe, Heart, Home, Image, Info,
    Link, Lock, LogIn, LogOut,
    LucideIcon, Mail, MessageCircle, Pause,
    Pencil, Play,
    Plus, RefreshCw, Save,
    Search, Settings, Share, SkipBack, SkipForward, Star, StopCircle as Stop,
    Trash2, Unlock,
    Upload, User, Users, XCircle
} from 'lucide-react';

export const IconNames = {
    LINK: 'link',
    PENCIL: 'pencil',
    UPLOAD: 'upload',
    CALENDAR: 'calendar',
    CLOCK: 'clock',
    GLOBE: 'globe',
    CODE: 'code',
    DOWNLOAD: 'download',
    DELETE: 'delete',
    ADD: 'add',
    SEARCH: 'search',
    FILTER: 'filter',
    SETTINGS: 'settings',
    SAVE: 'save',
    SHARE: 'share',
    FILE: 'file',
    FILE_TEXT: 'fileText',
    IMAGE: 'image',
    FOLDER: 'folder',
    COPY: 'copy',
    MAIL: 'mail',
    COMMENT: 'comment',
    NOTIFICATIONS: 'notifications',
    HOME: 'home',
    CHEVRON_LEFT: 'chevronLeft',
    CHEVRON_RIGHT: 'chevronRight',
    CHEVRON_DOWN: 'chevronDown',
    CHEVRON_UP: 'chevronUp',
    USER: 'user',
    GROUPS: 'groups',
    LOGIN: 'login',
    LOGOUT: 'logout',
    INFO: 'info',
    WARNING: 'warning',
    SUCCESS: 'success',
    ERROR: 'error',
    PLAY: 'play',
    PAUSE: 'pause',
    STOP: 'stop',
    SKIP_BACK: 'skipBack',
    SKIP_FORWARD: 'skipForward',
    VIEW: 'view',
    HIDE: 'hide',
    LOCK: 'lock',
    UNLOCK: 'unlock',
    FAVORITE: 'favorite',
    LIKE: 'like',
    REFRESH: 'refresh',
} as const;



export type IconName = typeof IconNames[keyof typeof IconNames];

export const iconRegistry: Record<IconName, LucideIcon> = {
    link: Link,
    pencil: Pencil,
    upload: Upload,
    calendar: Calendar,
    clock: Clock,
    globe: Globe,
    code: Code,
    download: Download,
    delete: Trash2,
    add: Plus,
    search: Search,
    filter: Filter,
    settings: Settings,
    save: Save,
    share: Share,
    file: File,
    fileText: FileText,
    image: Image,
    folder: Folder,
    copy: Copy,
    mail: Mail,
    comment: MessageCircle,
    notifications: Bell,
    home: Home,
    chevronLeft: ChevronLeft,
    chevronRight: ChevronRight,
    chevronDown: ChevronDown,
    chevronUp: ChevronUp,
    user: User,
    groups: Users,
    login: LogIn,
    logout: LogOut,
    info: Info,
    warning: AlertCircle,
    success: CheckCircle,
    error: XCircle,
    play: Play,
    pause: Pause,
    stop: Stop,
    skipBack: SkipBack,
    skipForward: SkipForward,
    view: Eye,
    hide: EyeOff,
    lock: Lock,
    unlock: Unlock,
    favorite: Star,
    like: Heart,
    refresh: RefreshCw,
};

// components/Icon.tsx
export interface AdvancedIconProps {
    name: IconName;
    size?: number;
    className?: string;
    onClick?: (e: React.MouseEvent<SVGSVGElement>, callback?: (result: any) => void) => void;
    customData?: any;
    tooltip?: string;
    disabled?: boolean;
    onResult?: (result: any) => void;
}

export const AdvancedIcon: React.FC<AdvancedIconProps> = (
    {
        name,
        size = 24,
        className,
        onClick,
        customData,
        tooltip,
        disabled,
        onResult,
        ...restProps
    }) => {
    const IconComponent = iconRegistry[name];

    const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!disabled && onClick) {
            onClick(e, (result) => {
                if (onResult) {
                    onResult(result);
                }
            });
        }
    };

    return (
        <div title={tooltip}>
            <IconComponent
                size={size}
                className={`${className} ${disabled ? 'disabled' : ''}`}
                onClick={handleClick}
                data-custom={typeof customData === 'string' ? customData : JSON.stringify(customData)}
                {...restProps}
            />
        </div>
    );
};

export interface IconProps {
    name: IconName;
    size?: number;
    className?: string;
}


export const Icon: React.FC<IconProps> = (
    {
        name,
        size = 24,
        className,
        ...restProps
    }) => {
    const IconComponent = iconRegistry[name];

    return (
        <IconComponent
            size={size}
            className={className}
            {...restProps}
        />
    );
};


export interface SimpleIconProps {
    name: IconName;
    size?: number;
    className?: string;
    onClick: (e: React.MouseEvent<SVGSVGElement>) => void;
    disabled?: boolean;
}


export const SimpleIcon: React.FC<SimpleIconProps> = (
    {
        name,
        size = 24,
        className,
        onClick,
        disabled,
        ...restProps
    }) => {
    const IconComponent = iconRegistry[name];

    const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!disabled && onClick) {
            onClick(e);
        }
    };

    return (
        <IconComponent
            size={size}
            className={`${className} ${disabled ? 'disabled' : ''}`}
            onClick={handleClick}
            {...restProps}
        />
    );
};


const AdvancedIconExample = () => {
    return (
        <AdvancedIcon
            name="pencil"
            customData={{id: "123", value: 42}}
            tooltip="Click me!"
            disabled={false}
            onClick={(e, callback) => {
                const element = e.currentTarget;
                const customData = JSON.parse(element.dataset.custom || '{}');
                console.log(customData.id, customData.value);
                setTimeout(() => {
                    callback?.({success: true, message: "Operation completed!"});
                }, 1000);
            }}
            onResult={(result) => {
                console.log("Received result:", result);
            }}
        />
    );
}


export type IconVariant = {
    ICON: typeof Icon;
    SIMPLE: typeof SimpleIcon;
    ADVANCED: typeof AdvancedIcon;
    default: typeof AdvancedIcon;
};
export const ICON_OPTIONS_BASE = {
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

const createIconVariant = (): IconVariant => ({
    ICON: Icon,
    SIMPLE: SimpleIcon,
    ADVANCED: AdvancedIcon,
    default: AdvancedIcon
});

export const ICON_OPTIONS_VARIANT = {
    LINK: createIconVariant(),
    CODE: createIconVariant(),
    LIST_CHECK: createIconVariant(),
    // ... add other icons
} as const;



// separate concept:
type RuntimeValue<T> = {
    type: 'static' | 'dynamic';
    value: T | string; // string represents path to dynamic value
};

interface IconDefinition {
    type: 'ICON' | 'SIMPLE' | 'ADVANCED';
    props: {
        [key: string]: RuntimeValue<any>;
    };
}

// icon-system.ts
export const createIconDefinition = (
    type: IconDefinition['type'] = 'ADVANCED',
    props: Partial<Record<keyof AdvancedIconProps, RuntimeValue<any>>> = {}
): IconDefinition => ({
    type,
    props
});

export const ICON_OPTIONS_DEFINITION = {
    LINK: {
        ICON: createIconDefinition('ICON'),
        SIMPLE: createIconDefinition('SIMPLE'),
        ADVANCED: createIconDefinition('ADVANCED'),
        default: createIconDefinition('ADVANCED')
    },
    // ... other icons
} as const;

interface RuntimeContext {
    [key: string]: any;
}

const resolveRuntimeValue = (
    definition: RuntimeValue<any>,
    context: RuntimeContext
): any => {
    if (definition.type === 'static') {
        return definition.value;
    }

    // Handle nested paths like 'context.user.name'
    return definition.value.split('.').reduce(
        (obj, key) => obj?.[key],
        context
    );
};

const createIconComponent = (
    iconDef: IconDefinition,
    runtimeContext: RuntimeContext
) => {
    const resolvedProps = Object.entries(iconDef.props).reduce(
        (acc, [key, definition]) => ({
            ...acc,
            [key]: resolveRuntimeValue(definition, runtimeContext)
        }),
        {}
    );

    switch (iconDef.type) {
        case 'ICON':
            // @ts-ignore - COMPLEX: Missing required 'name' prop in IconProps - needs manual prop addition
            return <Icon {...resolvedProps} name={iconDef.props?.name || ''} />;
        case 'SIMPLE':
            // @ts-ignore - COMPLEX: Missing required props 'name' and 'onClick' in SimpleIconProps - needs manual prop addition
            return <SimpleIcon {...resolvedProps} name={iconDef.props?.name || ''} onClick={() => {}} />;
        case 'ADVANCED':
            // @ts-ignore - COMPLEX: Missing required 'name' prop in AdvancedIconProps - needs manual prop addition
            return <AdvancedIcon {...resolvedProps} name={iconDef.props?.name || ''} />;
    }
};

// Usage at runtime
import {ACTION_REGISTRY} from './action-registry';
interface ActionExecutionContext {
    action: typeof ACTION_REGISTRY[keyof typeof ACTION_REGISTRY];
    runtimeContext: RuntimeContext;
}

const executeAction = ({ action, runtimeContext }: ActionExecutionContext) => {
    // Create the icon component with resolved runtime values
    const iconComponent = createIconComponent(
        action.icon,
        {
            context: {
                isDisabled: false, // Your runtime value
                recordData: { id: '123' }, // Your runtime value
            },
            handlers: {
                onClick: (e: React.MouseEvent<SVGSVGElement>, callback?: (result: any) => void) => {
                    // Your runtime handler
                    console.log('Clicked with data:', e.currentTarget.dataset.custom);
                    callback?.({ success: true });
                },
                onResult: (result: any) => {
                    console.log('Result received:', result);
                }
            },
            // ... other runtime context
        }
    );

    return iconComponent;
};

// Example of using the system
const MyComponent: React.FC = () => {
    const runtimeContext = {
        context: {
            isDisabled: false,
            recordData: { id: '123' }
        },
        handlers: {
            onClick: (e: React.MouseEvent<SVGSVGElement>, callback?: (result: any) => void) => {
                console.log('Clicked!');
                callback?.({ success: true });
            },
            onResult: (result: any) => {
                console.log('Result:', result);
            }
        }
    };

    return (
        <div>
            {executeAction({
                action: ACTION_REGISTRY.entityList,
                runtimeContext
            })}
        </div>
    );
};
