"use client";
import { IconMenu2, IconX } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import React, { useState } from "react";
import Image from "next/image";
import Marquee from "react-fast-marquee";
import { cn } from "@/lib/utils";

export function HeroSectionWithImagesGrid() {
    return (
        <div className="w-full bg-gray-50 dark:bg-neutral-950 relative overflow-hidden">
            <Navbar />
            <div className="relative pb-4 flex flex-col items-center justify-center overflow-hidden px-8  md:px-8 ">
                <div className="relative flex flex-col items-center justify-center  mt-20 ">
                    <FeaturedImages />
                    <h1 className="text-3xl md:text-4xl lg:text-7xl tracking-tight font-bold mt-4 mb-8relative text-center text-zinc-700 dark:text-white max-w-6xl mx-auto ">
                        Your best in class{" "}
                        <span className="relative bg-clip-text text-transparent bg-gradient-to-b from-indigo-700 to-indigo-600 z-10">
              design and development studio
            </span>{" "}
                        <span>
              <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="inline-block h-14 w-14 stroke-indigo-500 stroke-[1px]"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
              >
                <motion.path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <motion.path
                    initial={{
                        pathLength: 0,
                        fill: "#a5b4fc",
                        opacity: 0,
                    }}
                    animate={{
                        pathLength: 1,
                        fill: "#a5b4fc",
                        opacity: 1,
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "linear",
                        repeatDelay: 0.5,
                    }}
                    d="M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11"
                />
              </svg>
            </span>
                    </h1>
                    <h2 className="relative font-regular text-base md:text-xl text-zinc-500 dark:text-zinc-200 tracking-wide mb-8 mt-8 text-center max-w-xl mx-auto antialiased">
                        We provide the best in class design and development services for
                        teams that ship with the speed of light.
                    </h2>
                </div>
                <div className="relative z-10 group mb-10">
                    <button className="px-8 py-2 rounded-lg bg-black dark:bg-white dark:text-black font-medium text-white shadow-[0px_-2px_0px_0px_rgba(255,255,255,0.4)_inset]">
                        Book a call
                    </button>
                </div>
                <LogoCloudMarquee />
            </div>
            <ImagesGrid />
        </div>
    );
}

