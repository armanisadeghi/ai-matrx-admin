import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// Reusable filter image component
const FilterImage = ({ src, alt, title }) => {
    const variants = {
        hidden: { opacity: 0, y: 20, transition: { duration: 0.3 } },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    };

    return (
        <motion.div
            variants={variants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center w-1/3 mb-4"
        >
            <img src={src} alt={alt} className="w-24 h-24 rounded-md" />
            <p className="text-center mt-2 text-sm font-medium text-gray-900">{title}</p>
        </motion.div>
    );
};

// Reusable filter category component
const FilterCategory = ({ title, filters }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className="mb-4">
            <button
                onClick={handleToggle}
                className="flex items-center justify-between px-4 py-3 rounded-md text-sm font-medium text-gray-900 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                <div className="flex items-center">
                    <img
                        src="/photo-editor-app/effect/cover/oil painted.jpeg" // Placeholder image
                        alt={title}
                        className="w-8 h-8 rounded-md mr-2"
                    />
                    <span className="ml-2">{title}</span>
                </div>
                <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                    />
                </svg>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        // variants={variants}  // Commented out to stop errors for now but needs to be fixed
                        initial="hidden"
                        animate="visible"
                        className="mt-2 flex flex-wrap justify-center"
                    >
                        {filters.map((filter, index) => (
                            <FilterImage
                                key={index}
                                src={filter.src}
                                alt={filter.alt}
                                title={filter.title}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Example usage:
const Sidebar = () => {
    const filters = [
        // AI Filters
        { category: "AI Filters", filters: [
                {
                    src: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=60',
                    alt: "Anime 1",
                    title: "Anime 1"
                },
                {
                    src: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=60',
                    alt: "American Comic",
                    title: "American Comic"
                },
                {
                    src: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=60',
                    alt: "Fashion Cartoon",
                    title: "Fashion Cartoon"
                },
                // ... (add more filters)
            ]},
        // Scenes
        { category: "Scenes", filters: [
                {
                    src: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=60',
                    alt: "Classic",
                    title: "Classic"
                },
                {
                    src: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=60',
                    alt: "Retro",
                    title: "Retro"
                },
                // ... (add more filters)
            ]},
        // ... (add more filter categories)
    ];

    return (
        <div className="w-full">
            {filters.map((category, index) => (
                <FilterCategory key={index} title={category.category} filters={category.filters} />
            ))}
        </div>
    );
};

export default Sidebar;
