// utils/componentConfig.ts
import { ComponentDensity, AnimationPreset } from "@/types/componentConfigTypes";

export const getDensityConfig = (density: ComponentDensity) => {
    const configs = {
        compact: {
            padding: 'p-1',
            gap: 'space-y-1',
            buttonSize: 'xs',
            fontSize: 'text-xs',
            cardPadding: 'p-2',
            headerPadding: 'p-2',
            iconSize: 'h-3 w-3',
            checkboxSize: 'h-3 w-3',
            buttonIconGap: 'mr-0.5',
            headerGap: 'mb-2',
            itemGap: 'gap-1',
        },
        normal: {
            padding: 'p-2',
            gap: 'space-y-2',
            buttonSize: 'sm',
            fontSize: 'text-sm',
            cardPadding: 'p-3',
            headerPadding: 'p-4',
            iconSize: 'h-4 w-4',
            checkboxSize: 'h-4 w-4',
            buttonIconGap: 'mr-1',
            headerGap: 'mb-4',
            itemGap: 'gap-2',
        },
        comfortable: {
            padding: 'p-3',
            gap: 'space-y-3',
            buttonSize: 'default',
            fontSize: 'text-base',
            cardPadding: 'p-4',
            headerPadding: 'p-6',
            iconSize: 'h-5 w-5',
            checkboxSize: 'h-5 w-5',
            buttonIconGap: 'mr-2',
            headerGap: 'mb-6',
            itemGap: 'gap-3',
        },
    };
    return configs[density];
};

export const getAnimationConfig = (preset: AnimationPreset) => {
    const configs = {
        none: {
            initial: {},
            animate: {},
            exit: {},
            transition: { duration: 0 },
            hover: {},
            listItem: {},
        },
        subtle: {
            initial: { opacity: 0, x: -5 },
            animate: { opacity: 1, x: 0 },
            exit: { opacity: 0, x: 5 },
            transition: { duration: 0.2 },
            hover: { scale: 1.01 },
            listItem: { transition: { staggerChildren: 0.02 } },
        },
        smooth: {
            initial: { opacity: 0, x: -10 },
            animate: { opacity: 1, x: 0 },
            exit: { opacity: 0, x: 10 },
            transition: { duration: 0.3 },
            hover: { scale: 1.02 },
            listItem: { transition: { staggerChildren: 0.03 } },
        },
        energetic: {
            initial: { opacity: 0, x: -20 },
            animate: { opacity: 1, x: 0 },
            exit: { opacity: 0, x: 20 },
            transition: { duration: 0.4, type: "spring" },
            hover: { scale: 1.03, y: -2 },
            listItem: { transition: { staggerChildren: 0.04 } },
        },
        playful: {
            initial: { opacity: 0, x: -30, rotate: -5 },
            animate: { opacity: 1, x: 0, rotate: 0 },
            exit: { opacity: 0, x: 30, rotate: 5 },
            transition: { duration: 0.5, type: "spring", bounce: 0.4 },
            hover: { scale: 1.05, rotate: 1 },
            listItem: { transition: { staggerChildren: 0.05 } },
        },
    };
    return configs[preset];
};
