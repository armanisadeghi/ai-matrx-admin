"use client";
import { cn } from "@/lib/utils";
import { Manrope } from "next/font/google";
import Image from "next/image";
import React, { useEffect, useRef } from "react";
import { RoughNotation, RoughNotationGroup } from "react-rough-notation";
import { animate, stagger, useInView } from "framer-motion";

const manrope = Manrope({
    subsets: ["latin"],
    weight: ["400", "700"],
});

const SVGDataURI =
    "data:image/svg+xml;base64,IDxzdmcKICAgICAgd2lkdGg9IjQyMSIKICAgICAgaGVpZ2h0PSI4NTIiCiAgICAgIHZpZXdCb3g9IjAgMCA0MjEgODUyIgogICAgICBmaWxsPSJub25lIgogICAgICB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgICA+CiAgICAgIDxwYXRoCiAgICAgICAgZmlsbC1ydWxlPSJldmVub2RkIgogICAgICAgIGNsaXAtcnVsZT0iZXZlbm9kZCIKICAgICAgICBkPSJNNzMgMEgzNDhDMzg2LjY2IDAgNDE4IDMxLjM0MDEgNDE4IDcwVjc4MkM0MTggODIwLjY2IDM4Ni42NiA4NTIgMzQ4IDg1Mkg3M0MzNC4zNDAxIDg1MiAzIDgyMC42NiAzIDc4MlY3MEMzIDMxLjM0MDEgMzQuMzQwMSAwIDczIDBaTTM0OCA2SDczQzM3LjY1MzggNiA5IDM0LjY1MzggOSA3MFY3ODJDOSA4MTcuMzQ2IDM3LjY1MzggODQ2IDczIDg0NkgzNDhDMzgzLjM0NiA4NDYgNDEyIDgxNy4zNDYgNDEyIDc4MlY3MEM0MTIgMzQuNjUzOCAzODMuMzQ2IDYgMzQ4IDZaIgogICAgICAgIGZpbGw9ImJsYWNrIgogICAgICAvPgogICAgICA8cmVjdAogICAgICAgIHg9IjMxOCIKICAgICAgICB3aWR0aD0iMTAiCiAgICAgICAgaGVpZ2h0PSI2IgogICAgICAgIGZpbGw9ImJsYWNrIgogICAgICAgIGZpbGwtb3BhY2l0eT0iMC4yIgogICAgICAvPgogICAgICA8cmVjdAogICAgICAgIHg9IjkzIgogICAgICAgIHk9Ijg0NiIKICAgICAgICB3aWR0aD0iMTAiCiAgICAgICAgaGVpZ2h0PSI2IgogICAgICAgIGZpbGw9ImJsYWNrIgogICAgICAgIGZpbGwtb3BhY2l0eT0iMC4yIgogICAgICAvPgogICAgICA8cmVjdAogICAgICAgIHg9IjMiCiAgICAgICAgeT0iOTAiCiAgICAgICAgd2lkdGg9IjYiCiAgICAgICAgaGVpZ2h0PSIxMCIKICAgICAgICBmaWxsPSJibGFjayIKICAgICAgICBmaWxsLW9wYWNpdHk9IjAuMiIKICAgICAgLz4KICAgICAgPHJlY3QKICAgICAgICB4PSI0MTIiCiAgICAgICAgeT0iOTAiCiAgICAgICAgd2lkdGg9IjYiCiAgICAgICAgaGVpZ2h0PSIxMCIKICAgICAgICBmaWxsPSJibGFjayIKICAgICAgICBmaWxsLW9wYWNpdHk9IjAuMiIKICAgICAgLz4KICAgICAgPHJlY3QKICAgICAgICB4PSIzIgogICAgICAgIHk9Ijc1MiIKICAgICAgICB3aWR0aD0iNiIKICAgICAgICBoZWlnaHQ9IjEwIgogICAgICAgIGZpbGw9ImJsYWNrIgogICAgICAgIGZpbGwtb3BhY2l0eT0iMC4yIgogICAgICAvPgogICAgICA8cmVjdAogICAgICAgIHg9IjQxMiIKICAgICAgICB5PSI3NTIiCiAgICAgICAgd2lkdGg9IjYiCiAgICAgICAgaGVpZ2h0PSIxMCIKICAgICAgICBmaWxsPSJibGFjayIKICAgICAgICBmaWxsLW9wYWNpdHk9IjAuMiIKICAgICAgLz4KICAgICAgPHBhdGgKICAgICAgICBmaWxsLXJ1bGU9ImV2ZW5vZGQiCiAgICAgICAgY2xpcC1ydWxlPSJldmVub2RkIgogICAgICAgIGQ9Ik00MTcuOTcxIDI2Nkg0MTguOTgxQzQyMC4wOTYgMjY2IDQyMSAyNjYuODk1IDQyMSAyNjhWMzY0QzQyMSAzNjUuMTA1IDQyMC4wOTYgMzY2IDQxOC45ODEgMzY2SDQxNy45NzFWMjY2WiIKICAgICAgICBmaWxsPSJibGFjayIKICAgICAgLz4KICAgICAgPHBhdGgKICAgICAgICBmaWxsLXJ1bGU9ImV2ZW5vZGQiCiAgICAgICAgY2xpcC1ydWxlPSJldmVub2RkIgogICAgICAgIGQ9Ik0wIDMwMkMwIDMwMC44OTUgMC45MDQwMiAzMDAgMi4wMTkxOCAzMDBIMy4wMjg3OFYzNjNIMi4wMTkxOEMwLjkwNDAyIDM2MyAwIDM2Mi4xMDUgMCAzNjFWMzAyWiIKICAgICAgICBmaWxsPSJibGFjayIKICAgICAgLz4KICAgICAgPHBhdGgKICAgICAgICBmaWxsLXJ1bGU9ImV2ZW5vZGQiCiAgICAgICAgY2xpcC1ydWxlPSJldmVub2RkIgogICAgICAgIGQ9Ik0wIDIyM0MwIDIyMS44OTUgMC45MDQwMiAyMjEgMi4wMTkxOCAyMjFIMy4wMjg3OFYyODRIMi4wMTkxOEMwLjkwNDAyIDI4NCAwIDI4My4xMDUgMCAyODJWMjIzWiIKICAgICAgICBmaWxsPSJibGFjayIKICAgICAgLz4KICAgICAgPHBhdGgKICAgICAgICBmaWxsLXJ1bGU9ImV2ZW5vZGQiCiAgICAgICAgY2xpcC1ydWxlPSJldmVub2RkIgogICAgICAgIGQ9Ik0wIDE2MkMwIDE2MC44OTUgMC45MDQwMiAxNjAgMi4wMTkxOCAxNjBIMy4wMjg3OFYxOTNIMi4wMTkxOEMwLjkwNDAyIDE5MyAwIDE5Mi4xMDUgMCAxOTFWMTYyWiIKICAgICAgICBmaWxsPSJibGFjayIKICAgICAgLz4KICAgICAgPHJlY3QKICAgICAgICB4PSIxNTAiCiAgICAgICAgeT0iMzAiCiAgICAgICAgd2lkdGg9IjEyMCIKICAgICAgICBoZWlnaHQ9IjM1IgogICAgICAgIHJ4PSIxNy41IgogICAgICAgIGZpbGw9ImJsYWNrIgogICAgICAvPgogICAgICA8cmVjdAogICAgICAgIHg9IjI0NCIKICAgICAgICB5PSI0MSIKICAgICAgICB3aWR0aD0iMTMiCiAgICAgICAgaGVpZ2h0PSIxMyIKICAgICAgICByeD0iNi41IgogICAgICAgIGZpbGw9ImJsYWNrIgogICAgICAgIGZpbGwtb3BhY2l0eT0iMC4xIgogICAgICAvPgogICAgPC9zdmc+";

