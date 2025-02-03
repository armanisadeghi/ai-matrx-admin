import { cn } from '@/utils';
import { ContentMode } from '../types/editor.types';



export const CHIP_BASE_CLASS = 'inline-flex items-center align-middle px-2 py-1 mx-1 rounded-md cursor-move min-h-[24px] min-w-[128px]';

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

export const COLOR_STYLES: Record<TailwindColor, string> = {
    red: 'bg-red-300 dark:bg-red-800 text-red-900 dark:text-red-100 hover:bg-red-400 dark:hover:bg-red-700 transition-colors duration-200',
    orange: 'bg-orange-300 dark:bg-orange-800 text-orange-900 dark:text-orange-100 hover:bg-orange-400 dark:hover:bg-orange-700 transition-colors duration-200',
    amber: 'bg-amber-300 dark:bg-amber-800 text-amber-900 dark:text-amber-100 hover:bg-amber-400 dark:hover:bg-amber-700 transition-colors duration-200',
    yellow: 'bg-yellow-300 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 hover:bg-yellow-400 dark:hover:bg-yellow-700 transition-colors duration-200',
    lime: 'bg-lime-300 dark:bg-lime-800 text-lime-900 dark:text-lime-100 hover:bg-lime-400 dark:hover:bg-lime-700 transition-colors duration-200',
    green: 'bg-green-300 dark:bg-green-800 text-green-900 dark:text-green-100 hover:bg-green-400 dark:hover:bg-green-700 transition-colors duration-200',
    emerald:
        'bg-emerald-300 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-400 dark:hover:bg-emerald-700 transition-colors duration-200',
    teal: 'bg-teal-300 dark:bg-teal-800 text-teal-900 dark:text-teal-100 hover:bg-teal-400 dark:hover:bg-teal-700 transition-colors duration-200',
    cyan: 'bg-cyan-300 dark:bg-cyan-800 text-cyan-900 dark:text-cyan-100 hover:bg-cyan-400 dark:hover:bg-cyan-700 transition-colors duration-200',
    sky: 'bg-sky-300 dark:bg-sky-800 text-sky-900 dark:text-sky-100 hover:bg-sky-400 dark:hover:bg-sky-700 transition-colors duration-200',
    blue: 'bg-blue-300 dark:bg-blue-800 text-blue-900 dark:text-blue-100 hover:bg-blue-400 dark:hover:bg-blue-700 transition-colors duration-200',
    indigo: 'bg-indigo-300 dark:bg-indigo-800 text-indigo-900 dark:text-indigo-100 hover:bg-indigo-400 dark:hover:bg-indigo-700 transition-colors duration-200',
    violet: 'bg-violet-300 dark:bg-violet-800 text-violet-900 dark:text-violet-100 hover:bg-violet-400 dark:hover:bg-violet-700 transition-colors duration-200',
    purple: 'bg-purple-300 dark:bg-purple-800 text-purple-900 dark:text-purple-100 hover:bg-purple-400 dark:hover:bg-purple-700 transition-colors duration-200',
    fuchsia:
        'bg-fuchsia-300 dark:bg-fuchsia-800 text-fuchsia-900 dark:text-fuchsia-100 hover:bg-fuchsia-400 dark:hover:bg-fuchsia-700 transition-colors duration-200',
    pink: 'bg-pink-300 dark:bg-pink-800 text-pink-900 dark:text-pink-100 hover:bg-pink-400 dark:hover:bg-pink-700 transition-colors duration-200',
    rose: 'bg-rose-300 dark:bg-rose-800 text-rose-900 dark:text-rose-100 hover:bg-rose-400 dark:hover:bg-rose-700 transition-colors duration-200',
};

// Add these to your constants file
export const MODE_CLASSES: Record<ContentMode, string> = {
    encodeChips: CHIP_BASE_CLASS,
    name: 'inline-flex items-center align-middle px-1 py-0.5 mx-0.5',
    defaultValue: 'inline-flex items-center align-middle px-1 py-0.5 font-inherit text-inherit bg-inherit',
    recordKey: 'inline-flex items-center align-middle px-1 font-mono text-gray-600',
    encodeVisible: 'inline-flex items-center align-middle px-1 font-mono',
    status: CHIP_BASE_CLASS
};






export const LAYOUT_BASE = {
    structure: 'inline-flex items-center align-middle',
    spacing: {
        chip: 'px-2 py-1 mx-1',
        text: 'px-1 py-0.5 mx-0.5'
    },
    dimensions: {
        chip: 'min-h-[24px] min-w-[128px]',
        text: ''  // Text follows natural dimensions
    }
};

