

export const PRESENTATION_WRAPPERS = {
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

export const PRESENTATION_COMPONENT_TYPES = {
    QUICK_LIST: 'QuickReferenceList',
    SIMPLE_TABLE: 'SimpleTable',
    DATA_TABLE: 'DataTable',
    CUSTOM: 'custom'
} as const;


export const COMMAND_CATEGORIES = {
    REDUX: 'redux',
    HOOK: 'hook',
    API: 'api',
    SOCKET: 'socket',
    FUNCTION: 'function',
    DIRECT: 'direct',
    COMPONENT: 'component'
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



export const ICON_OPTIONS = {
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
