"use client";

import { cn } from "@/lib/utils";
import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";

export function ThreeColumnsWithImages() {
    return (
        <div className="w-full max-w-7xl mx-auto my-20 px-4 md:px-8">
            <h2 className="font-sans text-bold text-xl text-center md:text-4xl font-bold tracking-tight text-neutral-8000 dark:text-neutral-100">
                Dashboard for winners
            </h2>
            <p className="max-w-lg text-sm text-neutral-600 text-center mx-auto mt-4 dark:text-neutral-400">
                Our state of the art dashboard features the most comprehensive insights
                for your SaaS tool, with a blazing fast, we are so back AI text
                generation model.
            </p>
            <div className="mt-20  grid cols-1 md:grid-cols-3 gap-4 md:auto-rows-[25rem]">
                {items.map((item, index) => (
                    <Card
                        key={index}
                        className={cn("flex flex-col justify-between", item.className)}
                    >
                        <CardContent className="h-40">
                            <CardTitle>{item.title}</CardTitle>
                            <CardDescription>{item.description}</CardDescription>
                        </CardContent>
                        <CardSkeletonBody>{item.header}</CardSkeletonBody>
                    </Card>
                ))}
            </div>
        </div>
    );
}

const items = [
    {
        title: "Dashboard that matters",
        description:
            "Discover insights and trends with our advanced analytics dashboard.",
        header: (
            <Image
                src="https://assets.aceternity.com/pro/bento-1.png"
                alt="Bento grid 1"
                width={500}
                height={500}
                className="w-full object-cover rounded-lg ml-6"
            />
        ),
        className: "md:col-span-1",
    },
    {
        title: "Automated emails",
        description:
            "Send emails in bulk to everyone, with AI-powered suggestions.",
        header: (
            <Image
                src="https://assets.aceternity.com/pro/bento-2.png"
                alt="Bento grid 2"
                width={500}
                height={500}
            />
        ),
        className: "md:col-span-1",
    },
    {
        title: "Super fast Analytics",
        description:
            "Get insights on your data with our blazing fast analytics dashboard.",
        header: (
            <Image
                src="https://assets.aceternity.com/pro/bento-4.png"
                alt="Bento grid 3"
                width={500}
                height={500}
                className="rounded-lg -ml-6 object-cover -mt-4 md:-mt-0"
            />
        ),
        className: "md:col-span-1",
    },
    {
        title: "Admin portal",
        description: "Manage your data with our admin portal.",
        header: (
            <div className="flex">
                <Image
                    src="https://assets.aceternity.com/pro/bento-4.png"
                    alt="Bento grid 4"
                    width={500}
                    height={500}
                    className="object-cover rounded-lg ml-6"
                />
                <Image
                    src="https://assets.aceternity.com/pro/bento-4.png"
                    alt="Bento grid 4"
                    width={500}
                    height={500}
                    className="object-cover rounded-lg ml-6 mt-8"
                />
            </div>
        ),
        className: "md:col-span-2",
    },

    {
        title: "99.99% uptime SLA",
        description: "We guarantee 99.99% uptime SLA for our platform.",
        header: (
            <Image
                src="https://assets.aceternity.com/pro/bento-5.png"
                alt="Bento grid 5"
                width={500}
                height={500}
                className="w-[calc(100%-3rem)] mx-auto rounded-lg -mb-4"
            />
        ),
        className: "md:col-span-1",
    },
];

// Card structure
const CardSkeletonBody = ({
                              children,
                              className,
                          }: {
    children: React.ReactNode;
    className?: string;
}) => {
    return <div className={cn("overflow-hidden", className)}>{children}</div>;
};

const CardContent = ({
                         children,
                         className,
                     }: {
    children: React.ReactNode;
    className?: string;
}) => {
    return <div className={cn("p-6", className)}>{children}</div>;
};

const CardTitle = ({
                       children,
                       className,
                   }: {
    children: React.ReactNode;
    className?: string;
}) => {
    const variants = {
        initial: {
            x: 0,
        },
        animate: {
            x: 10,
        },
    };
    return (
        <motion.h3
            variants={variants}
            transition={{
                type: "easeOut",
                duration: 0.2,
            }}
            className={cn(
                "font-sans  text-base font-medium tracking-tight text-neutral-700 dark:text-neutral-100",
                className
            )}
        >
            {children}
        </motion.h3>
    );
};
const CardDescription = ({
                             children,
                             className,
                         }: {
    children: React.ReactNode;
    className?: string;
}) => {
    const variants = {
        initial: {
            x: 0,
        },
        animate: {
            x: 15,
        },
    };
    return (
        <motion.p
            variants={variants}
            transition={{
                type: "easeOut",
                duration: 0.2,
            }}
            className={cn(
                "font-sans max-w-xs text-base font-normal tracking-tight mt-2 text-neutral-500 dark:text-neutral-400",
                className
            )}
        >
            {children}
        </motion.p>
    );
};

const Card = ({
                  children,
                  className,
              }: {
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <motion.div
            whileHover="animate"
            className={cn(
                "group isolate flex flex-col rounded-2xl bg-white dark:bg-neutral-900 shadow-[0_1px_1px_rgba(0,0,0,0.05),0_4px_6px_rgba(34,42,53,0.04),0_24px_68px_rgba(47,48,55,0.05),0_2px_3px_rgba(0,0,0,0.04)] overflow-hidden",
                className
            )}
        >
            {children}
        </motion.div>
    );
};
