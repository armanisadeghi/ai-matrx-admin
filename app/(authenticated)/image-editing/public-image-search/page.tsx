'use client';

import { ResponsiveGallery } from '@/components/image/ResponsiveGallery';

export default function GalleryPage() {
    return (
        <main className="min-h-screen bg-background text-foreground">
            <ResponsiveGallery imageUrls={[]} type="unsplash" />
        </main>
    )
}