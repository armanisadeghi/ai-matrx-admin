

// Enhanced layout transitions


export type AnimationPreset = 'none' | 'subtle' | 'smooth' | 'energetic' | 'playful';
export type DensityOptions = 'compact' | 'normal' | 'comfortable';

export const layoutTransitions = {
    split: {
        container: {
            initial: {opacity: 0},
            animate: {opacity: 1},
            exit: {opacity: 0},
            transition: {duration: 0.3, staggerChildren: 0.1}
        },
        sidebar: {
            initial: {opacity: 0, x: -20},
            animate: {opacity: 1, x: 0},
            exit: {opacity: 0, x: -20},
            transition: {duration: 0.3}
        },
        content: {
            initial: {opacity: 0, scale: 0.98},
            animate: {opacity: 1, scale: 1},
            exit: {opacity: 0, scale: 0.98},
            transition: {duration: 0.3}
        }
    },
    sideBySide: {
        container: {
            initial: {opacity: 0},
            animate: {opacity: 1},
            exit: {opacity: 0},
            transition: {duration: 0.3, staggerChildren: 0.1}
        },
        left: {
            initial: {opacity: 0, x: -20},
            animate: {opacity: 1, x: 0},
            exit: {opacity: 0, x: -20},
            transition: {duration: 0.3}
        },
        right: {
            initial: {opacity: 0, x: 20},
            animate: {opacity: 1, x: 0},
            exit: {opacity: 0, x: 20},
            transition: {duration: 0.3}
        }
    },
    stacked: {
        container: {
            initial: {opacity: 0},
            animate: {opacity: 1},
            exit: {opacity: 0},
            transition: {duration: 0.3, staggerChildren: 0.1}
        },
        item: {
            initial: {opacity: 0, y: 20},
            animate: {opacity: 1, y: 0},
            exit: {opacity: 0, y: -20},
            transition: {duration: 0.3}
        }
    }
};

// Enhanced animation variants based on preset
export const getAnimationVariants = (preset: AnimationPreset) => ({
    none: {
        initial: {},
        animate: {},
        exit: {},
        transition: {duration: 0}
    },
    subtle: {
        initial: {opacity: 0},
        animate: {opacity: 1},
        exit: {opacity: 0},
        transition: {duration: 0.2}
    },
    smooth: {
        initial: {opacity: 0, y: 10},
        animate: {opacity: 1, y: 0},
        exit: {opacity: 0, y: -10},
        transition: {duration: 0.3}
    },
    energetic: {
        initial: {opacity: 0, scale: 0.95, y: 20},
        animate: {opacity: 1, scale: 1, y: 0},
        exit: {opacity: 0, scale: 0.95, y: -20},
        transition: {
            duration: 0.4,
            type: "spring",
            stiffness: 300,
            damping: 25
        }
    },
    playful: {
        initial: {opacity: 0, scale: 0.9, rotate: -2},
        animate: {opacity: 1, scale: 1, rotate: 0},
        exit: {opacity: 0, scale: 0.9, rotate: 2},
        transition: {
            duration: 0.5,
            type: "spring",
            stiffness: 200,
            damping: 20
        }
    }
});

// Animation Variants
export const containerVariants = {
    none: {
        initial: {},
        animate: {},
        exit: {},
    },
    subtle: {
        initial: {opacity: 0},
        animate: {opacity: 1},
        exit: {opacity: 0},
        transition: {duration: 0.2}
    },
    smooth: {
        initial: {opacity: 0, y: 10},
        animate: {opacity: 1, y: 0},
        exit: {opacity: 0, y: -10},
        transition: {duration: 0.3, ease: 'easeInOut'}
    },
    energetic: {
        initial: {opacity: 0, scale: 0.95},
        animate: {opacity: 1, scale: 1},
        exit: {opacity: 0, scale: 0.95},
        transition: {duration: 0.4, type: 'spring', stiffness: 300, damping: 25}
    },
    playful: {
        initial: {opacity: 0, scale: 0.9, rotate: -2},
        animate: {opacity: 1, scale: 1, rotate: 0},
        exit: {opacity: 0, scale: 0.9, rotate: 2},
        transition: {duration: 0.5, type: 'spring', stiffness: 200, damping: 20}
    }
};

// moved
export const cardVariants = {
    none: {},
    subtle: {
        initial: {opacity: 0},
        animate: {opacity: 1},
        transition: {duration: 0.2}
    },
    smooth: {
        initial: {opacity: 0, y: 20},
        animate: {opacity: 1, y: 0},
        transition: {duration: 0.3}
    },
    energetic: {
        initial: {opacity: 0, scale: 0.95, y: 20},
        animate: {opacity: 1, scale: 1, y: 0},
        transition: {type: 'spring', stiffness: 300, damping: 25}
    },
    playful: {
        initial: {opacity: 0, scale: 0.9, rotate: -2},
        animate: {opacity: 1, scale: 1, rotate: 0},
        transition: {type: 'spring', stiffness: 200, damping: 20}
    }
};

// Density Configurations  // moved
export const densityConfig = {
    compact: {
        spacing: 'gap-2',
        padding: {
            xs: 'p-1',
            sm: 'p-2',
            md: 'p-3',
            lg: 'p-4',
            xl: 'p-5'
        },
        fontSize: 'text-sm',
        iconSize: 'h-4 w-4',
        buttonSize: 'size-sm',
        maxHeight: 'max-h-[500px]'
    },
    normal: {
        spacing: 'gap-4',
        padding: {
            xs: 'pr-2 pl-2 pt-2 pb-2',
            sm: 'pr-3 pl-3 pt-3 pb-3',
            md: 'pr-4 pl-4 pt-4 pb-4',
            lg: 'pr-5 pl-5 pt-5 pb-5',
            xl: 'pr-6 pl-6 pt-6 pb-6'
        },
        fontSize: 'text-base',
        iconSize: 'h-5 w-5',
        buttonSize: 'size-default',
        maxHeight: 'max-h-[600px]'
    },
    comfortable: {
        spacing: 'gap-6',
        padding: {
            xs: 'p-3',
            sm: 'p-4',
            md: 'p-5',
            lg: 'p-7',
            xl: 'p-9'
        },
        fontSize: 'text-lg',
        iconSize: 'h-6 w-6',
        buttonSize: 'size-lg',
        maxHeight: 'max-h-[700px]'
    }
};

export const spacingConfig = {
    compact: {
        container: 'space-y-2',
        section: 'space-y-1',
        padding: 'p-2',
        gap: 'gap-1',
        text: 'text-sm',
        inputSize: 'h-8',
        buttonSize: 'h-8'
    },
    normal: {
        container: 'space-y-4',
        section: 'space-y-2',
        padding: 'p-4',
        gap: 'gap-2',
        text: 'text-base',
        inputSize: 'h-10',
        buttonSize: 'h-10'
    },
    comfortable: {
        container: 'space-y-6',
        section: 'space-y-3',
        padding: 'p-6',
        gap: 'gap-3',
        text: 'text-base',
        inputSize: 'h-12',
        buttonSize: 'h-12'
    }
};

