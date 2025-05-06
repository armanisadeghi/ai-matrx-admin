"use client";

import React, { useState } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { motion } from "framer-motion";
import { useCreateManyToMany } from "@/lib/redux/entity/hooks/useCreateManyToMany";
import { RelationshipMakerConfig } from "./definitions";
import AddEntityModal from "./AddEntityModal";
import ChildColumn from "./ChildColumn";
import ParentColumn from "./ParentColumn";
import AdditionalFieldsModal from "./AdditionalFieldsModal";

interface RelationshipMakerProps {
    config: RelationshipMakerConfig;
}

const RelationshipMaker: React.FC<RelationshipMakerProps> = ({ config }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [childSearch, setChildSearch] = useState("");
    const [parentSearch, setParentSearch] = useState("");
    const [childFilter, setChildFilter] = useState(config.childFilterConfig[0].value);
    const [parentFilter, setParentFilter] = useState(config.parentFilterConfig?.[0]?.value || "");
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
    const [showAddChildModal, setShowAddChildModal] = useState(false);
    const [showAddParentModal, setShowAddParentModal] = useState(false);
    const [showAdditionalFieldsModal, setShowAdditionalFieldsModal] = useState(false);
    const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
    const [selectedChildIdForAdditional, setSelectedChildIdForAdditional] = useState<string | null>(null);
    const [additionalFieldsValues, setAdditionalFieldsValues] = useState<Record<string, any>>({});

    const manyToManyHook = useCreateManyToMany(config.relationshipDef, {
        onSuccess: (recordId) => {
            console.log("Relationship created:", recordId);
        },
    });

    const { allParentRecordsArray, allChildRecordsArray, getGroupedChildrenByParent, createManyToMany, deleteManyToMany } = manyToManyHook;
    // Map parent and child based on config.parentEntity and config.childEntity
    const parents = config.parentEntity === "entityOne" ? allParentRecordsArray : allChildRecordsArray;
    const children = config.childEntity === "entityOne" ? allParentRecordsArray : allChildRecordsArray;

    // Invert groupedChildren for entityTwo as parent
    const groupedChildrenMap =
        config.parentEntity === "entityTwo"
            ? Object.entries(getGroupedChildrenByParent.groupedChildren).reduce((acc, [childId, parentIds]) => {
                  parentIds.forEach((parentId) => {
                      acc[parentId] = acc[parentId] ? [...acc[parentId], childId] : [childId];
                  });
                  return acc;
              }, {} as { [key: string]: string[] })
            : getGroupedChildrenByParent.groupedChildren;

    const mappedParents = parents.map((parent: any) => {
        const childIds = groupedChildrenMap[parent.id] || [];
        const parentChildren = childIds
            .map((childId: string) => {
                const child = children.find((child: any) => child.id === childId);
                return child ? { ...child, additionalFields: {} } : null;
            })
            .filter(Boolean);
        return {
            ...parent,
            [config.childCollectionField]: parentChildren,
        };
    });

    const isLoading = !parents.length || !children.length;

    // Filter functions
    const filterItems = (items: any[], query: string) => {
        if (!query) return items;
        const lowerQuery = query.toLowerCase();
        return items.filter((item) => Object.values(item).some((value) => String(value).toLowerCase().includes(lowerQuery)));
    };

    const filteredChildren = filterItems(children, childSearch).filter((child) =>
        config.childFilterConfig.find((f) => f.value === childFilter)?.filterFn(child, mappedParents)
    );

    const filteredParents = filterItems(mappedParents, parentSearch).filter((parent) =>
        parentFilter
            ? parent[config.childCollectionField].some((m: any) => m.id === parentFilter)
            : config.parentFilterConfig?.find((f) => f.value === parentFilter)?.filterFn(parent, children) ?? true
    );

    const handleCreate = async (parentId: string, childId: string, additionalFields?: Record<string, any>) => {
        setIsCreating(true);
        try {
            const adjustedParentId = config.parentEntity === "entityOne" ? parentId : childId;
            const adjustedChildId = config.childEntity === "entityOne" ? parentId : childId;
            await createManyToMany(adjustedParentId, adjustedChildId, additionalFields);
        } catch (error) {
            console.error("Create failed:", error);
        } finally {
            setIsCreating(false);
            setShowAdditionalFieldsModal(false);
            setAdditionalFieldsValues({});
        }
    };

    const handleDelete = async (parentId: string, childId: string) => {
        setIsCreating(true);
        try {
            const adjustedParentId = config.parentEntity === "entityOne" ? parentId : childId;
            const adjustedChildId = config.childEntity === "entityOne" ? parentId : childId;
            await deleteManyToMany(adjustedParentId, adjustedChildId);
        } catch (error) {
            console.error("Delete failed:", error);
        } finally {
            setIsCreating(false);
        }
    };

    const onDragEnd = (result: DropResult) => {
        const { source, destination } = result;

        if (!destination || isCreating) return;

        const childId = result.draggableId;
        const parentId = destination.droppableId;

        if (source.droppableId === "child-deck" && parentId !== "child-deck") {
            const parent = mappedParents.find((p: any) => p.id === parentId);
            if (parent && !parent[config.childCollectionField].some((m: any) => m.id === childId)) {
                if (config.additionalFieldsConfig?.length) {
                    setSelectedParentId(parentId);
                    setSelectedChildIdForAdditional(childId);
                    const nextOrder = parent[config.childCollectionField].length + 1;
                    setAdditionalFieldsValues({
                        order: nextOrder,
                    });
                    setShowAdditionalFieldsModal(true);
                } else {
                    handleCreate(parentId, childId);
                }
            }
        }
    };

    const removeChildFromParent = (parentId: string, childId: string) => {
        handleDelete(parentId, childId);
    };

    if (isLoading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-200">
                <motion.div
                    className="w-12 h-12 border-4 border-t-indigo-500 border-gray-300 rounded-full animate-spin"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                />
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col md:flex-row bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-200">
            <DragDropContext onDragEnd={onDragEnd}>
                <ChildColumn
                    config={config}
                    children={children}
                    filteredChildren={filteredChildren}
                    childSearch={childSearch}
                    setChildSearch={setChildSearch}
                    childFilter={childFilter}
                    setChildFilter={setChildFilter}
                    selectedChildId={selectedChildId}
                    setSelectedChildId={setSelectedChildId}
                    setShowAddChildModal={setShowAddChildModal}
                    mappedParents={mappedParents}
                    isCreating={isCreating}
                    manyToManyHook={manyToManyHook}
                />
                <ParentColumn
                    config={config}
                    filteredParents={filteredParents}
                    parentSearch={parentSearch}
                    setParentSearch={setParentSearch}
                    parentFilter={parentFilter}
                    setParentFilter={setParentFilter}
                    selectedChildId={selectedChildId}
                    isCreating={isCreating}
                    removeChildFromParent={removeChildFromParent}
                    setShowAddParentModal={setShowAddParentModal}
                />
            </DragDropContext>
            {showAddChildModal && (
                <AddEntityModal
                    title={config.addChildButtonLabel}
                    schema={config.childSchema}
                    onSubmit={config.onCreateChild || (async () => {})}
                    onClose={() => setShowAddChildModal(false)}
                />
            )}
            {showAddParentModal && (
                <AddEntityModal
                    title={config.addParentButtonLabel}
                    schema={config.parentSchema}
                    onSubmit={config.onCreateParent || (async () => {})}
                    onClose={() => setShowAddParentModal(false)}
                />
            )}
            {showAdditionalFieldsModal && config.additionalFieldsConfig && (
                <AdditionalFieldsModal
                    config={config}
                    additionalFieldsValues={additionalFieldsValues}
                    setAdditionalFieldsValues={setAdditionalFieldsValues}
                    onSubmit={(data) => handleCreate(selectedParentId!, selectedChildIdForAdditional!, data)}
                    onClose={() => {
                        setShowAdditionalFieldsModal(false);
                        setAdditionalFieldsValues({});
                    }}
                />
            )}
        </div>
    );
};

export default RelationshipMaker;
