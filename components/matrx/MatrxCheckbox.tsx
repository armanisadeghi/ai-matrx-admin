'use client';

import { ReactNode, createContext, useContext, useState } from "react";
import { motion } from "motion/react";

interface CheckboxContextProps {
    id: string;
    isChecked: boolean;
    setIsChecked: (isChecked: boolean) => void;
    lineThrough: boolean;
}

const CheckboxContext = createContext<CheckboxContextProps>({
    id: "",
    isChecked: false,
    setIsChecked: () => {},
    lineThrough: false,
});

const tickVariants = {
    checked: {
        pathLength: 1,
        opacity: 1,
        transition: {
            duration: 0.3,
            ease: "easeOut",
        },
    },
    unchecked: {
        pathLength: 0,
        opacity: 0,
        transition: {
            duration: 0.3,
            ease: "easeIn",
        },
    },
};

interface CheckboxProps {
    children: ReactNode;
    id: string;
    lineThrough?: boolean;
    checked?: boolean;
    onChange?: (checked: boolean) => void;
}

export default function MatrxCheckbox({ children, id, lineThrough = false, checked = false, onChange }: CheckboxProps) {
    const [isChecked, setIsChecked] = useState(checked);
    const [isHovered, setIsHovered] = useState(false);

    const handleToggle = () => {
        const newChecked = !isChecked;
        setIsChecked(newChecked);
        if (onChange) {
            onChange(newChecked);
        }
    };

    return (
        <CheckboxContext.Provider
            value={{
                id,
                isChecked,
                setIsChecked,
                lineThrough,
            }}
        >
            <motion.div
                className="flex items-center cursor-pointer select-none"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={handleToggle}
                animate={{
                    scale: isHovered ? 1.05 : 1,
                }}
                transition={{ duration: 0.2 }}
            >
                {children}
            </motion.div>
        </CheckboxContext.Provider>
    );
}

function CheckboxIndicator() {
    const { id, isChecked } = useContext(CheckboxContext);

    return (
        <div className="relative flex items-center justify-center w-5 h-5">
            <input
                type="checkbox"
                className="absolute w-full h-full opacity-0 cursor-pointer"
                id={id}
                checked={isChecked}
                readOnly
            />
            <div className={`w-5 h-5 border-2 rounded-md transition-colors duration-200 ${isChecked ? 'bg-primary border-primary' : 'bg-background border-border'}`}>
                <motion.svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="w-full h-full text-primary-foreground"
                    initial={false}
                    animate={isChecked ? "checked" : "unchecked"}
                >
                    <motion.path
                        fill="none"
                        strokeWidth="3"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                        variants={tickVariants}
                    />
                </motion.svg>
            </div>
        </div>
    );
}

MatrxCheckbox.Indicator = CheckboxIndicator;

interface CheckboxLabelProps {
    children: ReactNode;
}

function CheckboxLabel({ children }: CheckboxLabelProps) {
    const { isChecked, lineThrough } = useContext(CheckboxContext);

    return (
        <motion.span
            className={`ml-2 text-sm ${lineThrough && isChecked ? 'line-through' : ''}`}
            animate={{
                x: isChecked ? [0, 8, 4] : 0,
                color: isChecked
                    ? "hsl(var(--muted-foreground))"
                    : "hsl(var(--foreground))",
            }}
            transition={{
                duration: 0.3,
                ease: "easeOut",
            }}
        >
            {children}
        </motion.span>
    );
}

MatrxCheckbox.Label = CheckboxLabel;
