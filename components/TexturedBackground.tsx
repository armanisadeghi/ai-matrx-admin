// components/TexturedBackground.tsx

import React from 'react';

type TextureType = 'dots' | 'lines' | 'noise';

interface TexturedBackgroundProps {
    children?: React.ReactNode;
    texture?: TextureType;
    className?: string;
}

const TexturedBackground: React.FC<TexturedBackgroundProps> = ({ children, texture = 'dots', className = '' }) => {
    const textureClass = `texture-${texture}`;

    return (
        <div className={`space-y-8 ${className}`}>
            <div className={`bg-background p-8 rounded-lg ${textureClass}`}>
                <h2 className="text-xl font-semibold mb-4">Default Texture</h2>
                {children}
            </div>

            <div className={`bg-background p-8 rounded-lg md:${textureClass}`}>
                <h2 className="text-xl font-semibold mb-4">Responsive Texture (visible on md and up)</h2>
                {children}
            </div>

            <div className={`bg-background p-8 rounded-lg hover:${textureClass}`}>
                <h2 className="text-xl font-semibold mb-4">Hover Texture</h2>
                {children}
            </div>

            <div className={`bg-background p-8 rounded-lg focus-within:${textureClass}`}>
                <h2 className="text-xl font-semibold mb-4">Focus Texture (click input below)</h2>
                <input type="text" placeholder="Focus me" className="border p-2 rounded" />
            </div>
        </div>
    );
};

export default TexturedBackground;
