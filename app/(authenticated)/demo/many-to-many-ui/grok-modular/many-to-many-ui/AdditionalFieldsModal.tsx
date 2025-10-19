"use client";

import React from "react";
import { motion } from "framer-motion";
import { RelationshipMakerConfig } from "./definitions";

interface AdditionalFieldsModalProps {
    config: RelationshipMakerConfig;
    additionalFieldsValues: Record<string, any>;
    setAdditionalFieldsValues: (values: Record<string, any>) => void;
    onSubmit: (data: Record<string, any>) => Promise<void>;
    onClose: () => void;
}

const AdditionalFieldsModal: React.FC<AdditionalFieldsModalProps> = ({
    config,
    additionalFieldsValues,
    setAdditionalFieldsValues,
    onSubmit,
    onClose,
}) => {
    return (
        <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="bg-textured p-6 rounded-lg shadow-xl w-96">
                <h3 className="text-lg font-bold mb-4">Additional Fields</h3>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.target as HTMLFormElement);
                        const data = Object.fromEntries(formData);
                        onSubmit(data).then(() => onClose());
                    }}
                >
                    {config.additionalFieldsConfig?.map(({ field, label, type, options, required }) => (
                        <div key={field} className="mb-4">
                            <label className="block text-sm font-medium">{label || field}</label>
                            {type === "select" ? (
                                <select
                                    name={field}
                                    required={required}
                                    value={additionalFieldsValues[field] || ""}
                                    onChange={(e) =>
                                        setAdditionalFieldsValues({
                                            ...additionalFieldsValues,
                                            [field]: e.target.value,
                                        })
                                    }
                                    className="w-full p-2 rounded-lg bg-gray-200 dark:bg-gray-700"
                                >
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
                                    value={additionalFieldsValues[field] || ""}
                                    onChange={(e) =>
                                        setAdditionalFieldsValues({
                                            ...additionalFieldsValues,
                                            [field]: type === "number" ? Number(e.target.value) : e.target.value,
                                        })
                                    }
                                    className="w-full p-2 rounded-lg bg-gray-200 dark:bg-gray-700"
                                />
                            )}
                        </div>
                    ))}
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded-lg">
                            Cancel
                        </button>
                        <button type="submit" className="px-4 py-2 bg-indigo-500 text-white rounded-lg">
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </motion.div>
    );
};

export default AdditionalFieldsModal;
