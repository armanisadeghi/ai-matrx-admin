"use client";

export default function TestTailwindUtilitiesPage() {
  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Tailwind v4 Utilities Test</h1>
        <button
          onClick={() => document.documentElement.classList.toggle('dark')}
          className="px-4 py-2 bg-blue-500 text-white rounded-md"
        >
          Toggle Dark Mode
        </button>
      </div>

      {/* Border Colors - Default Palette */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Border Colors - Default Palette</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 border-4 border-red-500 bg-white dark:bg-zinc-900">
            <p className="font-medium">border-red-500</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Should be RED</p>
          </div>
          <div className="p-4 border-4 border-blue-500 bg-white dark:bg-zinc-900">
            <p className="font-medium">border-blue-500</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Should be BLUE</p>
          </div>
          <div className="p-4 border-4 border-green-500 bg-white dark:bg-zinc-900">
            <p className="font-medium">border-green-500</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Should be GREEN</p>
          </div>
          <div className="p-4 border-4 border-purple-500 bg-white dark:bg-zinc-900">
            <p className="font-medium">border-purple-500</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Should be PURPLE</p>
          </div>
        </div>
      </section>

      {/* Border Colors - Gray Scale */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Border Colors - Gray Scale</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 border-4 border-gray-200 bg-white dark:bg-zinc-900">
            <p className="font-medium">border-gray-200</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Light gray</p>
          </div>
          <div className="p-4 border-4 border-gray-400 bg-white dark:bg-zinc-900">
            <p className="font-medium">border-gray-400</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Medium gray</p>
          </div>
          <div className="p-4 border-4 border-gray-600 bg-white dark:bg-zinc-900">
            <p className="font-medium">border-gray-600</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Dark gray</p>
          </div>
          <div className="p-4 border-4 border-gray-800 bg-white dark:bg-zinc-900">
            <p className="font-medium">border-gray-800</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Very dark gray</p>
          </div>
        </div>
      </section>

      {/* Border Colors - Theme Variables */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Border Colors - Theme Variables</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 border-4 border-primary bg-white dark:bg-zinc-900">
            <p className="font-medium">border-primary</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Should be blue (--primary)</p>
          </div>
          <div className="p-4 border-4 border-secondary bg-white dark:bg-zinc-900">
            <p className="font-medium">border-secondary</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Should be purple (--secondary)</p>
          </div>
          <div className="p-4 border-4 border-accent bg-white dark:bg-zinc-900">
            <p className="font-medium">border-accent</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Should be accent color</p>
          </div>
        </div>
      </section>

      {/* Background Gradients */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Background Gradients</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-8 bg-gradient-to-r from-red-500 to-blue-500 text-white rounded-lg">
            <p className="font-medium">from-red-500 to-blue-500</p>
            <p className="text-sm">Red to Blue gradient</p>
          </div>
          <div className="p-8 bg-gradient-to-br from-card to-muted rounded-lg">
            <p className="font-medium">from-card to-muted</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Theme gradient</p>
          </div>
          <div className="p-8 bg-gradient-to-r from-primary to-secondary text-white rounded-lg">
            <p className="font-medium">from-primary to-secondary</p>
            <p className="text-sm">Primary to Secondary</p>
          </div>
        </div>
      </section>

      {/* Dark Mode Test */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Dark Mode Variants</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border-4 border-blue-500 dark:border-yellow-500 bg-white dark:bg-zinc-900">
            <p className="font-medium">border-blue-500 dark:border-yellow-500</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Blue in light, Yellow in dark</p>
          </div>
          <div className="p-4 bg-blue-100 dark:bg-blue-900 border-4 border-blue-500 dark:border-blue-400 rounded-lg">
            <p className="font-medium">bg-blue-100 dark:bg-blue-900</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Background changes</p>
          </div>
        </div>
      </section>

      {/* Hover States */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Hover States</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 border-4 border-gray-300 hover:border-red-500 bg-white dark:bg-zinc-900 transition-colors cursor-pointer">
            <p className="font-medium">hover:border-red-500</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Hover me!</p>
          </div>
          <div className="p-4 border-4 border-gray-300 hover:border-green-500 bg-white dark:bg-zinc-900 transition-colors cursor-pointer">
            <p className="font-medium">hover:border-green-500</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Hover me!</p>
          </div>
          <div className="p-4 border-4 border-gray-300 hover:border-purple-500 bg-white dark:bg-zinc-900 transition-colors cursor-pointer">
            <p className="font-medium">hover:border-purple-500</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Hover me!</p>
          </div>
        </div>
      </section>

      {/* Browser Info */}
      <section className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-500 rounded-lg">
        <h3 className="font-semibold mb-2">Instructions:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Check if border colors display correctly</li>
          <li>Toggle dark mode and verify colors switch</li>
          <li>Hover over the hover test boxes</li>
          <li>Open browser DevTools and inspect elements to see computed styles</li>
          <li>If borders are gray instead of colored, there's still an issue</li>
        </ul>
      </section>
    </div>
  );
}

