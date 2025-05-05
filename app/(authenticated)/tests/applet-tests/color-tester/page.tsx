"use client";

import React from "react";

export default function ColorTesterPage() {
  return (
    <div className="px-8 py-4 space-y-6">
      <h1 className="text-2xl font-bold mb-8">Matrx Applet Colors</h1>

      {/* Main Background Colors */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Background</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ColorBlock 
            name="Page Background" 
            lightClass="bg-white" 
            darkClass="dark:bg-gray-900" 
            usage="Main header background, page container"
          />
          <ColorBlock 
            name="Element/Container Background" 
            lightClass="bg-white" 
            darkClass="dark:bg-gray-800" 
            usage="Field row, popover, search group container"
          />
          <ColorBlock 
            name="Hover Background" 
            lightClass="bg-gray-200 hover:bg-gray-200" 
            darkClass="dark:bg-gray-700 dark:hover:bg-gray-700" 
            usage="Field hover state"
          />
          <ColorBlock 
            name="Header Section BG" 
            lightClass="bg-gray-50" 
            darkClass="dark:bg-gray-700" 
            usage="Used in some header sections"
          />
        </div>
      </section>

      {/* Text Colors */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Text</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextColorBlock 
            name="Primary Text" 
            lightClass="text-gray-900" 
            darkClass="dark:text-gray-100" 
            usage="Field labels, headings"
          />
          <TextColorBlock 
            name="Secondary Text" 
            lightClass="text-gray-500" 
            darkClass="dark:text-gray-400" 
            usage="Descriptions, placeholders, help text"
          />
          <TextColorBlock 
            name="Header Tab Text" 
            lightClass="text-gray-800" 
            darkClass="dark:text-gray-200" 
            usage="Header tab text, field label (some places)"
          />
          <TextColorBlock 
            name="Accent Text" 
            lightClass="text-rose-500" 
            darkClass="dark:text-rose-500" 
            usage="Group headings, accent elements"
          />
          <TextColorBlock 
            name="Button Text" 
            lightClass="text-white" 
            darkClass="dark:text-white" 
            usage="Text in action buttons"
          />
        </div>
      </section>

      {/* Border Colors */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Border</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <BorderColorBlock 
            name="Container Border" 
            lightClass="border-gray-200" 
            darkClass="dark:border-gray-700" 
            usage="Container borders, dividers"
          />
          <BorderColorBlock 
            name="Accent Border" 
            lightClass="border-rose-500" 
            darkClass="dark:border-rose-500" 
            usage="Active tab indicator"
          />
        </div>
      </section>

      {/* Action Button Colors */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Action Button</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ButtonColorBlock 
            name="Primary Button" 
            normalClass="bg-rose-500 text-white" 
            hoverClass="hover:bg-rose-600" 
            darkClass="dark:bg-rose-600 dark:hover:bg-rose-700 dark:text-white" 
            usage="Search action button, primary actions"
          />
        </div>
      </section>

      {/* Shadow Examples */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Shadow Styles</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ShadowBlock 
            name="Container Shadow" 
            shadowClass="shadow-lg" 
            usage="Field row container" 
          />
          <ShadowBlock 
            name="Interactive Shadow" 
            shadowClass="shadow-sm hover:shadow-md" 
            usage="Interactive elements like profile menu" 
            isInteractive={true}
          />
          <ShadowBlock 
            name="Popover Shadow" 
            shadowClass="custom-popover-shadow" 
            usage="Popover containers" 
            customStyle={{
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
            }}
          />
        </div>
      </section>

      {/* Standardized Color Palette */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Standardized Color Palette (Recommended)</h2>
        <div className="space-y-6">
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-2">Background Colors</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <code className="text-sm p-1 bg-gray-100 dark:bg-gray-800 rounded">search-bg-main: bg-white dark:bg-gray-900</code>
              <code className="text-sm p-1 bg-gray-100 dark:bg-gray-800 rounded">search-bg-container: bg-white dark:bg-gray-800</code>
              <code className="text-sm p-1 bg-gray-100 dark:bg-gray-800 rounded">search-bg-hover: hover:bg-gray-200 dark:hover:bg-gray-700</code>
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-2">Text Colors</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <code className="text-sm p-1 bg-gray-100 dark:bg-gray-800 rounded">search-text-primary: text-gray-900 dark:text-gray-100</code>
              <code className="text-sm p-1 bg-gray-100 dark:bg-gray-800 rounded">search-text-secondary: text-gray-500 dark:text-gray-400</code>
              <code className="text-sm p-1 bg-gray-100 dark:bg-gray-800 rounded">search-text-accent: text-rose-500</code>
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-2">Border/Divider Colors</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <code className="text-sm p-1 bg-gray-100 dark:bg-gray-800 rounded">search-border: border border-gray-200 dark:border-gray-700</code>
              <code className="text-sm p-1 bg-gray-100 dark:bg-gray-800 rounded">search-divider: border-r dark:border-gray-700</code>
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-2">Action Button Colors</h3>
            <div className="grid grid-cols-1 gap-2">
              <code className="text-sm p-1 bg-gray-100 dark:bg-gray-800 rounded">search-button: bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white</code>
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-2">Shadow Styles</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <code className="text-sm p-1 bg-gray-100 dark:bg-gray-800 rounded">search-shadow: shadow-lg</code>
              <code className="text-sm p-1 bg-gray-100 dark:bg-gray-800 rounded">search-shadow-interactive: shadow-sm hover:shadow-md</code>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Color block component for background colors
const ColorBlock = ({ name, lightClass, darkClass, usage }) => (
  <div className="border rounded-lg overflow-hidden">
    <div className="p-4 border-b">
      <h3 className="font-medium">{name}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{usage}</p>
    </div>
    <div className={`h-24 ${lightClass} ${darkClass} p-4 flex items-center justify-center`}>
      <div className="bg-white/30 dark:bg-black/30 backdrop-blur-sm p-2 rounded text-sm">
        <code>{lightClass} {darkClass}</code>
      </div>
    </div>
  </div>
);

// Text color block component
const TextColorBlock = ({ name, lightClass, darkClass, usage }) => (
  <div className="border rounded-lg overflow-hidden">
    <div className="p-4 border-b">
      <h3 className="font-medium">{name}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{usage}</p>
    </div>
    <div className="p-4 flex flex-col items-center justify-center space-y-2 bg-white dark:bg-gray-800">
      <p className={`text-lg font-medium ${lightClass} ${darkClass}`}>Sample Text</p>
      <code className="text-sm bg-gray-100 dark:bg-gray-700 p-1 rounded">{lightClass} {darkClass}</code>
    </div>
  </div>
);

// Border color block component
const BorderColorBlock = ({ name, lightClass, darkClass, usage }) => (
  <div className="border rounded-lg overflow-hidden">
    <div className="p-4 border-b">
      <h3 className="font-medium">{name}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{usage}</p>
    </div>
    <div className="p-4 flex flex-col items-center justify-center bg-white dark:bg-gray-800">
      <div className={`w-full h-16 border-2 rounded ${lightClass} ${darkClass} flex items-center justify-center`}>
        <code className="text-sm bg-gray-100 dark:bg-gray-700 p-1 rounded">
          {lightClass} {darkClass}
        </code>
      </div>
    </div>
  </div>
);

// Button color block component
const ButtonColorBlock = ({ name, normalClass, hoverClass, darkClass, usage }) => (
  <div className="border rounded-lg overflow-hidden">
    <div className="p-4 border-b">
      <h3 className="font-medium">{name}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{usage}</p>
    </div>
    <div className="p-6 flex flex-col items-center justify-center bg-white dark:bg-gray-800 space-y-4">
      <button className={`px-4 py-2 rounded-full transition-colors ${normalClass} ${hoverClass} ${darkClass}`}>
        Sample Button
      </button>
      <div className="text-sm">
        <p>Normal: <code className="bg-gray-100 dark:bg-gray-700 p-1 rounded">{normalClass}</code></p>
        <p>Hover: <code className="bg-gray-100 dark:bg-gray-700 p-1 rounded">{hoverClass}</code></p>
        <p>Dark: <code className="bg-gray-100 dark:bg-gray-700 p-1 rounded">{darkClass}</code></p>
      </div>
    </div>
  </div>
);

// Shadow block component
const ShadowBlock = ({ name, shadowClass, usage, isInteractive = false, customStyle = {} }) => (
  <div className="border rounded-lg overflow-hidden">
    <div className="p-4 border-b">
      <h3 className="font-medium">{name}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{usage}</p>
    </div>
    <div className="p-6 flex items-center justify-center bg-white dark:bg-gray-800">
      <div 
        className={`w-32 h-32 rounded-lg bg-white dark:bg-gray-700 flex items-center justify-center ${shadowClass} ${isInteractive ? "transition-shadow" : ""}`}
        style={customStyle}
      >
        <code className="text-sm text-center p-2">{shadowClass}</code>
      </div>
    </div>
  </div>
);