export function PlayfulHeroSection() {
    const ref = useRef(null);
    const isInView = useInView(ref);
    return (
        <div ref={ref} className="bg-gray-50 w-full dark:bg-neutral-800 mb-20">
            <div className="grid max-h-[50rem] md:max-h-[40rem] overflow-hidden grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 max-w-7xl mx-auto  pt-10 md:pt-20  items-start">
                <div className="lg:col-span-2 py-10 md:py-10 px-4 md:px-8">
                    <RoughNotationGroup show={isInView}>
                        <h2
                            className={cn(
                                "text-2xl sm:text-4xl lg:text-7xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 text-center sm:text-left",
                                manrope.className
                            )}
                        >
                            Your favourite{" "}
                            <RoughNotation
                                type="highlight"
                                animationDuration={2000}
                                iterations={3}
                                color="#facc1580"
                                multiline
                            >
                                <span className="text-currentColor">productivity tool</span>
                            </RoughNotation>{" "}
                            is now available for{" "}
                            <RoughNotation
                                type="underline"
                                animationDuration={2000}
                                iterations={10}
                                color="#facc15"
                            >
                                mobile
                            </RoughNotation>
                        </h2>
                        <p className="text-neutral-500 dark:text-neutral-400 text-sm md:text-lg max-w-2xl mt-4 md:mt-10 text-center sm:text-left">
                            Aceternity AI bring you the best productivity tools for your
                            desktop, now available on mobile. Download the app now to avail
                            additional{" "}
                            <RoughNotation
                                type="underline"
                                animationDuration={2000}
                                iterations={3}
                                color="#facc15"
                            >
                                20% discount
                            </RoughNotation>{" "}
                            and take your productivity to the next level.
                        </p>
                    </RoughNotationGroup>
                    <div className="flex sm:flex-row flex-col gap-4 items-center mt-10 [perspective:800px]">
                        <button className="px-4 py-2 rounded-lg bg-yellow-400 w-full sm:w-auto font-bold text-black text-base hover:[transform:rotateX(10deg)] transition duration-200 origin-left hover:shadow-lg">
                            Get the app
                        </button>
                        <button className="text-black dark:text-white hover:border-yellow-500 border border-transparent px-4 py-2 rounded-lg text-base transition duration-200">
                            Read changelog
                        </button>
                    </div>
                </div>
                <div className="flex justify-end overflow-hidden h-full w-full relative flex-shrink-0">
                    <Skeleton />
                </div>
            </div>
        </div>
    );
}

