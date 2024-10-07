import Link from "next/link";
import {motion} from "framer-motion";
import React from "react";

const InfinitySymbol = ({width = 28, height = 16, className = ''}) => (
    <svg
        width={width}
        height={height}
        viewBox="0 0 24 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path
            d="M18 6C18 3.79086 16.2091 2 14 2C11.7909 2 10 3.79086 10 6C10 3.79086 8.20914 2 6 2C3.79086 2 2 3.79086 2 6C2 8.20914 3.79086 10 6 10C8.20914 10 10 8.20914 10 6C10 8.20914 11.7909 10 14 10C16.2091 10 18 8.20914 18 6Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

export const Logo = () => {
    return (
        <Link
            href="#"
            className="font-normal flex space-x-2 items-center text-lg text-black dark:text-white py-1 relative z-20"
        >
            <InfinitySymbol className="text-primary"/>
            <motion.span
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                className="font-large whitespace-pre text-primary"
            >
                AI Matrx
            </motion.span>
        </Link>
    );
};

export const LogoIcon = () => {
    return (
        <Link
            href="#"
            className="font-normal flex space-x-2 items-center text-sm text-black dark:text-white py-1 relative z-20"
        >
            <InfinitySymbol className="text-primary"/>
        </Link>
    );
};
