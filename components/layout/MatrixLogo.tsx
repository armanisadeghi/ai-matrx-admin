"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import React from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";

const InfinitySymbol = ({ width = 24, height = 24, className = "" }) => (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path
            d="M18 12C18 9.79086 16.2091 8 14 8C11.7909 8 10 9.79086 10 12C10 9.79086 8.20914 8 6 8C3.79086 8 2 9.79086 2 12C2 14.2091 3.79086 16 6 16C8.20914 16 10 14.2091 10 12C10 14.2091 11.7909 16 14 16C16.2091 16 18 14.2091 18 12Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

interface LogoComponentProps {
    open: boolean;
}

const LogoComponentInfinity: React.FC<LogoComponentProps> = ({ open }) => {
    const pathname = usePathname();
    const isActive = pathname === "/dashboard";

    return (
        <Link
            href="/dashboard"
            className={cn(
                "group/sidebar flex items-center justify-start gap-2 rounded-sm px-2 py-2",
                "hover:bg-neutral-100 dark:hover:bg-neutral-700",
                "transition-colors duration-200 ease-in-out",
                "text-blue-600 dark:text-blue-400"
            )}
        >
            <InfinitySymbol className="flex-shrink-0" />

            <motion.span
                animate={{
                    display: open ? "inline-block" : "none",
                    opacity: open ? 1 : 0,
                }}
                className="!m-0 inline-block whitespace-pre !p-0 text-xs font-semibold transition duration-150"
            >
                AI Matrx
            </motion.span>
        </Link>
    );
};

const LogoComponent: React.FC<LogoComponentProps> = ({ open }) => {
    const pathname = usePathname();
    const isActive = pathname === "/dashboard";

    return (
        <Link
            href="/dashboard"
            className={cn(
                "group/sidebar flex items-center rounded-sm transition-colors duration-200 ease-in-out text-blue-600 dark:text-blue-400 hover:bg-neutral-100 dark:hover:bg-neutral-700",
                open ? "justify-start gap-2 px-2 py-2" : "justify-center px-1 py-1.5"
            )}
        >
            <Image 
                src="/matrx/apple-touch-icon.png" 
                width={open ? 24 : 20} 
                height={open ? 24 : 20} 
                alt="AI Matrx Logo" 
                className="flex-shrink-0" 
            />

            <motion.span
                initial={{
                    display: "none",
                    opacity: 0,
                }}
                animate={{
                    display: open ? "inline-block" : "none",
                    opacity: open ? 1 : 0,
                }}
                className="!m-0 inline-block whitespace-pre !p-0 text-xs font-semibold transition duration-150"
            >
                AI Matrx
            </motion.span>
        </Link>
    );
};

export const Logo: React.FC<LogoComponentProps> = ({ open }) => <LogoComponent open={open} />;
export const LogoIcon: React.FC<LogoComponentProps> = ({ open }) => <LogoComponent open={open} />;
