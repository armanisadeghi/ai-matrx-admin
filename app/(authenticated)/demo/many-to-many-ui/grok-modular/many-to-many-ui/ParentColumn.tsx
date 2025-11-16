"use client";

import React from "react";
import { Droppable } from "@hello-pangea/dnd";
import { motion, AnimatePresence } from "motion/react";
import { RelationshipMakerConfig } from "./definitions";
import { renderEntityFields } from "./common";
import ChildPill from "./pills/ChildPill";
import ParentItemContextMenu from "./context-menus/ParentItemContextMenu";

interface ParentColumnProps {
    config: RelationshipMakerConfig;
    filteredParents: any[];
    parentSearch: string;
    setParentSearch: (value: string) => void;
    parentFilter: string;
    setParentFilter: (value: string) => void;
    selectedChildId: string | null;
    isCreating: boolean;
    removeChildFromParent: (parentId: string, childId: string) => void;
    setShowAddParentModal: (show: boolean) => void;
}


const ParentColumn: React.FC<ParentColumnProps> = ({
    config,
    filteredParents,
    parentSearch,
    setParentSearch,
    parentFilter,
    setParentFilter,
    selectedChildId,
    isCreating,
    removeChildFromParent,
    setShowAddParentModal,
}) => {
    return (
        <div className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col">
            <div className="sticky top-0 z-10 p-2 bg-gray-100 dark:bg-gray-900 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold">{config.parentLabel} 1</h3>
                    <button
                        onClick={() => setShowAddParentModal(true)}
                        className="px-3 py-1 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                    >
                        {config.addParentButtonLabel}
                    </button>
                </div>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder={`Search ${config.parentLabel.toLowerCase()}...`}
                        value={parentSearch}
                        onChange={(e) => setParentSearch(e.target.value)}
                        className="flex-1 p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <select
                        value={parentFilter}
                        onChange={(e) => setParentFilter(e.target.value)}
                        className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {config.parentFilterConfig?.map(({ label, value }) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-400">
                {isCreating && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                        <motion.div
                            className="w-12 h-12 border-4 border-t-indigo-500 border-gray-300 rounded-xl animate-spin"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        />
                    </div>
                )}
                {filteredParents.map((parent: any) => (
                    <Droppable key={parent.id} droppableId={parent.id}>
                        {(provided, snapshot) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`m-2 rounded-xl border transition-all overflow-hidden bg-white bg-opacity-90 dark:bg-gray-800 dark:bg-opacity-80 backdrop-blur-md ${
                                    snapshot.isDraggingOver && !isCreating
                                        ? "border-indigo-400"
                                        : snapshot.draggingFromThisWith &&
                                          parent[config.childCollectionField].some((m: any) => m.id === snapshot.draggingFromThisWith)
                                        ? "border-yellow-400 opacity-75"
                                        : selectedChildId && parent[config.childCollectionField].some((m: any) => m.id === selectedChildId)
                                        ? "border-cyan-500 shadow-cyan-500/50"
                                        : "border-gray-700 dark:border-gray-700"
                                }`}
                            >
                                <ParentItemContextMenu
                                    parentId={parent.id}
                                    parentData={parent}
                                    childrenCollection={parent[config.childCollectionField]}
                                    config={config}
                                >
                                    <div
                                        className={`p-2 rounded-t-xl ${
                                            selectedChildId && parent[config.childCollectionField].some((m: any) => m.id === selectedChildId)
                                                ? "bg-cyan-100 dark:bg-cyan-900"
                                                : ""
                                        }`}
                                    >
                                        {renderEntityFields(parent, config.parentDisplayConfig)}
                                    </div>
                                </ParentItemContextMenu>
                                <div
                                    className={`min-h-[80px] flex flex-wrap gap-2 p-2 rounded-b-xl ${
                                        parent[config.childCollectionField].length === 0 ? "animate-pulse" : ""
                                    } bg-gray-200 dark:bg-gray-700`}
                                >
                                    <AnimatePresence>
                                        {parent[config.childCollectionField].length === 0 && (
                                            <motion.span
                                                key={`empty-${parent.id}`}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="text-gray-400 p-2"
                                            >
                                                Drop a {config.childLabel.toLowerCase()} here!
                                            </motion.span>
                                        )}
                                        {parent[config.childCollectionField].map((child: any) => (
                                            <ChildPill
                                                key={`${parent.id}-${child.id}`}
                                                childName={child[config.childDisplayConfig.primaryField] || "Unnamed"}
                                                childId={child.id}
                                                childData={child}
                                                order={child.additionalFields?.order}
                                                onRemove={() => removeChildFromParent(parent.id, child.id)}
                                                isDisabled={isCreating}
                                                parentId={parent.id}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                ))}
            </div>
        </div>
    );
};

export default ParentColumn;
