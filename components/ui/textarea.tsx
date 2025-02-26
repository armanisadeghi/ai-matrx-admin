"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useMotionTemplate, useMotionValue, motion } from "framer-motion";
import { Check, Copy } from "lucide-react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
    const radius = 200;
    const [visible, setVisible] = React.useState(false);
    let mouseX = useMotionValue(0);
    let mouseY = useMotionValue(0);

    function handleMouseMove({ currentTarget, clientX, clientY }: any) {
        let { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }

    return (
        <motion.div
            style={{
                background: useMotionTemplate`
            radial-gradient(
              ${visible ? radius + "px" : "0px"} circle at ${mouseX}px ${mouseY}px,
              var(--blue-500),
              transparent 80%
            )
          `,
            }}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
            className="p-[2px] rounded-lg transition duration-300 group/textarea"
        >
            <textarea
                className={cn(
                    `flex h-auto w-full border-none bg-gray-50 dark:bg-zinc-800 text-black dark:text-white shadow-textarea rounded-md px-3 py-2 text-sm
            placeholder:text-neutral-400 dark:placeholder-text-neutral-600 
            focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600
            disabled:cursor-not-allowed disabled:opacity-50
            dark:shadow-[0px_0px_1px_1px_var(--neutral-700)]
            group-hover/textarea:shadow-none transition duration-400
            `,
                    className
                )}
                ref={ref}
                {...props}
            />
        </motion.div>
    );
});
Textarea.displayName = "Textarea";

const BasicTextarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
    return (
        <textarea
            className={cn(
                "flex h-auto w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            ref={ref}
            {...props}
        />
    );
});
BasicTextarea.displayName = "BasicTextarea";

// Textarea with Prefix
interface TextareaWithPrefixProps extends Omit<TextareaProps, 'prefix'> {
    prefix?: React.ReactNode;
    wrapperClassName?: string;
}

const TextareaWithPrefix = React.forwardRef<HTMLTextAreaElement, TextareaWithPrefixProps>(
    ({ prefix, className, wrapperClassName, ...props }, ref) => {
        return (
            <div className={cn("relative", wrapperClassName)}>
                {prefix && <div className="absolute left-3 top-3 text-muted-foreground z-10 pointer-events-none">{prefix}</div>}
                <textarea
                    ref={ref}
                    className={cn(
                        "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-y",
                        prefix && "pl-10",
                        className
                    )}
                    {...props}
                />
            </div>
        );
    }
);
TextareaWithPrefix.displayName = "TextareaWithPrefix";

// Textarea with Copy Button
interface CopyTextareaProps extends TextareaProps {
    variant?: "default" | "fancy";
}

const CopyTextarea = React.forwardRef<HTMLTextAreaElement, CopyTextareaProps>(({ className, variant = "default", ...props }, ref) => {
    const [hasCopied, setHasCopied] = React.useState(false);

    const handleCopy = async () => {
        const textareaValue =
            (ref as React.RefObject<HTMLTextAreaElement>)?.current?.value || String(props.value || props.defaultValue || "");
        if (textareaValue) {
            await navigator.clipboard.writeText(textareaValue);
            setHasCopied(true);
            setTimeout(() => setHasCopied(false), 450);
        }
    };

    return (
        <div className="relative">
            <textarea
                ref={ref}
                className={cn(
                    "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-y pr-10",
                    className
                )}
                {...props}
            />
            <button
                type="button"
                onClick={handleCopy}
                className="absolute right-2 top-2 p-1 hover:bg-muted rounded-md transition-colors z-10"
                aria-label="Copy to clipboard"
            >
                {hasCopied ? (
                    <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} className="text-green-500">
                        <Check className="h-4 w-4" />
                    </motion.div>
                ) : (
                    <Copy className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                )}
            </button>
        </div>
    );
});
CopyTextarea.displayName = "CopyTextarea";

// Fancy Textarea with Both Features
interface FancyTextareaProps extends Omit<TextareaProps, 'prefix'> {
    prefix?: React.ReactNode;
    wrapperClassName?: string;
}

const FancyTextarea = React.forwardRef<HTMLTextAreaElement, FancyTextareaProps>(
    ({ prefix, className, wrapperClassName, ...props }, ref) => {
        const [hasCopied, setHasCopied] = React.useState(false);
        const radius = 200;
        const [visible, setVisible] = React.useState(false);
        const mouseX = useMotionValue(0);
        const mouseY = useMotionValue(0);

        const handleCopy = async () => {
            const textareaValue =
                (ref as React.RefObject<HTMLTextAreaElement>)?.current?.value || String(props.value || props.defaultValue || "");
            if (textareaValue) {
                await navigator.clipboard.writeText(textareaValue);
                setHasCopied(true);
                setTimeout(() => setHasCopied(false), 450);
            }
        };

        function handleMouseMove({ currentTarget, clientX, clientY }: any) {
            let { left, top } = currentTarget.getBoundingClientRect();
            mouseX.set(clientX - left);
            mouseY.set(clientY - top);
        }

        return (
            <motion.div
                className={cn("relative", wrapperClassName)}
                style={{
                    background: useMotionTemplate`
              radial-gradient(
                ${visible ? radius + "px" : "0px"} circle at ${mouseX}px ${mouseY}px,
                var(--blue-500),
                transparent 80%
              )
            `,
                }}
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setVisible(true)}
                onMouseLeave={() => setVisible(false)}
            >
                {prefix && <div className="absolute left-3 top-3 text-muted-foreground z-10 pointer-events-none">{prefix}</div>}
                <textarea
                    ref={ref}
                    className={cn(
                        "flex w-full rounded-md border-none bg-gray-50 dark:bg-zinc-800 text-black dark:text-white shadow-textarea px-3 py-2 text-sm resize-y",
                        "placeholder:text-neutral-400 dark:placeholder-text-neutral-600",
                        "focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600",
                        prefix && "pl-10",
                        "pr-10", // Space for copy button
                        className
                    )}
                    {...props}
                />
                <button
                    type="button"
                    onClick={handleCopy}
                    className="absolute right-2 top-2 p-1 hover:bg-muted rounded-md transition-colors z-10"
                    aria-label="Copy to clipboard"
                >
                    {hasCopied ? (
                        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} className="text-green-500">
                            <Check className="h-4 w-4" />
                        </motion.div>
                    ) : (
                        <Copy className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    )}
                </button>
            </motion.div>
        );
    }
);
FancyTextarea.displayName = "FancyTextarea";

export { Textarea, BasicTextarea, TextareaWithPrefix, CopyTextarea, FancyTextarea };
