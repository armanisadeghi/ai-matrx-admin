import React from "react";

export type TableData = {
  headers: string[];
  rows: string[][];
};

type TableEntry = {
  title: string;
  data: TableData;
};

type Props = {
  table: TableEntry;
};

const TableRenderer: React.FC<Props> = ({ table }) => {
  return (
    <div className="bg-gradient-to-br from-pink-50 to-cyan-50 dark:from-pink-950 dark:to-cyan-950 border-2 border-pink-200 dark:border-pink-800 shadow-lg rounded-xl p-5 overflow-x-auto">
      <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-cyan-400 dark:from-pink-400 dark:to-cyan-300 bg-clip-text text-transparent mb-4">
        {table.title}
      </h2>
      <table className="w-full border-collapse border border-pink-300 dark:border-pink-700 text-gray-800 dark:text-gray-200">
        <thead className="bg-pink-200 dark:bg-pink-700">
          <tr>
            {table.data.headers.map((header, index) => (
              <th
                key={index}
                className="border border-pink-300 dark:border-pink-700 px-4 py-2 font-semibold text-left"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.data.rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={`${
                rowIndex % 2 === 0 ? "bg-pink-100 dark:bg-pink-800" : "bg-white dark:bg-black/20"
              }`}
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="border border-pink-300 dark:border-pink-700 px-4 py-2"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableRenderer;
