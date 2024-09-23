import React from 'react';

// Reusable button component
const EditItemButton = ({ icon, text, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="flex items-center justify-between px-4 py-3 rounded-md text-sm font-medium text-gray-900 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
            <div className="flex items-center">
                {icon}
                <span className="ml-2">{text}</span>
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
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
            </svg>
        </button>
    );
};

// Reusable category container
const EditCategory = ({ title, items }) => {
    return (
        <div className="mb-4">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
            {items.map((item, index) => (
                <EditItemButton
                    key={index}
                    icon={item.icon}
                    text={item.text}
                    onClick={() => console.log(`Clicked ${item.text}`)} // Placeholder for your button logic
                />
            ))}
        </div>
    );
};

// Example usage:
const Sidebar = () => {
    const editItems = [
        // Smart Tools
        {
            category: "Smart Tools",
            items: [
                { icon: <svg />, text: "1-Tap Enhance" },
                { icon: <svg />, text: "BG Remover" },
                { icon: <svg />, text: "AI Upscaler" },
                { icon: <svg />, text: "Face Unblur" },
            ],
        },
        // Size
        {
            category: "Size",
            items: [
                { icon: <svg />, text: "Crop" },
                { icon: <svg />, text: "Rotate & Flip" },
                { icon: <svg />, text: "Resize" },
            ],
        },
        // Brightness & Color
        {
            category: "Brightness & Color",
            items: [
                { icon: <svg />, text: "Basic Adjust" },
                { icon: <svg />, text: "Color" },
                { icon: <svg />, text: "Invert Colors" },
            ],
        },
        // Advanced Edits
        {
            category: "Advanced Edits",
            items: [
                { icon: <svg />, text: "Structure" },
                { icon: <svg />, text: "Denoise" },
                { icon: <svg />, text: "Film Grain" },
                { icon: <svg />, text: "Mosaic" },
                { icon: <svg />, text: "Blur Background" },
            ],
        },
        // Specialized Edits
        {
            category: "Specialized Edits",
            items: [
                { icon: <svg />, text: "Image Cutout" },
                { icon: <svg />, text: "HSL" },
                { icon: <svg />, text: "Blur" },
            ],
        },
    ];

    return (
        <div className="w-full">
            {editItems.map((category, index) => (
                <EditCategory key={index} title={category.category} items={category.items} />
            ))}
        </div>
    );
};

export default Sidebar;
