"use client";
import React from "react";

interface TestTabSectionProps {
  anyText: string;
}

const TestTabSection = ({ anyText }: TestTabSectionProps) => {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border-2 border-gray-300 dark:border-gray-700 shadow-xl">
        {anyText}
      </div>
    </div>
  );
};

export default TestTabSection;