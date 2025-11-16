import { motion, MotionProps } from 'motion/react';

const AnimatedButton: React.FC<MotionProps & React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...props }) => (
    <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="px-4 py-2 bg-primary text-primaryForeground rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
        {...props}
    >
        {children}
    </motion.button>
);
