import React from 'react';
import { motion } from 'motion/react';

// Reusable AI Tool Image component
const AIToolImage = ({ src, alt, title }) => {
    const variants = {
        hidden: { opacity: 0, y: 20, transition: { duration: 0.5 } },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.2 } },
    };

    return (
        <motion.div
            variants={variants}
            initial="hidden"
            animate="visible"
            className="relative flex flex-col items-center w-1/3 mb-4"
        >
            <img src={src} alt={alt} className="w-24 h-24 rounded-md" />
            <p className="text-center mt-2 text-sm font-medium text-gray-900">{title}</p>
        </motion.div>
    );
};

// Reusable category container
const AICategory = ({ title, tools }) => {
    return (
        <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
            <div className="flex flex-wrap justify-center">
                {tools.map((tool, index) => (
                    <AIToolImage
                        key={index}
                        src={tool.src}
                        alt={tool.alt}
                        title={tool.title}
                    />
                ))}
            </div>
        </div>
    );
};

// Example usage:
const Sidebar = () => {
    const aiTools = [
        // Recommend AI
        {
            category: "Recommend AI",
            tools: [
                {
                    src: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8aW1hZ2UgcHJvY2Vzc2luZyUyMHJldG91Y2h8ZW58MHx8MHx8&auto=format&fit=crop&w=500&q=60',
                    alt: "1-Tap Enhance",
                    title: "1-Tap Enhance"
                },
                {
                    src: 'https://images.unsplash.com/photo-1552343347-260ea4402656?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8aW1hZ2Ugc2NhbGluZyUyMHVwIHJlc29sdXRpb24lMjB0b29scyUyMHNlYXJjaHxlbnwwfHx8fHwy&auto=format&fit=crop&w=500&q=60',
                    alt: "AI Upscaler",
                    title: "AI Upscaler"
                },
                {
                    src: 'https://images.unsplash.com/photo-1575936123452-b67c3263bcce?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8bWFnaWMlMjByZW1vdmVyJTIwaW1hZ2UlMjB0b29scyUyMHNlYXJjaHxlbnwwfHx8fHwy&auto=format&fit=crop&w=500&q=60',
                    alt: "Magic Eraser",
                    title: "Magic Eraser"
                },
                {
                    src: 'https://images.unsplash.com/photo-1624836635614-6f0e833615e8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YmFja2dyb3VuZCUyMHJlbW92ZXIyMHNlYXJjaHxlbnwwfHx8fHwy&auto=format&fit=crop&w=500&q=60',
                    alt: "BG Remover",
                    title: "BG Remover"
                },
                {
                    src: 'https://images.unsplash.com/photo-1581074826129-4339c84b0b24?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8ZmFjZSUyMHVucmJsdXIyMHNlYXJjaHxlbnwwfHx8fHwy&auto=format&fit=crop&w=500&q=60',
                    alt: "Face Unblur",
                    title: "Face Unblur"
                },
                {
                    src: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8c2tpbiUyMHJldG91Y2glMjB0b29scyUyMHNlYXJjaHxlbnwwfHx8fHwy&auto=format&fit=crop&w=500&q=60',
                    alt: "AI Skin Retouch",
                    title: "AI Skin Retouch"
                },
            ],
        },
        // Create with AI
        {
            category: "Create with AI",
            tools: [
                {
                    src: 'https://images.unsplash.com/photo-1622879460699-9a56826b596c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8YWl8ZW58MHx8MHx8&auto=format&fit=crop&w=500&q=60',
                    alt: "AI Image Generator",
                    title: "AI Image Generator"
                },
                {
                    src: 'https://images.unsplash.com/photo-1559954238-5e31980a4310?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8aW1hZ2UlMjBoZWFkc2hvdHxlbnwwfHx8fHwy&auto=format&fit=crop&w=500&q=60',
                    alt: "AI Headshot",
                    title: "AI Headshot"
                },
                {
                    src: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YWl8ZW58MHx8MHx8&auto=format&fit=crop&w=500&q=60',
                    alt: "AI Avatar",
                    title: "AI Avatar"
                },
                {
                    src: 'https://images.unsplash.com/photo-1625150756164-63403c1497a6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Zm90b3N0b3AgZm90b3N8ZW58MHx8MHx8&auto=format&fit=crop&w=500&q=60',
                    alt: "AI Filters",
                    title: "AI Filters"
                },
                {
                    src: 'https://images.unsplash.com/photo-1625582370738-a965c99a2736?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8aW1hZ2UlMjBhcnQlMjBlZmZlY3R8ZW58MHx8MHx8&auto=format&fit=crop&w=500&q=60',
                    alt: "AI Art Effects",
                    title: "AI Art Effects"
                },
                {
                    src: 'https://images.unsplash.com/photo-1628416204383-d09f6d7f009c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YWl8ZW58MHx8MHx8&auto=format&fit=crop&w=500&q=60',
                    alt: "AI Expand",
                    title: "AI Expand"
                },
                {
                    src: 'https://images.unsplash.com/photo-1625501838586-3b44176d4405?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cmVwYWNlJTIwaW1hZ2UlMjB0b29scyUyMHNlYXJjaHxlbnwwfHx8fHwy&auto=format&fit=crop&w=500&q=60',
                    alt: "AI Replace",
                    title: "AI Replace"
                },
                {
                    src: 'https://images.unsplash.com/photo-1500225999755-8284d406753d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cmVzdG9yZSUyMHBob3RvcyUyMHNlYXJjaHxlbnwwfHx8fHwy&auto=format&fit=crop&w=500&q=60',
                    alt: "Old Photo Restorer",
                    title: "Old Photo Restorer"
                },
                {
                    src: 'https://images.unsplash.com/photo-1604014645106-e9b4a3665607?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8Y29sb3JpemUlMjBiJndlcyUyMHBob3RvcyUyMHNlYXJjaHxlbnwwfHx8fHwy&auto=format&fit=crop&w=500&q=60',
                    alt: "Colorize B&W Photo",
                    title: "Colorize B&W Photo"
                },
                {
                    src: 'https://images.unsplash.com/photo-1604014645106-e9b4a3665607?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8dGV4dCUyMHJlbW92ZXIyMHNlYXJjaHxlbnwwfHx8fHwy&auto=format&fit=crop&w=500&q=60',
                    alt: "Text Remover",
                    title: "Text Remover"
                },
                {
                    src: 'https://images.unsplash.com/photo-1625150756164-63403c1497a6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Ymx1ciUyMGJhY2tncm91bmQlMjB0b29scyUyMHNlYXJjaHxlbnwwfHx8fHwy&auto=format&fit=crop&w=500&q=60',
                    alt: "Blur Background",
                    title: "Blur Background"
                },
                {
                    src: 'https://images.unsplash.com/photo-1624836635614-6f0e833615e8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YmFja2dyb3VuZCUyMHJlbW92ZXIyMHNlYXJjaHxlbnwwfHx8fHwy&auto=format&fit=crop&w=500&q=60',
                    alt: "Change Background",
                    title: "Change Background"
                },
                {
                    src: 'https://images.unsplash.com/photo-1622879460699-9a56826b596c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8Y29sb3IlMjBzcGxhc2glMjB0b29scyUyMHNlYXJjaHxlbnwwfHx8fHwy&auto=format&fit=crop&w=500&q=60',
                    alt: "Color Splash",
                    title: "Color Splash"
                },
                {
                    src: 'https://images.unsplash.com/photo-1624836635614-6f0e833615e8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8aGRyJTIwaW1hZ2UlMjB0b29scyUyMHNlYXJjaHxlbnwwfHx8fHwy&auto=format&fit=crop&w=500&q=60',
                    alt: "HDR",
                    title: "HDR"
                },
            ],
        },
    ];

    return (
        <div className="w-full">
            {aiTools.map((category, index) => (
                <AICategory key={index} title={category.category} tools={category.tools} />
            ))}
        </div>
    );
};

export default Sidebar;
