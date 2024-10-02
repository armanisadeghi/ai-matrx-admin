// components/matrx/AnimatedForm/AnimatedButton.tsx

'use client';
import React from "react";
import { motion, MotionProps } from "framer-motion";
import { cn } from "@/styles/themes/utils"; // Import cn utility

const AnimatedButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & MotionProps & { disabled?: boolean }> = (
    {
        children,
        className,
        disabled = false, // Add disabled prop
        ...props
    }) => (
    <motion.button
        whileHover={disabled ? undefined : { scale: 1.05 }} // Disable hover effect when disabled
        whileTap={disabled ? undefined : { scale: 0.95 }} // Disable tap effect when disabled
        disabled={disabled} // Apply disabled to button
        className={cn(
            "px-4 py-2 bg-primary text-primary-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50",
            disabled ? "opacity-50 cursor-not-allowed" : "",
            className // Combine classNames
        )}
        {...props}
    >
        {children}
    </motion.button>
);

export default AnimatedButton;
