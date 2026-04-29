// features/administration/schema-visualizer/types.ts
// Re-exports the standalone schema-visualizer types so existing imports keep
// working. New code should import directly from `./types-standalone`.

export type {
    SchemaColumn,
    SchemaRelationship,
    SchemaTable,
    SchemaOverview,
    SelectedElementType,
    SelectedElement,
    SchemaNodeData,
    StandaloneSchemaNode as SchemaNode,
    StandaloneSchemaEdge as SchemaEdge,
} from "./types-standalone";
