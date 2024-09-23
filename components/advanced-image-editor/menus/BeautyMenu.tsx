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
        // Basic
        {
            category: "Basic",
            items: [
                { icon: <svg />, text: "Basic" },
                { icon: <svg />, text: "Blemish Fix" },
                { icon: <svg />, text: "Smoothing" },
                { icon: <svg />, text: "Blush" },
                { icon: <svg />, text: "Size" },
                { icon: <svg />, text: "Apply" },
                { icon: <svg />, text: "Cancel" },
            ],
        },
        // Eyes
        {
            category: "Eyes",
            items: [
                { icon: <svg />, text: "Eye Shadow" },
                { icon: <svg />, text: "Eyeliner" },
                { icon: <svg />, text: "Mascara" },
                { icon: <svg />, text: "Eyebrow Pencil" },
                { icon: <svg />, text: "Eye Tint" },
                // ... (Brush, Erase, Brush Size, Intensity, Brush Intensity, Apply, Cancel) for Eyes
            ],
        },
        // Mouth
        {
            category: "Mouth",
            items: [
                { icon: <svg />, text: "Mouth" },
                { icon: <svg />, text: "Lip Tint" },
                { icon: <svg />, text: "Teeth Whitening" },
                // ... (Brush, Erase, Brush Size, Intensity, Brush Intensity, Apply, Cancel) for Mouth
            ],
        },
        // Other tools
        {
            category: "Other Tools",
            items: [
                { icon: <svg />, text: "Reset the Clone Area" },
                { icon: <svg />, text: "Apply" },
                { icon: <svg />, text: "Cancel" },
            ],
        }
    ];

    // Create a reusable array for Brush, Erase, Brush Size, Intensity, Brush Intensity, Apply, Cancel
    const brushToolItems = [
        { icon: <svg />, text: "Brush" },
        { icon: <svg />, text: "Erase" },
        { icon: <svg />, text: "Brush Size" },
        { icon: <svg />, text: "Intensity" },
        { icon: <svg />, text: "Brush Intensity" },
        { icon: <svg />, text: "Apply" },
        { icon: <svg />, text: "Cancel" },
    ];

    // Add brushToolItems to Eyes and Mouth categories
    editItems[1].items = editItems[1].items.concat(brushToolItems);
    editItems[2].items = editItems[2].items.concat(brushToolItems);

    // Add Fade and Reset the Clone Area to the Eyes category
    editItems[1].items.push({ icon: <svg />, text: "Fade" });
    editItems[1].items.push({ icon: <svg />, text: "Reset the Clone Area" });

    return (
        <div className="w-full">
            {editItems.map((category, index) => (
                <EditCategory key={index} title={category.category} items={category.items} />
            ))}
        </div>
    );
};

export default Sidebar;
