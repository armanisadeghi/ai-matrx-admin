'use client';

import { useState } from 'react';

export default function TestTailwindColorsPage() {
  const [isDark, setIsDark] = useState(true);

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Tailwind v4 Color Test</h1>
        <button
          onClick={() => {
            document.documentElement.classList.toggle('dark');
            setIsDark(!isDark);
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Toggle Dark Mode (Currently: {isDark ? 'Dark' : 'Light'})
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Gray & Zinc Colors</h2>
        
        {/* Test 1: White to Zinc-800 */}
        <div className="p-4 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded-lg">
          <p className="text-gray-900 dark:text-gray-100">
            bg-white / dark:bg-zinc-800
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This should be white in light mode, zinc-800 in dark mode
          </p>
        </div>

        {/* Test 2: Gray-100 to Gray-900 */}
        <div className="p-4 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg">
          <p className="text-gray-900 dark:text-gray-100">
            bg-gray-100 / dark:bg-gray-900
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This should switch between gray-100 and gray-900
          </p>
        </div>

        {/* Test 3: Zinc colors */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg">
          <p className="text-zinc-900 dark:text-zinc-100">
            bg-zinc-50 / dark:bg-zinc-900
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Zinc color test
          </p>
        </div>

        <h2 className="text-xl font-semibold mt-8">All Color Families</h2>

        {/* Test each color family */}
        {['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'].map(color => (
          <div
            key={color}
            className={`p-4 rounded-lg border`}
            style={{
              backgroundColor: `var(--color-${color}-50)`,
            }}
          >
            <p className={`font-medium capitalize`}>
              {color}-50 (using CSS variable)
            </p>
            <div className="flex gap-2 mt-2">
              <div className={`w-8 h-8 rounded bg-${color}-100`} title={`${color}-100`} />
              <div className={`w-8 h-8 rounded bg-${color}-200`} title={`${color}-200`} />
              <div className={`w-8 h-8 rounded bg-${color}-300`} title={`${color}-300`} />
              <div className={`w-8 h-8 rounded bg-${color}-400`} title={`${color}-400`} />
              <div className={`w-8 h-8 rounded bg-${color}-500`} title={`${color}-500`} />
              <div className={`w-8 h-8 rounded bg-${color}-600`} title={`${color}-600`} />
              <div className={`w-8 h-8 rounded bg-${color}-700`} title={`${color}-700`} />
              <div className={`w-8 h-8 rounded bg-${color}-800`} title={`${color}-800`} />
              <div className={`w-8 h-8 rounded bg-${color}-900`} title={`${color}-900`} />
            </div>
          </div>
        ))}

        <h2 className="text-xl font-semibold mt-8">Dark Mode Hover Test</h2>
        <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg">
          Hover me (should change on hover)
        </button>

        <h2 className="text-xl font-semibold mt-8">Custom Colors (zinc-750, zinc-850, gray-850)</h2>
        <div className="p-4 bg-zinc-750 rounded-lg">
          <p className="text-white">bg-zinc-750 (custom)</p>
        </div>
        <div className="p-4 bg-zinc-850 rounded-lg">
          <p className="text-white">bg-zinc-850 (custom)</p>
        </div>
        <div className="p-4 bg-gray-850 rounded-lg">
          <p className="text-white">bg-gray-850 (custom)</p>
        </div>
      </div>
    </div>
  );
}

