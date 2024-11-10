'use client';

import { useState } from 'react';

import { Button } from "@/components/ui/button";
import DynamicModal from "@/components/ui/added-my/DynamicModal";

export default function Home() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="p-8">
            <Button onClick={() => setIsModalOpen(true)}>Open Modal</Button>
            <DynamicModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
}
