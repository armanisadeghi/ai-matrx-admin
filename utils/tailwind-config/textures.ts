// utils/tailwind-config/textures.ts

export const textureUtilities = {
    '.texture-dots': {
        backgroundImage: 'radial-gradient(currentColor 0.2px, transparent 0.2px)',
        backgroundSize: '5px 5px',
    },
    // Variation 1: Larger dots with more spacing
    '.texture-dots-large': {
        backgroundImage: 'radial-gradient(currentColor 0.4px, transparent 0.4px)',
        backgroundSize: '8px 8px',
    },
    // Variation 2: Slightly larger than medium dots
    '.texture-dots-medium-large': {
        backgroundImage: 'radial-gradient(currentColor 0.3px, transparent 0.3px)',
        backgroundSize: '6px 6px',
    },
    // Variation 3: Medium dots (adjusted for better visibility)
    '.texture-dots-medium': {
        backgroundImage: 'radial-gradient(currentColor 0.25px, transparent 0.25px)',
        backgroundSize: '5px 5px',
    },
    // Variation 4: Medium-small dots
    '.texture-dots-medium-small': {
        backgroundImage: 'radial-gradient(currentColor 0.18px, transparent 0.18px)',
        backgroundSize: '4px 4px',
    },
    // Variation 5: Smaller dots (adjusted to improve clarity)
    '.texture-dots-small': {
        backgroundImage: 'radial-gradient(currentColor 0.12px, transparent 0.12px)',
        backgroundSize: '3px 3px',
    },
    // Variation 6: Tiny dots (increased size to reduce blurriness)
    '.texture-dots-tiny': {
        backgroundImage: 'radial-gradient(currentColor 0.08px, transparent 0.08px)',
        backgroundSize: '2px 2px',
    },
    // Variation 7: Ultra-fine dots (slightly increased for visibility)
    '.texture-dots-ultra-fine': {
        backgroundImage: 'radial-gradient(currentColor 0.05px, transparent 0.05px)',
        backgroundSize: '2px 2px',
    },
    // Variation 8: Balanced small-to-medium dots
    '.texture-dots-balanced': {
        backgroundImage: 'radial-gradient(currentColor 0.25px, transparent 0.25px)',
        backgroundSize: '4.5px 4.5px',
    },
    // Variation 9: Tighter mid-size dots (adjusted for better density)
    '.texture-dots-tight': {
        backgroundImage: 'radial-gradient(currentColor 0.22px, transparent 0.22px)',
        backgroundSize: '4px 4px',
    },
    // Variation 10: Superfine dots (increased size for visibility)
    '.texture-dots-superfine': {
        backgroundImage: 'radial-gradient(currentColor 0.04px, transparent 0.04px)',
        backgroundSize: '1.5px 1.5px',
    },
    '.texture-lines': {
        backgroundImage: 'linear-gradient(to right, currentColor 0.5px, transparent 0.5px), linear-gradient(to bottom, currentColor 0.5px, transparent 0.5px)',
        backgroundSize: '20px 20px',
    },
    '.texture-noise': {
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.2\'/%3E%3C/svg%3E")',
    },
    '.texture-noise-1': {
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.2\'/%3E%3C/svg%3E")',
    },
    '.texture-noise-2': {
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'turbulence\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.15\'/%3E%3C/svg%3E")',
    },
    '.texture-noise-3': {
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'1.2\' numOctaves=\'2\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.25\'/%3E%3C/svg%3E")',
    },
    '.texture-noise-4': {
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'turbulence\' baseFrequency=\'0.5\' numOctaves=\'5\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.18\'/%3E%3C/svg%3E")',
    },
    '.texture-noise-5': {
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' seed=\'5\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.22\'/%3E%3C/svg%3E")',
    },
    '.texture-noise-6': {
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'turbulence\' baseFrequency=\'1\' numOctaves=\'4\' seed=\'10\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.2\'/%3E%3C/svg%3E")',
    },
    '.texture-noise-7': {
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.7\' numOctaves=\'5\' seed=\'15\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.17\'/%3E%3C/svg%3E")',
    },
    '.texture-noise-8': {
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'turbulence\' baseFrequency=\'1.5\' numOctaves=\'2\' seed=\'20\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.23\'/%3E%3C/svg%3E")',
    },
    // Subtle square pattern texture from chat background
    '.texture-subtle-squares': {
        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'2\' height=\'2\' viewBox=\'0 0 2 2\'%3E%3Cpath fill=\'%23999\' fill-opacity=\'0.07\' d=\'M1 1h0.5v0.5H1V1z\'%3E%3C/path%3E%3C/svg%3E")',
    },
    // Combined background utilities for common patterns
    '.bg-textured-light': {
        backgroundColor: 'rgb(244 244 245)', // zinc-100
        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'2\' height=\'2\' viewBox=\'0 0 2 2\'%3E%3Cpath fill=\'%23999\' fill-opacity=\'0.07\' d=\'M1 1h0.5v0.5H1V1z\'%3E%3C/path%3E%3C/svg%3E")',
        color: 'rgb(39 39 42)', // gray-800
    },
    '.bg-textured-dark': {
        backgroundColor: 'rgb(39 39 42)', // zinc-850
        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'2\' height=\'2\' viewBox=\'0 0 2 2\'%3E%3Cpath fill=\'%23999\' fill-opacity=\'0.07\' d=\'M1 1h0.5v0.5H1V1z\'%3E%3C/path%3E%3C/svg%3E")',
        color: 'rgb(229 229 229)', // gray-100
    },
    '.bg-textured': {
        '@apply bg-textured-light dark:bg-textured-dark': {},
    },
};

