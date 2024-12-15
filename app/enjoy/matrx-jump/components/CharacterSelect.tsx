// components/game/CharacterSelect.tsx
'use client';

import React from 'react';
import { Square, Circle, Triangle, Star, Ghost, Bird } from 'lucide-react';
import type { Character } from '../types';

const CHARACTERS: Character[] = [
    {
        icon: Square,
        name: 'Square',
        render: (ctx, x, y, width, height) => {
            ctx.rect(x, y, width, height);
        }
    },
    {
        icon: Circle,
        name: 'Circle',
        render: (ctx, x, y, width, height) => {
            ctx.arc(x + width/2, y + height/2, width/2, 0, Math.PI * 2);
        }
    },
    {
        icon: Triangle,
        name: 'Triangle',
        render: (ctx, x, y, width, height) => {
            ctx.moveTo(x + width/2, y);
            ctx.lineTo(x + width, y + height);
            ctx.lineTo(x, y + height);
            ctx.closePath();
        }
    },
    {
        icon: Star,
        name: 'Star',
        render: (ctx, x, y, width, height) => {
            const spikes = 5;
            const outerRadius = width/2;
            const innerRadius = width/4;
            const centerX = x + width/2;
            const centerY = y + height/2;

            for(let i = 0; i < spikes * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (i * Math.PI) / spikes;
                const pointX = centerX + Math.cos(angle) * radius;
                const pointY = centerY + Math.sin(angle) * radius;

                i === 0 ? ctx.moveTo(pointX, pointY) : ctx.lineTo(pointX, pointY);
            }
            ctx.closePath();
        }
    },
    {
        icon: Ghost,
        name: 'Ghost',
        render: (ctx, x, y, width, height) => {
            ctx.arc(x + width/2, y + height/2, width/2, Math.PI, 0);
            ctx.lineTo(x + width, y + height);
            ctx.arc(x + width*0.75, y + height, width/4, 0, Math.PI);
            ctx.arc(x + width*0.25, y + height, width/4, 0, Math.PI);
            ctx.lineTo(x, y + height/2);
            ctx.closePath();
        }
    },
    {
        icon: Bird,
        name: 'Bird',
        render: (ctx, x, y, width, height) => {
            ctx.ellipse(x + width/2, y + height/2, width/2, height/3, 0, 0, Math.PI * 2);
        }
    }
];

interface CharacterSelectProps {
    onSelect: (character: Character) => void;
}

export const CharacterSelect = ({ onSelect }: CharacterSelectProps) => {
    return (
        <div className="w-full max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Choose Your Character</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {CHARACTERS.map((character) => (
                    <button
                        key={character.name}
                        onClick={() => onSelect(character)}
                        className="p-6 border rounded-lg hover:bg-accent/50
                     flex flex-col items-center gap-2 transition-colors"
                    >
                        <character.icon size={40} />
                        <span className="font-medium">{character.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export { CHARACTERS };
