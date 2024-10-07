// app/(authenticated)/tests/tailwind-test/textured-example/hold-hold-page.tsx

import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";


const NoiseTexture = ({ number }: { number: number }) => (
    <div className={`texture-noise-${number} bg-background p-8`}>
        <h2 className="text-2xl font-semibold mb-4">Noise Texture {number}</h2>
        <p>This div uses the noise texture {number} utility directly.</p>
    </div>
);



export default function TexturedExamplePage() {
    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6">Noise Texture Variations</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                    <NoiseTexture key={num} number={num}/>
                ))}
            </div>

            <div className="mt-8">
                <h2 className="text-2xl font-semibold mb-4">Responsive Example</h2>
                <div className="md:texture-noise-1 bg-background p-8">
                    <p>This texture only appears on medium screens and larger.</p>
                </div>
            </div>

            <div className="mt-8">
                <h2 className="text-2xl font-semibold mb-4">Hover Example</h2>
                <div className="hover:texture-noise-2 bg-background p-8 transition duration-300">
                    <p>Hover over this div to see the noise texture appear.</p>
                </div>
            </div>

            <div className="mt-8">
                <h2 className="text-2xl font-semibold mb-4">Focus Example</h2>
                <div className="focus-within:texture-noise-3 bg-background p-8">
                    <p>The noise texture appears when you focus on the input below:</p>
                    <input type="text" placeholder="Focus me" className="mt-2 p-2 border rounded"/>
                </div>
            </div>

        <h1 className="text-3xl font-bold mb-6">Textured Background Examples</h1>

        <div className="texture-dots bg-background p-8 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">Dots Texture</h2>
            <p>This div uses the dots texture utility directly.</p>
        </div>

        <div className="texture-lines bg-background p-8 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">Lines Texture</h2>
            <p>This div uses the lines texture utility directly.</p>
        </div>

        <div className="texture-noise bg-background p-8 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">Noise Texture</h2>
            <p>This div uses the noise texture utility directly.</p>
        </div>

        <div className="md:texture-dots bg-background p-8 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">Responsive Texture (md and up)</h2>
            <p>This texture only appears on medium screens and larger.</p>
        </div>

        <div className="hover:texture-lines bg-background p-8 rounded-lg transition duration-300">
        <h2 className="text-2xl font-semibold mb-4">Hover Texture</h2>
                <p>Hover over this div to see the lines texture appear.</p>
            </div>

            <div className="focus-within:texture-noise bg-background p-8 rounded-lg">
                <h2 className="text-2xl font-semibold mb-4">Focus Texture</h2>
                <p>The noise texture appears when you focus on the input below:</p>
                <input type="text" placeholder="Focus me" className="mt-2 p-2 border rounded" />
            </div>

            <Card className="texture-dots p-4">
                <h3 className="text-lg font-semibold mb-2">Textured Card Component</h3>
                <p className="mb-4">This card uses the dots texture with a shadcn Card component.</p>
                <Button>Click me</Button>
            </Card>
        </div>
    );
}
