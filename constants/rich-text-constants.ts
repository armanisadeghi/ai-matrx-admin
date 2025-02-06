import { ContentMode } from '../types/editor.types';

export const CHIP_BASE_CLASS = 'inline-flex items-center align-middle px-1 py-0 mx-1 rounded-md cursor-move min-h-[12px] min-w-[96px]';

export const TAILWIND_COLORS = [
    'red',
    'orange',
    'amber',
    'yellow',
    'lime',
    'green',
    'emerald',
    'teal',
    'cyan',
    'sky',
    'blue',
    'indigo',
    'violet',
    'purple',
    'fuchsia',
    'pink',
    'rose',
] as const;

export type TailwindColor = (typeof TAILWIND_COLORS)[number];

export function generateColorStyle(color: TailwindColor): string {
    return `bg-${color}-300 dark:bg-${color}-800 text-${color}-900 dark:text-${color}-100 hover:bg-${color}-400 dark:hover:bg-${color}-700 transition-colors duration-200`;
}

export const COLOR_STYLES: Record<TailwindColor, string> = Object.fromEntries(TAILWIND_COLORS.map((color) => [color, generateColorStyle(color)])) as Record<
    TailwindColor,
    string
>;

export const MODE_CLASSES: Record<ContentMode, string> = {
    encodeChips: 'inline-flex items-center align-middle px-2 py-0 mx-1 rounded-md cursor-move min-h-[12px] min-w-[96px]',
    name: 'inline-flex items-center align-middle px-1 py-0.5 mx-0.5 font-inherit text-inherit bg-inherit cursor-text border-l-4 border-r-4',
    defaultValue:
        'inline-flex items-center align-middle px-1 py-0.5 whitespace-pre-wrap font-inherit text-inherit bg-inherit cursor-text border-l-2 border-r-2',
    recordKey: 'inline-flex items-center align-middle px-1 font-mono text-gray-600 font-inherit text-inherit bg-inherit cursor-pointer',
    encodeVisible: 'inline-flex items-center align-middle px-1 font-inherit text-inherit bg-inherit cursor-pointer',
    status: 'inline-flex items-center align-middle px-2 py-0 mx-1 rounded-md cursor-move min-h-[12px] min-w-[96px]',
};

export function getStyle(color: TailwindColor, mode: ContentMode): string {
    return `${MODE_CLASSES[mode]} ${generateColorStyle(color)}`;
}