export const Skeleton = () => {
    const ref = useRef(null);
    const isInView = useInView(ref);
    useEffect(() => {
        const sequence = [
            [".first", { opacity: [0, 1] }, { duration: 1, ease: "easeOut" }],
            [".second", { opacity: [0, 1] }, { duration: 1, ease: "easeOut" }],
            [
                ".images .image",
                {
                    opacity: [0, 1],
                    rotate: [0, Math.floor(Math.random() * 10), 0],
                    scale: [1, 1.1, 1],
                },
                { duration: 1, ease: "easeOut", delay: stagger(0.4) },
            ],
        ];

        //@ts-ignore
        if (isInView) animate(sequence);
    }, [isInView]);
    return (
        <div ref={ref} className="realtive pt-20 w-[360px] h-[600px] m-auto">
            <div
                style={{
                    backgroundImage: `url('${SVGDataURI}')`,
                    backgroundSize: "cover",
                    backgroundPosition: "top",
                    backgroundRepeat: "no-repeat",
                }}
                className="absolute inset-0 mx-auto w-full max-w-[360px] h-[600px] dark:filter dark:invert"
            />
            <div className="px-8 mt-0 md:mt-10 flex flex-col gap-4 relative z-20">
                <div className="first opacity-0 text-sm text-neutral-800 dark:text-neutral-100 p-2 bg-gray-100 dark:bg-neutral-700 rounded-lg">
                    Hey! Please show me my latest images from my latest trip.
                </div>
                <div className="second opacity-0 text-sm  text-neutral-800 dark:text-neutral-100 p-2 bg-gray-100 dark:bg-neutral-700 rounded-lg">
                    Sure, here are the latest images from your trip to the island of deez
                    nuts.
                </div>
                <div className="images  grid grid-cols-2 gap-2">
                    <Image
                        src="https://images.unsplash.com/photo-1483683804023-6ccdb62f86ef?q=80&w=2992&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                        alt="island 1"
                        height="200"
                        width="200"
                        className="h-full opacity-0 rounded-lg w-full max-h-[100px] object-cover image"
                    />{" "}
                    <Image
                        src="https://images.unsplash.com/photo-1509233725247-49e657c54213?q=80&w=3449&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                        alt="island 1"
                        height="200"
                        width="200"
                        className="h-full opacity-0 rounded-lg w-full max-h-[100px] object-cover image"
                    />
                    <Image
                        src="https://images.unsplash.com/photo-1473116763249-2faaef81ccda?q=80&w=3592&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                        alt="island 1"
                        height="200"
                        width="200"
                        className="h-full opacity-0 rounded-lg w-full max-h-[100px] object-cover image"
                    />{" "}
                    <Image
                        src="https://images.unsplash.com/photo-1505142468610-359e7d316be0?q=80&w=3070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                        alt="island 1"
                        height="200"
                        width="200"
                        className="h-full opacity-0 rounded-lg w-full max-h-[100px] object-cover image"
                    />
                </div>
            </div>
        </div>
    );
};

