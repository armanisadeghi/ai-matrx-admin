// app/(authenticated)/image-editing/page.tsx
"use client";

// Temporarily disabled due to fabric.js/jsdom compatibility issues with Turbopack
// TODO: Re-enable after properly stubbing jsdom for client-side or upgrading fabric.js

export default function HomePage() {
    return (
        <main className="p-8 min-h-screen flex flex-col items-center justify-center">
            <div className="max-w-2xl text-center space-y-4">
                <h1 className="text-3xl font-bold text-foreground">Image Editor</h1>
                <p className="text-muted-foreground">
                    The image editor is temporarily unavailable while we complete the Next.js 16 migration.
                    This feature will be restored shortly.
                </p>
                <p className="text-sm text-muted-foreground">
                    (fabric.js has a dependency on jsdom which is not compatible with Turbopack's client bundling)
                </p>
            </div>
        </main>
    );
}