export const VISUAL_STYLES = {
    chip: {
        shape: 'rounded-md',
        interaction: 'cursor-move'
    },
    text: {
        base: 'font-inherit text-inherit bg-inherit',
        mono: 'font-mono'
    }
};

export const COLOR_VARIANTS = {
    chip: (color: TailwindColor) => ({
        background: `bg-${color}-300 dark:bg-${color}-800`,
        text: `text-${color}-900 dark:text-${color}-100`,
        hover: `hover:bg-${color}-400 dark:hover:bg-${color}-700`,
        transition: 'transition-colors duration-200'
    }),
    border: (color: TailwindColor) => ({
        standard: `border-${color}-300 dark:border-${color}-700`,
        subtle: `border-${color}-200 dark:border-${color}-800`
    })
};

export const MODE_STYLES = {
    encodeChips: (color: TailwindColor) => cn(
        LAYOUT_BASE.structure,
        LAYOUT_BASE.spacing.chip,
        LAYOUT_BASE.dimensions.chip,
        VISUAL_STYLES.chip.shape,
        VISUAL_STYLES.chip.interaction,
        Object.values(COLOR_VARIANTS.chip(color)).join(' ')
    ),
    
    name: (color: TailwindColor) => cn(
        LAYOUT_BASE.structure,
        LAYOUT_BASE.spacing.text,
        `border-l-2 border-r-2 ${COLOR_VARIANTS.border(color).standard}`
    ),
    
    defaultValue: (color: TailwindColor) => cn(
        LAYOUT_BASE.structure,
        LAYOUT_BASE.spacing.text,
        VISUAL_STYLES.text.base,
        `border-l border-r ${COLOR_VARIANTS.border(color).standard}`
    ),
    
    recordKey: (color: TailwindColor) => cn(
        LAYOUT_BASE.structure,
        LAYOUT_BASE.spacing.text,
        VISUAL_STYLES.text.mono,
        `border-l border-r ${COLOR_VARIANTS.border(color).subtle}`
    ),
    
    encodeVisible: (color: TailwindColor) => cn(
        LAYOUT_BASE.structure,
        LAYOUT_BASE.spacing.text,
        VISUAL_STYLES.text.mono,
        `border-l border-r ${COLOR_VARIANTS.border(color).subtle}`
    )
};


export const getColorClassesForModeNew = (color: TailwindColor, mode: ContentMode): string => {
    if (!color) return '';
    return MODE_STYLES[mode](color);
};




// Add color variations for different modes
export const getColorClassesForMode = (color: TailwindColor, mode: ContentMode): string => {
    if (!color) return '';

    switch (mode) {
        case 'encodeChips':
        case 'status':
            // Maintain full chip styling for chip and status modes
            return COLOR_STYLES[color];
            
        case 'name':
            // For name mode, use a slightly more prominent border
            return `border-l-2 border-r-2 border-${color}-300 dark:border-${color}-700`;
            
        case 'defaultValue':
            // For default value mode, use a subtle border but maintain the connection to the chip color
            return `border-l border-r border-${color}-300 dark:border-${color}-700`;
            
        case 'encodeVisible':
        case 'recordKey':
            // For technical modes, use very subtle borders
            return `border-l border-r border-${color}-200 dark:border-${color}-800`;
            
        default:
            return '';
    }
};


export const OLD_MODE_CLASSES: Record<ContentMode, string> = {
    encodeChips: CHIP_BASE_CLASS,
    name: 'inline-flex items-center align-middle px-1 py-0.5 mx-0.5 rounded border-l-2 border-r-2 cursor-text min-h-[20px]',
    defaultValue: 'inline-flex items-center align-middle bg-background text-neutral-950 dark:text-neutral-50 whitespace-pre-wrap border-l-2 border-r-2 cursor-text min-h-[20px]',
    recordKey: 'inline-flex items-center align-middle px-1 font-mono text-sm text-gray-600 dark:text-gray-400',
    encodeVisible: 'inline-flex items-center align-middle px-1 font-mono text-sm text-gray-700 dark:text-gray-300',
    status: CHIP_BASE_CLASS, // Uses same base as encodeChips but with status-specific modifications
};

export const CHIP_BASE_CLASS_OLD = 'inline-flex items-center px-2 py-1 mx-1 rounded-md cursor-move';
