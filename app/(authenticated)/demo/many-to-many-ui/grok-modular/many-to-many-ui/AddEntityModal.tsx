"use client";

import React from "react";
import { motion } from "framer-motion";
import { EntitySchemaField } from "./definitions";

interface AddEntityModalProps {
    title: string;
    schema: EntitySchemaField[];
    onSubmit: (data: Record<string, any>) => Promise<void>;
    onClose: () => void;
}

const AddEntityModal: React.FC<AddEntityModalProps> = ({ title, schema, onSubmit, onClose }) => {
    return (
        <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-96">
                <h3 className="text-lg font-bold mb-4">{title}</h3>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.target as HTMLFormElement);
                        const data = Object.fromEntries(formData);
                        onSubmit(data).then(() => onClose());
                    }}
                >
                    {schema.map(({ field, label, type, options, required }) => (
                        <div key={field} className="mb-4">
                            <label className="block text-sm font-medium">{label || field}</label>
                            {type === "select" ? (
                                <select name={field} required={required} className="w-full p-2 rounded-lg bg-gray-200 dark:bg-gray-700">
                                    {options?.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type={type}
                                    name={field}
                                    required={required}
                                    className="w-full p-2 rounded-lg bg-gray-200 dark:bg-gray-700"
                                />
                            )}
                        </div>
                    ))}
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </motion.div>
    );
};

export default AddEntityModal;