export const ImagesGrid = () => {
    const images = [
        {
            src: "https://assets.aceternity.com/pro/hero-example-3.jpg",
            className: "translate-y-10",
        },
        {
            src: "https://assets.aceternity.com/pro/hero-example-1.jpg",
            className: "translate-y-20",
        },

        {
            src: "https://assets.aceternity.com/pro/hero-example-2.jpg",
            className: "translate-y-4",
        },
        {
            src: "https://assets.aceternity.com/pro/hero-example-4.jpg",
            className: "translate-y-10",
        },
        {
            src: "https://assets.aceternity.com/pro/hero-example-5.jpg",
            className: "translate-y-20",
        },
    ];
    return (
        <div className="relative h-[20rem] md:h-[30rem] overflow-hidden mt-10 w-full border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex gap-5 flex-shrink-0 justify-center  absolute inset-0 h-full w-full">
                {images.map((image) => (
                    <div
                        className={cn(
                            "relative p-2 rounded-lg border border-neutral-200 dark:border-neutral-900 dark:bg-neutral-800 bg-gray-100 mt-0",
                            image.className
                        )}
                        key={image.src}
                    >
                        <Image
                            src={image.src}
                            alt={image.src}
                            width="500"
                            height="500"
                            className="object-cover rounded-lg h-full flex-shrink-0 min-w-[15rem] object-top"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export const FeaturedImages = ({
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

export function LogoCloudMarquee() {
    const logos = [
        {
            name: "Aceternity UI",
            src: "https://assets.aceternity.com/pro/logos/aceternity-ui.png",
        },
        {
            name: "Gamity",
            src: "https://assets.aceternity.com/pro/logos/gamity.png",
        },
        {
            name: "Host it",
            src: "https://assets.aceternity.com/pro/logos/hostit.png",
        },
        {
            name: "Asteroid Kit",
            src: "https://assets.aceternity.com/pro/logos/asteroid-kit.png",
        },
        {
            name: "Aceternity UI 2",
            src: "https://assets.aceternity.com/pro/logos/aceternity-ui.png",
        },
        {
            name: "Gamity 2",
            src: "https://assets.aceternity.com/pro/logos/gamity.png",
        },
        {
            name: "Host it 2",
            src: "https://assets.aceternity.com/pro/logos/hostit.png",
        },
        {
            name: "Asteroid Kit 2",
            src: "https://assets.aceternity.com/pro/logos/asteroid-kit.png",
        },
    ];

    return (
        <div className="relative ">
            <p className="text-center text-base text-neutral-700 font-sans dark:text-neutral-300 mt-4">
                Trusted by famous brands
            </p>

            <div className="flex gap-10 h-20 flex-wrap justify-center md:gap-40 relative  w-full mt-4 md:mt-2 max-w-4xl mx-auto [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
                <Marquee pauseOnHover direction="left" speed={30}>
                    {logos.map((logo, idx) => (
                        <Image
                            key={logo.name + "second"}
                            src={logo.src}
                            alt={logo.name}
                            width="100"
                            height="100"
                            className=" md:w-40 w-32 object-contain filter mx-0 md:mx-10 dark:invert"
                        />
                    ))}
                </Marquee>
            </div>
        </div>
    );
}

const Navbar = () => {
    const navItems = [
        {
            name: "Work",
            link: "#",
        },
        {
            name: "Services",
            link: "#",
        },
        {
            name: "Pricing",
            link: "#",
        },
        {
            name: "Contact",
            link: "#",
        },
    ];
    return (
        <div className="flex flex-row items-center justify-between py-8 max-w-7xl mx-auto px-8 relative z-[60] w-full">
            <Logo />
            <div className="lg:flex flex-row flex-1 hidden items-center  justify-center space-x-8 lg:space-x-14 text-sm text-zinc-600 font-medium hover:text-zinc-800 transition duration-200">
                <DesktopNav navItems={navItems} />
            </div>
            <button className="hidden md:block px-8 py-2 rounded-lg bg-black dark:bg-white dark:text-black font-medium text-white shadow-[0px_-2px_0px_0px_rgba(255,255,255,0.4)_inset]">
                Book a call
            </button>

            <div className="flex lg:hidden">
                <MobileNav navItems={navItems} />
            </div>
        </div>
    );
};

const DesktopNav = ({ navItems }: any) => {
    return (
        <>
            {navItems.map((navItem: any, idx: number) => (
                <Link
                    className="text-neutral-600 dark:text-neutral-300"
                    key={`link=${idx}`}
                    href={navItem.link}
                >
                    <span>{navItem.name}</span>
                </Link>
            ))}
        </>
    );
};

const MobileNav = ({ navItems }: any) => {
    const [open, setOpen] = useState(false);

    return (
        <>
            <IconMenu2 onClick={() => setOpen(!open)} />
            <AnimatePresence>
                {open && (
                    <motion.div className="fixed inset-0 bg-white z-50 flex flex-col justify-center items-center space-y-10  text-xl font-bold text-zinc-600  hover:text-zinc-800 transition duration-200">
                        <IconX
                            className="absolute right-8 top-8 h-5 w-5 "
                            onClick={() => setOpen(!open)}
                        />
                        {navItems.map((navItem: any, idx: number) => (
                            <Link
                                key={`link=${idx}`}
                                href={navItem.link}
                                className="relative text-neutral-600 dark:text-neutral-300"
                            >
                                <motion.span className="block">{navItem.name} </motion.span>
                            </Link>
                        ))}
                        <button className="px-8 py-2 rounded-lg bg-black dark:bg-white dark:text-black font-medium text-white shadow-[0px_-2px_0px_0px_rgba(255,255,255,0.4)_inset]">
                            Book a call
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

const Logo = () => {
    return (
        <Link
            href="/"
            className="font-normal flex space-x-2 items-center text-sm mr-4  text-black px-2 py-1  relative z-20"
        >
            <div className="h-5 w-6 bg-black dark:bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm" />
            <span className="font-medium text-black dark:text-white">DevStudio</span>
        </Link>
    );
};
