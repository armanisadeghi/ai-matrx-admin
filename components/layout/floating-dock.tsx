'use client';

import React from "react";
import {FloatingDock} from "@/components/ui/floating-dock";
import {IconHome, IconNewSection,} from "@tabler/icons-react";
import {FaBrain, FaImage} from "react-icons/fa";
import {SiGooglechat} from "react-icons/si";
import {AiFillAudio} from "react-icons/ai";
import {MdOutlineVideoChat} from "react-icons/md";


export function MatrixFloatingMenu() {
    const links = [
        {
            title: "Home",
            icon: (
                <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300"/>
            ),
            href: "#",
        },

        {
            title: "AI Apps",
            icon: (
                <FaBrain className="h-full w-full text-neutral-500 dark:text-neutral-300"/>
            ),
            href: "#",
        },
        {
            title: "Components",
            icon: (
                <IconNewSection className="h-full w-full text-neutral-500 dark:text-neutral-300"/>
            ),
            href: "#",
        },
        {
            title: "Chat",
            icon: (
                <SiGooglechat className="h-full w-full text-neutral-500 dark:text-neutral-300"/>
            ),
            href: "#",
        },
        {
            title: "Image Generation",
            icon: (
                <FaImage className="h-full w-full text-neutral-500 dark:text-neutral-300"/>
            ),
            href: "#",
        },

        {
            title: "Voice Assistant",
            icon: (
                <AiFillAudio className="h-full w-full text-neutral-500 dark:text-neutral-300"/>
            ),
            href: "#",
        },
        {
            title: "Video Meetings",
            icon: (
                <MdOutlineVideoChat className="h-full w-full text-neutral-500 dark:text-neutral-300"/>
            ),
            href: "#",
        },
    ];
    return (
        <div className="flex items-center justify-center w-auto mt-[1rem]">
            <FloatingDock items={links}/>
        </div>
    );
}
