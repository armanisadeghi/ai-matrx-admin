

export const CHIP_BASE_CLASS = 'inline-flex items-center px-2 py-1 mx-1 rounded-md cursor-move';

export const TAILWIND_COLORS = [
    'blue',
    'indigo',
    'violet',
    'fuchsia',
    'rose',
    'orange',
    'amber',
    'emerald',
    'teal',
    'cyan',
    'sky',
    'purple',
    'pink',
    'red',
    'green'
] as const;

export type TailwindColor = typeof TAILWIND_COLORS[number];

export const COLOR_STYLES: Record<TailwindColor, string> = {
    blue: "bg-blue-300 dark:bg-blue-800 text-blue-900 dark:text-blue-100 hover:bg-blue-400 dark:hover:bg-blue-700 transition-colors duration-200",
    indigo: "bg-indigo-300 dark:bg-indigo-800 text-indigo-900 dark:text-indigo-100 hover:bg-indigo-400 dark:hover:bg-indigo-700 transition-colors duration-200",
    violet: "bg-violet-300 dark:bg-violet-800 text-violet-900 dark:text-violet-100 hover:bg-violet-400 dark:hover:bg-violet-700 transition-colors duration-200",
    fuchsia: "bg-fuchsia-300 dark:bg-fuchsia-800 text-fuchsia-900 dark:text-fuchsia-100 hover:bg-fuchsia-400 dark:hover:bg-fuchsia-700 transition-colors duration-200",
    rose: "bg-rose-300 dark:bg-rose-800 text-rose-900 dark:text-rose-100 hover:bg-rose-400 dark:hover:bg-rose-700 transition-colors duration-200",
    orange: "bg-orange-300 dark:bg-orange-800 text-orange-900 dark:text-orange-100 hover:bg-orange-400 dark:hover:bg-orange-700 transition-colors duration-200",
    amber: "bg-amber-300 dark:bg-amber-800 text-amber-900 dark:text-amber-100 hover:bg-amber-400 dark:hover:bg-amber-700 transition-colors duration-200",
    emerald: "bg-emerald-300 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-400 dark:hover:bg-emerald-700 transition-colors duration-200",
    teal: "bg-teal-300 dark:bg-teal-800 text-teal-900 dark:text-teal-100 hover:bg-teal-400 dark:hover:bg-teal-700 transition-colors duration-200",
    cyan: "bg-cyan-300 dark:bg-cyan-800 text-cyan-900 dark:text-cyan-100 hover:bg-cyan-400 dark:hover:bg-cyan-700 transition-colors duration-200",
    sky: "bg-sky-300 dark:bg-sky-800 text-sky-900 dark:text-sky-100 hover:bg-sky-400 dark:hover:bg-sky-700 transition-colors duration-200",
    purple: "bg-purple-300 dark:bg-purple-800 text-purple-900 dark:text-purple-100 hover:bg-purple-400 dark:hover:bg-purple-700 transition-colors duration-200",
    pink: "bg-pink-300 dark:bg-pink-800 text-pink-900 dark:text-pink-100 hover:bg-pink-400 dark:hover:bg-pink-700 transition-colors duration-200",
    red: "bg-red-300 dark:bg-red-800 text-red-900 dark:text-red-100 hover:bg-red-400 dark:hover:bg-red-700 transition-colors duration-200",
    green: "bg-green-300 dark:bg-green-800 text-green-900 dark:text-green-100 hover:bg-green-400 dark:hover:bg-green-700 transition-colors duration-200"
};
