import React from "react";
import { IconHome, IconNewSection } from "@tabler/icons-react";
import { FaBrain, FaImage, FaDatabase } from "react-icons/fa";
import { SiGooglechat } from "react-icons/si";
import { AiFillAudio } from "react-icons/ai";

// Centralized navigation links for use across the application
// This ensures we have a single source of truth for navigation items
export const navigationLinks = [
    {
        label: "Home",
        icon: <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
        href: "/dashboard",
    },
    {
        label: "Chat",
        icon: <SiGooglechat className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
        href: "/chat",
    },
    {
        label: "Cockpit",
        icon: <FaBrain className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
        href: "/ai/cockpit",
    },
    {
        label: "Applets",
        icon: <IconNewSection className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
        href: "/applets",
    },
    {
        label: "Data",
        icon: <FaDatabase className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
        href: "/data",
    },
    {
        label: "Image Search",
        icon: <FaImage className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
        href: "/image-editing/public-image-search",
    },
    {
        label: "Voices",
        icon: <AiFillAudio className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
        href: "/demo/voice/voice-manager",
    },
]; 