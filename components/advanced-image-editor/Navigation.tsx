// components/advanced-image-editor/Navigation.tsx

"use client";
import React, { useState } from "react";

import { cn } from "@/lib/utils";
import {HoveredLink, Menu, MenuItem, ProductItem} from "@/components/animated/navbar-menu";

function Navbar({ className }: { className?: string }) {
    const [active, setActive] = useState<string | null>(null);

    // Your editor options with placeholder data
    const editorOptions = [
        {
            title: "Editor",
            description: "A simple yet powerful tool for basic image editing.",
            component: "BasicImageEditor",
            href: "/basic-image-editor",
            src: "/images/basic-image-editor.jpg", // Placeholder image
            subLinks: [
                { title: "Crop Tool", href: "/basic-image-editor/crop-tool" },
                { title: "Resize Tool", href: "/basic-image-editor/resize-tool" },
                // Add more sub-links as needed
            ],
        },
        {
            title: "Advanced",
            description: "A robust editor for more advanced image manipulation.",
            component: "AdvancedImageEditor",
            href: "/advanced-image-editor",
            src: "/images/advanced-image-editor.jpg",
            subLinks: [
                { title: "Layer Management", href: "/advanced-image-editor/layer-management" },
                { title: "Advanced Filters", href: "/advanced-image-editor/advanced-filters" },
                // Add more sub-links as needed
            ],
        },
        {
            title: "Enhanced",
            description: "A feature-rich editor with extended capabilities.",
            component: "ExtendedImageEditor",
            href: "/extended-image-editor",
            src: "/images/extended-image-editor.jpg",
            subLinks: [
                { title: "Batch Processing", href: "/extended-image-editor/batch-processing" },
                { title: "Macros", href: "/extended-image-editor/macros" },
                // Add more sub-links as needed
            ],
        },
        {
            title: "AI Assisted",
            description: "AI-powered old-tools to enhance your image editing workflow.",
            component: "AIImageEditor",
            href: "/ai-image-editor",
            src: "/images/ai-image-editor.jpg",
            subLinks: [
                { title: "Auto Enhance", href: "/ai-image-editor/auto-enhance" },
                { title: "AI Filters", href: "/ai-image-editor/ai-filters" },
                // Add more sub-links as needed
            ],
        },
        {
            title: "Generation",
            description: "Generate new images with the power of AI.",
            component: "ImageGeneration",
            href: "/image-generation",
            src: "/images/image-generation.jpg",
            subLinks: [
                { title: "Style Transfer", href: "/image-generation/style-transfer" },
                { title: "Image Synthesis", href: "/image-generation/image-synthesis" },
                // Add more sub-links as needed
            ],
        },
        {
            title: "Full-Featured",
            description: "The ultimate editor for all image editing needs.",
            component: "FullFeaturedImageEditor",
            href: "/full-featured-image-editor",
            src: "/images/full-featured-image-editor.jpg",
            subLinks: [
                { title: "All Tools", href: "/full-featured-image-editor/all-old-tools" },
                { title: "Custom Workspaces", href: "/full-featured-image-editor/custom-workspaces" },
                // Add more sub-links as needed
            ],
        },
    ];

    return (
        <div
            className={cn("fixed top-10 inset-x-0 max-w-2xl mx-auto z-50", className)}
        >
            <Menu setActive={setActive}>
                {editorOptions.map((editor) => (
                    <MenuItem
                        key={editor.title}
                        setActive={setActive}
                        active={active}
                        item={editor.title}
                    >
                        <div className="text-sm grid grid-cols-2 gap-10 p-4">
                            <ProductItem
                                title={editor.title}
                                href={editor.href}
                                src={editor.src}
                                description={editor.description}
                            />
                            <div className="flex flex-col space-y-4">
                                {editor.subLinks.map((link) => (
                                    <HoveredLink key={link.title} href={link.href}>
                                        {link.title}
                                    </HoveredLink>
                                ))}
                            </div>
                        </div>
                    </MenuItem>
                ))}
            </Menu>
        </div>
    );
}

export default Navbar;
