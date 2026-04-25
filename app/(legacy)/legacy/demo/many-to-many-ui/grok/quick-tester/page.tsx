'use client'
import React, { useState } from "react";
import { useCreateManyToMany } from "@/lib/redux/entity/hooks/useCreateManyToMany";
import { RELATIONSHIP_DEFINITIONS } from "@/app/entities/hooks/relationships/relationshipData";

export const aiModelEndpointDef = RELATIONSHIP_DEFINITIONS.aiModelEndpoint;

export default function RelationshipMaker() {
    const [isCreating, setIsCreating] = useState(false);

    const {
        allParentRecordsArray,
        allChildRecordsArray,
        getGroupedChildrenByParent,
        createManyToMany,
    } = useCreateManyToMany(aiModelEndpointDef, {
        onSuccess: (recordId) => {
            console.log('Successfully created relationship:', recordId);
            // Add any additional side effects here that don't involve Redux state
        }
    });

    const { groupedChildren, unassociatedChildren } = getGroupedChildrenByParent;

    const handleCreate = async (parentId: string, childId: string) => {
        setIsCreating(true);
        try {
            await createManyToMany(parentId, childId);
            // No need to setIsCreating(false) here because onSuccess will handle success case
        } catch (error) {
            setIsCreating(false);
            console.error('Create failed:', error);
        } finally {
            // This will run regardless of success or failure
            setIsCreating(false);
        }
    };

    return (
        <div>
            {isCreating && <div>Loading spinner...</div>}

            {allParentRecordsArray.map(parent => {
                const parentRef = parent[aiModelEndpointDef.entityOneField];
                const childRefs = groupedChildren[parentRef] || [];
                const children = childRefs.map(ref => 
                    allChildRecordsArray.find(child => 
                        child[aiModelEndpointDef.entityTwoField] === ref
                    )
                ).filter(Boolean);
                
                return (
                    <div key={parentRef}>
                        <h2>Parent: {parentRef}</h2>
                        <ul>
                            {children.length > 0 ? (
                                children.map(child => (
                                    <li key={child[aiModelEndpointDef.entityTwoField]}>
                                        Child: {child[aiModelEndpointDef.entityTwoField]}
                                    </li>
                                ))
                            ) : (
                                <li>No children found</li>
                            )}
                        </ul>
                    </div>
                );
            })}

            {unassociatedChildren.length > 0 && (
                <div>
                    <h2>Unassociated Children</h2>
                    <ul>
                        {unassociatedChildren.map(childRef => {
                            const child = allChildRecordsArray.find(c => 
                                c[aiModelEndpointDef.entityTwoField] === childRef
                            );
                            return child && (
                                <li key={childRef}>
                                    Child: {child[aiModelEndpointDef.entityTwoField]}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {/* Example button to test creation */}
            <button onClick={() => handleCreate('parentIdExample', 'childIdExample')}>
                Create Relationship
            </button>
        </div>
    );
}