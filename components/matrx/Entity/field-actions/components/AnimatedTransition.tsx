// components/AnimatedTransition.tsx
import {motion, AnimatePresence} from 'framer-motion';

interface AnimatedTransitionProps {
    children: React.ReactNode;
    type?: 'fade' | 'slide' | 'scale';
}

export const AnimatedTransition: React.FC<AnimatedTransitionProps> = (
    {
        children,
        type = 'fade'
    }) => {
    const animations = {
        fade: {
            initial: {opacity: 0},
            animate: {opacity: 1},
            exit: {opacity: 0}
        },
        slide: {
            initial: {x: 20, opacity: 0},
            animate: {x: 0, opacity: 1},
            exit: {x: -20, opacity: 0}
        },
        scale: {
            initial: {scale: 0.9, opacity: 0},
            animate: {scale: 1, opacity: 1},
            exit: {scale: 0.9, opacity: 0}
        }
    };

    return (
        <AnimatePresence mode="sync">
            <motion.div
                {...animations[type]}
                transition={{duration: 0.2}}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
};
