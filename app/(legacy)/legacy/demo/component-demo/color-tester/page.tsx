'use client';

import React, { useState } from 'react';

const brokerColors = [
  { light: "bg-red-100", dark: "dark:bg-red-900" },
  { light: "bg-green-100", dark: "dark:bg-green-900" },
  { light: "bg-blue-100", dark: "dark:bg-blue-900" },
  { light: "bg-purple-100", dark: "dark:bg-purple-900" },
  { light: "bg-yellow-100", dark: "dark:bg-yellow-900" },
  { light: "bg-pink-100", dark: "dark:bg-pink-500" },
  { light: "bg-indigo-100", dark: "dark:bg-indigo-900" },
  { light: "bg-orange-100", dark: "dark:bg-orange-900" },
  { light: "bg-teal-100", dark: "dark:bg-teal-900" },
  { light: "bg-cyan-100", dark: "dark:bg-cyan-900" },
  { light: "bg-rose-100", dark: "dark:bg-rose-900" },
  { light: "bg-lime-100", dark: "dark:bg-lime-900" },
  { light: "bg-amber-100", dark: "dark:bg-amber-900" },
  { light: "bg-emerald-100", dark: "dark:bg-emerald-900" },
  { light: "bg-fuchsia-100", dark: "dark:bg-fuchsia-900" },
  { light: "bg-sky-100", dark: "dark:bg-sky-900" },
  { light: "bg-violet-100", dark: "dark:bg-violet-900" },
  { light: "bg-slate-100", dark: "dark:bg-slate-900" },
  { light: "bg-gray-100", dark: "dark:bg-gray-900" },
  { light: "bg-zinc-100", dark: "dark:bg-zinc-900" },
  { light: "bg-neutral-100", dark: "dark:bg-neutral-900" },
  { light: "bg-stone-100", dark: "dark:bg-stone-900" },
  { light: "bg-yellow-200", dark: "dark:bg-yellow-800" },
  { light: "bg-blue-200", dark: "dark:bg-blue-800" },
  { light: "bg-red-200", dark: "dark:bg-red-800" },
];

const getNextAvailableColor = (
  usedColors: Set<string>
): { light: string; dark: string } => {
  const availableColor =
    brokerColors.find((color) => !usedColors.has(color.light)) ||
    brokerColors[Math.floor(Math.random() * brokerColors.length)];
  return availableColor;
};

const BrokerColorButtons = () => {
  const [buttons, setButtons] = useState<
    { light: string; dark: string; id: number }[]
  >([]);
  const usedColors = new Set(buttons.map((btn) => btn.light));

  const addButton = () => {
    const newColor = getNextAvailableColor(usedColors);
    setButtons((prev) => [
      ...prev,
      { ...newColor, id: prev.length + 1 },
    ]);
  };

  return (
    <div className="p-4">
      <button
        onClick={addButton}
        className="mb-4 px-4 py-2 bg-gray-300 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200"
      >
        Add Button
      </button>
      <div className="flex flex-wrap gap-2">
        {buttons.map((button) => (
          <button
            key={button.id}
            className={`px-4 py-2 rounded text-gray-900 dark:text-gray-100 ${button.light} ${button.dark}`}
          >
            Button {button.id}
          </button>
        ))}
      </div>
    </div>
  );
};

export default BrokerColorButtons;