export const MobileMockup = ({ className }: { className?: string }) => {
    return (
        <svg
            width="421"
            height="852"
            viewBox="0 0 421 852"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn(
                "text-neutral-900 dark:text-neutral-50 h-full w-full  mx-auto flex-shrink-0 absolute inset-0 object-cover object-top",
                className
            )}
        >
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M73 0H348C386.66 0 418 31.3401 418 70V782C418 820.66 386.66 852 348 852H73C34.3401 852 3 820.66 3 782V70C3 31.3401 34.3401 0 73 0ZM348 6H73C37.6538 6 9 34.6538 9 70V782C9 817.346 37.6538 846 73 846H348C383.346 846 412 817.346 412 782V70C412 34.6538 383.346 6 348 6Z"
                fill="currentColor"
            />
            <rect
                x="318"
                width="10"
                height="6"
                fill="currentColor"
                fillOpacity="0.2"
            />
            <rect
                x="93"
                y="846"
                width="10"
                height="6"
                fill="currentColor"
                fillOpacity="0.2"
            />
            <rect
                x="3"
                y="90"
                width="6"
                height="10"
                fill="currentColor"
                fillOpacity="0.2"
            />
            <rect
                x="412"
                y="90"
                width="6"
                height="10"
                fill="currentColor"
                fillOpacity="0.2"
            />
            <rect
                x="3"
                y="752"
                width="6"
                height="10"
                fill="currentColor"
                fillOpacity="0.2"
            />
            <rect
                x="412"
                y="752"
                width="6"
                height="10"
                fill="currentColor"
                fillOpacity="0.2"
            />
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M417.971 266H418.981C420.096 266 421 266.895 421 268V364C421 365.105 420.096 366 418.981 366H417.971V266Z"
                fill="currentColor"
            />
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M0 302C0 300.895 0.90402 300 2.01918 300H3.02878V363H2.01918C0.90402 363 0 362.105 0 361V302Z"
                fill="currentColor"
            />
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M0 223C0 221.895 0.90402 221 2.01918 221H3.02878V284H2.01918C0.90402 284 0 283.105 0 282V223Z"
                fill="currentColor"
            />
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M0 162C0 160.895 0.90402 160 2.01918 160H3.02878V193H2.01918C0.90402 193 0 192.105 0 191V162Z"
                fill="currentColor"
            />
            <rect
                x="150"
                y="30"
                width="120"
                height="35"
                rx="17.5"
                fill="currentColor"
            />
            <rect
                x="244"
                y="41"
                width="13"
                height="13"
                rx="6.5"
                fill="currentColor"
                fillOpacity="0.1"
            />
        </svg>
    );
};
