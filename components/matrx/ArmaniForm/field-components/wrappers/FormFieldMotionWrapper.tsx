import React from 'react';
import {motion} from 'framer-motion';
import {cn} from '@/lib/utils';
import {AnimationPreset, ComponentDensity} from "@/types/componentConfigTypes";

interface FormFieldMotionWrapperProps {
    children: React.ReactNode;
    animationPreset?: AnimationPreset;
    density?: ComponentDensity;
    floatingLabel?: boolean;
    className?: string;
}

export const formComponentAnimation = {
    none: {
        initial: {},
        animate: {},
        exit: {},
        transition: {}
    },
    subtle: {
        initial: {opacity: 0},
        animate: {opacity: 1},
        exit: {opacity: 0},
        transition: {duration: 0.15, ease: "easeOut"}
    },
    smooth: {
        initial: {opacity: 0, y: 5},
        animate: {opacity: 1, y: 0},
        exit: {opacity: 0, y: -5},
        transition: {duration: 0.2, ease: "easeInOut"}
    },
    energetic: {
        initial: {opacity: 0, scale: 0.97, y: 3},
        animate: {opacity: 1, scale: 1, y: 0},
        exit: {opacity: 0, scale: 0.97, y: -3},
        transition: {type: "spring", stiffness: 400, damping: 30}
    },
    feedback: {
        initial: {opacity: 0, x: -3},
        animate: {opacity: 1, x: 0},
        exit: {opacity: 0, x: 3},
        transition: {type: "tween", duration: 0.15, ease: "easeOut"}
    },
    error: {
        initial: {opacity: 0, scale: 0.95},
        animate: {
            opacity: 1,
            scale: 1,
            x: [0, -3, 3, -2, 2, 0],
        },
        exit: {opacity: 0, scale: 0.95},
        transition: {duration: 0.3}
    }
};

const spacingConfig = {
    compact: {
        padding: 'py-1',
        paddingFloatingLabel: 'pb-1 pt-3'
    },
    normal: {
        padding: 'py-2',
        paddingFloatingLabel: 'pb-2 pt-4'
    },
    comfortable: {
        padding: 'py-3',
        paddingFloatingLabel: 'pb-3 pt-5'
    }
};

const FormFieldMotionWrapper: React.FC<FormFieldMotionWrapperProps> = (
    {
        children,
        animationPreset = 'subtle',
        density = 'normal',
        floatingLabel = false,
        className
    }) => {
    const densityStyles = spacingConfig[density];

    return (
        <motion.div
            initial={formComponentAnimation[animationPreset].initial}
            animate={formComponentAnimation[animationPreset].animate}
            exit={formComponentAnimation[animationPreset].exit}
            transition={formComponentAnimation[animationPreset].transition}
            className={cn(
                densityStyles.padding,
                floatingLabel && densityStyles.paddingFloatingLabel,
                className
            )}
        >
            {children}
        </motion.div>
    );
};

export default FormFieldMotionWrapper;
