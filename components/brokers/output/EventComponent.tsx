"use client";

import React from "react";
import TableRenderer from "./TableRenderer";

type SectionItem = {
    name: string;
    description?: string;
};
export type TableData = {
  headers: string[];
  rows: string[][];
};

type Section = {
    title: string;
    items: SectionItem[];
};

type TableEntry = {
  title: string;
  data: TableData;
};

type Props = {
  sections: Section[];
  tables: TableEntry[];
};

const EventComponent: React.FC<Props> = ({ sections, tables }) => {
    return (
        <div className="w-full p-6">
            {/* Responsive Grid System */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                {sections.map((section) => (
                    <div
                        key={section.title}
                        className="bg-gradient-to-br from-pink-50 to-cyan-50 dark:from-pink-950 dark:to-cyan-950 border-2 border-pink-200 dark:border-pink-800 shadow-lg rounded-xl p-4"
                    >
                        <h2 className="text-lg font-bold bg-gradient-to-r from-pink-500 to-cyan-400 dark:from-pink-400 dark:to-cyan-300 bg-clip-text text-transparent">
                            {section.title}
                        </h2>
                        <ul className="mt-4 space-y-3">
                            {section.items.map((item) => (
                                <li
                                    key={item.name}
                                    className="p-3 rounded-lg bg-white dark:bg-black/20 shadow-sm border border-pink-100 dark:border-pink-700 hover:scale-[1.02] transition-transform duration-200"
                                >
                                    <h3 className="text-md font-semibold text-pink-700 dark:text-pink-300">{item.name}</h3>
                                    {item.description && <p className="text-gray-700 dark:text-gray-300 mt-1 text-sm">{item.description}</p>}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
                {tables.map((table) => (
                    <TableRenderer key={table.title} table={table} />
                ))}
            </div>
        </div>
    );
};

export default EventComponent;
