'use client';

import {cn} from "@/lib/utils";
import { motion } from "motion/react";
import Image from "next/image";

export const FeaturedTestimonials = (
    {
        className,
        containerClassName,
    }: {
        textClassName?: string;
        className?: string;
        showStars?: boolean;
        containerClassName?: string;
    }) => {
    const images = [
        {
            name: "John Doe",
            src: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=3387&q=80",
        },
        {
            name: "Robert Johnson",
            src: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YXZhdGFyfGVufDB8fDB8fHww&auto=format&fit=crop&w=800&q=60",
        },
        {
            name: "Jane Smith",
            src: "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8YXZhdGFyfGVufDB8fDB8fHww&auto=format&fit=crop&w=800&q=60",
        },
        {
            name: "Emily Davis",
            src: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fGF2YXRhcnxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60",
        },
        {
            name: "Tyler Durden",
            src: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=3540&q=80",
        },
        {
            name: "Dora",
            src: "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=3534&q=80",
        },
    ];
    return (
        <div className={cn("flex flex-col items-center ", containerClassName)}>
            <div
                className={cn(
                    "flex flex-col sm:flex-row items-center justify-center mb-2",
                    className
                )}
            >
                <div className="flex flex-row items-center mb-4 sm:mb-0">
                    {images.map((image, idx) => (
                        <div className="-mr-4  relative group" key={image.name}>
                            <div>
                                <motion.div
                                    whileHover={{
                                        scale: 1.05,
                                        zIndex: 30,
                                    }}
                                    transition={{
                                        duration: 0.2,
                                    }}
                                    className="rounded-full overflow-hidden border-2  border-neutral-200  relative"
                                >
                                    <Image
                                        height={100}
                                        width={100}
                                        src={image.src}
                                        alt={image.name}
                                        className="object-cover object-top  md:h-14 md:w-14 h-8 w-8 "
                                    />
                                </motion.div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
