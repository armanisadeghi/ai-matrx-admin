"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function FullBackgroundImageWithText({
                                                gradientFade = true,
                                            }: {
    gradientFade?: boolean;
}) {
    const logos = [
        {
            name: "Aceternity UI",
            image: "https://assets.aceternity.com/pro/logos/aceternity-ui.png",
        },
        {
            name: "Gamity",
            image: "https://assets.aceternity.com/pro/logos/gamity.png",
        },
        {
            name: "Host it",
            image: "https://assets.aceternity.com/pro/logos/hostit.png",
        },
        {
            name: "Asteroid Kit",
            image: "https://assets.aceternity.com/pro/logos/asteroid-kit.png",
        },
    ];
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-10 relative w-full">
            <div className="absolute inset-0 h-full w-full bg-black"></div>
            <motion.div
                initial={{ opacity: 0 }}
                whileInView={{
                    opacity: [0, 0.3],
                }}
                transition={{
                    duration: 2,
                }}
                className="absolute inset-0 h-full w-full"
            >
                <BlurImage
                    src="https://assets.aceternity.com/pro/image-background.jpg"
                    className={cn(
                        "h-full w-full absolute inset-0 object-cover select-none pointer-events-none",
                        gradientFade &&
                        "[mask-image:radial-gradient(200px_at_center,transparent,black)]"
                    )}
                    width={1000}
                    height={1000}
                    alt="header"
                />
                <div className="absolute bottom-0 h-40  bg-gradient-to-t from-black to-transparent w-full"></div>
            </motion.div>
            <h1 className="text-3xl relative z-10 md:text-7xl md:leading-tight max-w-5xl text-center text-balance tracking-tight font-medium bg-clip-text text-transparent bg-gradient-to-b  from-neutral-400 via-white to-white">
                The best community for <br />
                Indie Hackers
            </h1>
            <p className=" mt-2 md:mt-6 relative z-10  md:text-xl text-neutral-200 text-center max-w-2xl ">
                We&apos;re building a community of indie hackers to help each other
                succeed. Get in touch with us to join the community.
            </p>

            <div className="flex sm:flex-row flex-col mt-6 gap-4">
                <Button as={Link} href="#" variant="secondary">
                    Join Community
                </Button>
                <Button as={Link} href="#" variant="simple" target="_blank">
                    Add your product
                </Button>
            </div>
            <div className="flex gap-10 flex-wrap relative justify-center z-10 mt-10">
                {logos.map((logo) => (
                    <BlurImage
                        key={logo.name}
                        src={logo.image}
                        width={100}
                        height={100}
                        alt={logo.name}
                        className="object-contain filter invert w-24  md:w-40"
                    />
                ))}
            </div>
        </div>
    );
}

export const Button = ({
                           href,
                           as: Tag = "a",
                           children,
                           className,
                           variant = "primary",
                           ...props
                       }: {
    href?: string;
    as?: React.ElementType;
    children: React.ReactNode;
    className?: string;
    variant?: "primary" | "secondary" | "simple";
} & (
    | React.ComponentPropsWithoutRef<"a">
    | React.ComponentPropsWithoutRef<"button">
    )) => {
    const baseStyles =
        "no-underline flex space-x-2 group cursor-pointer relative border-none transition duration-200 rounded-full p-px text-xs font-semibold leading-6 px-4 py-2";

    const variantStyles = {
        primary:
            "w-full sm:w-44 h-10 rounded-lg text-sm text-center items-center justify-center relative z-20 bg-black  text-white",
        secondary:
            "relative z-20 text-sm bg-white  text-black  w-full sm:w-44 h-10  flex items-center justify-center rounded-lg hover:-translate-y-0.5 ",
        simple:
            "relative z-20 text-sm bg-transparent  text-white  w-full sm:w-44 h-10  flex items-center justify-center rounded-lg hover:-translate-y-0.5 ",
    };

    return (
        <Tag
            href={href || undefined}
            className={cn(baseStyles, variantStyles[variant], className)}
            {...props}
        >
            {children}
        </Tag>
    );
};

import Image from "next/image";

export const BlurImage = (props: React.ComponentProps<typeof Image>) => {
    const [isLoading, setLoading] = useState(true);

    const { src, width, height, alt, layout, ...rest } = props;
    return (
        <Image
            className={cn(
                "transition duration-300",
                isLoading ? "opacity-0" : "opacity-100",
                props.className
            )}
            onLoad={() => setLoading(false)}
            src={src}
            width={width}
            height={height}
            loading="lazy"
            decoding="async"
            blurDataURL={src as string}
            layout={layout}
            alt={alt ? alt : "Avatar"}
            {...rest}
        />
    );
};
