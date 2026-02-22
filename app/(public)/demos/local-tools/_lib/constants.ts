export const MATRX_LOCAL_PORT_START = 22140;
export const MATRX_LOCAL_PORT_RANGE = 20;
export const DEFAULT_LOCAL_URL = `http://127.0.0.1:${MATRX_LOCAL_PORT_START}`;

export const ALL_TOOLS = [
    'Bash',
    'BashOutput',
    'ClipboardRead',
    'ClipboardWrite',
    'DownloadFile',
    'Edit',
    'FetchUrl',
    'FetchWithBrowser',
    'Glob',
    'Grep',
    'ListDirectory',
    'Notify',
    'OpenPath',
    'OpenUrl',
    'Read',
    'Research',
    'Scrape',
    'Screenshot',
    'Search',
    'SystemInfo',
    'TaskStop',
    'UploadFile',
    'Write',
] as const;

export type ToolName = (typeof ALL_TOOLS)[number];

export const TOOL_CATEGORIES = {
    'File Operations': ['Read', 'Write', 'Edit', 'Glob', 'Grep'],
    'Shell Execution': ['Bash', 'BashOutput', 'TaskStop'],
    System: ['SystemInfo', 'Screenshot', 'ListDirectory', 'OpenUrl', 'OpenPath'],
    Clipboard: ['ClipboardRead', 'ClipboardWrite'],
    Notifications: ['Notify'],
    'Network — Simple': ['FetchUrl', 'FetchWithBrowser'],
    'Network — Scraper': ['Scrape', 'Search', 'Research'],
    'File Transfer': ['DownloadFile', 'UploadFile'],
} as const;

export const WS_TIMEOUT_DEFAULT = 30_000;
export const WS_TIMEOUT_RESEARCH = 120_000;
export const DISCOVERY_TIMEOUT = 500;
export const STATUS_POLL_INTERVAL = 15_000;
export const HEALTH_POLL_INTERVAL = 15_000;
