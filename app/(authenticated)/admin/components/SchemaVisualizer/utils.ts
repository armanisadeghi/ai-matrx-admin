// components/SchemaVisualizer/utils.ts
import { Position } from 'reactflow';
import { SchemaNode, SchemaEdge } from './types';
import { AutomationEntities, AutomationEntity, EntityKeys } from '@/types/entityTypes';

interface Relationship {
    relationshipType: 'foreignKey' | 'inverseForeignKey' | 'manyToMany';
    column: string;
    relatedTable: string;
    relatedColumn: string;
    junctionTable: string | null;
}

export function createNodesAndEdges(schema: AutomationEntities) {
    const nodes: SchemaNode[] = [];
    const edges: SchemaEdge[] = [];

    // Calculate columns based on number of entities
    const numColumns = Math.ceil(Math.sqrt(Object.keys(schema).length));
    const horizontalSpacing = 500; // Increased for more space
    const minVerticalSpacing = 100; // Minimum space between nodes

    // Track vertical positions for each column
    const columnHeights = new Array(numColumns).fill(0);
    const horizontalStagger = 80; // Stagger amount

    // Helper function to calculate approximate node height
    const calculateNodeHeight = (entity: AutomationEntity<EntityKeys>) => {
        const baseHeight = 150; // Base height for header and padding
        const fieldsHeight = Object.keys(entity.entityFields).length * 35;
        const relationshipsHeight = entity.relationships.length * 35;
        return baseHeight + fieldsHeight + relationshipsHeight;
    };

    // Create and position nodes
    Object.entries(schema).forEach(([entityName, entity], index) => {
        const column = index % numColumns;

        // Calculate node height
        const nodeHeight = calculateNodeHeight(entity);

        // Calculate x position with stagger for odd columns
        const xBase = column * horizontalSpacing;
        const xStagger = column % 2 === 0 ? 0 : horizontalStagger;
        const xPos = xBase + xStagger;

        // Calculate y position based on current column height
        const yPos = columnHeights[column];

        // Create the node
        nodes.push({
            id: entityName,
            type: 'schemaNode',
            position: {
                x: xPos,
                y: yPos,
            },
            data: {
                label: entityName,
                entity
            },
            sourcePosition: Position.Bottom,
            targetPosition: Position.Top,
        });

        // Update column height for next node
        columnHeights[column] = yPos + nodeHeight + minVerticalSpacing;
    });

    // Create edges (keeping existing edge creation logic)
    Object.entries(schema).forEach(([entityName, entity]) => {
        if (entity.relationships && Array.isArray(entity.relationships)) {
            (entity.relationships as Relationship[]).forEach((rel, relIndex) => {
                const edgeId = `${entityName}-${rel.relatedTable}-${relIndex}`;
                let edgeStyle = {};

                switch (rel.relationshipType) {
                    case 'foreignKey':
                        edgeStyle = { stroke: '#3b82f6' };
                        break;
                    case 'manyToMany':
                        edgeStyle = { stroke: '#22c55e' };
                        break;
                    case 'inverseForeignKey':
                        edgeStyle = { stroke: '#a855f7' };
                        break;
                }

                edges.push({
                    id: edgeId,
                    source: entityName,
                    target: rel.relatedTable,
                    animated: true,
                    style: edgeStyle,
                    label: rel.relationshipType,
                });
            });
        }
    });

    return { nodes, edges };
}
