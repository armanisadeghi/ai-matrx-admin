import { RELATIONSHIP_DEFINITIONS } from "@/app/entities/hooks/relationships/relationshipData";
import { RelationshipDefinition } from "@/types/relationshipTypes";

export interface EntityDisplayField {
    field: string;
    label?: string;
    format?: (value: any) => string;
}

export interface EntityDisplayConfig {
    primaryField: string;
    fallbackPrimary?: string;
    secondaryFields?: EntityDisplayField[];
}

export interface FilterConfig {
    label: string;
    value: string;
    filterFn: (item: any, relatedItems: any[]) => boolean;
}

export interface EntitySchemaField {
    field: string;
    label?: string;
    type: "text" | "number" | "select";
    options?: { value: string; label: string }[];
    required?: boolean;
}

export interface AdditionalFieldConfig {
    field: string;
    label?: string;
    type: "text" | "number" | "select";
    options?: { value: string; label: string }[];
    required?: boolean;
}

export interface ThemeConfig {
    childCardClass?: string;
    parentCardClass?: string;
    childGradient?: string;
    parentGradient?: string;
}

export interface RelationshipMakerConfig {
    relationshipDef: RelationshipDefinition;
    parentEntity: "entityOne" | "entityTwo";
    childEntity: "entityOne" | "entityTwo";
    childLabel: string;
    parentLabel: string;
    addChildButtonLabel: string;
    addParentButtonLabel: string;
    childDisplayConfig: EntityDisplayConfig;
    parentDisplayConfig: EntityDisplayConfig;
    childFilterConfig: FilterConfig[];
    parentFilterConfig?: FilterConfig[];
    childSchema: EntitySchemaField[];
    parentSchema: EntitySchemaField[];
    additionalFieldsConfig?: AdditionalFieldConfig[];
    childCollectionField: string; // e.g., "models" or "messages"
    theme?: ThemeConfig;
    onCreateChild?: (data: Record<string, any>) => Promise<void>;
    onCreateParent?: (data: Record<string, any>) => Promise<void>;
}

const truncateText = (text: string, maxLength: number = 100) =>
    text ? (text.length > maxLength ? `${text.slice(0, maxLength)}...` : text) : "";

export const aiModelEndpointConfig: RelationshipMakerConfig = {
  relationshipDef: RELATIONSHIP_DEFINITIONS.aiModelEndpoint,
  parentEntity: "entityOne", // aiEndpoint
  childEntity: "entityTwo", // aiModel
  childLabel: "AI Models",
  parentLabel: "Providers",
  addChildButtonLabel: "Add Model",
  addParentButtonLabel: "Add Provider",
  childCollectionField: "models",
  childDisplayConfig: {
    primaryField: "commonName",
    fallbackPrimary: "name",
    secondaryFields: [
      { field: "modelClass" },
      { field: "contextWindow", label: "Context Window", format: (v) => `${v}` },
      { field: "maxTokens", label: "Max Tokens", format: (v) => v.toLocaleString() },
      { field: "capabilities", label: "Capabilities" },
    ],
  },
  parentDisplayConfig: {
    primaryField: "name",
    fallbackPrimary: "Unnamed Provider",
    secondaryFields: [
      { field: "companyDescription", format: (v) => truncateText(v) },
    ],
  },
  childFilterConfig: [
    {
      label: "All",
      value: "All",
      filterFn: () => true,
    },
    {
      label: "Unassociated",
      value: "Unassociated",
      filterFn: (model, providers) =>
        providers.filter((p: any) => p.models.some((m: any) => m.id === model.id)).length === 0,
    },
    {
      label: "1+ Matches",
      value: "1+ Matches",
      filterFn: (model, providers) =>
        providers.filter((p: any) => p.models.some((m: any) => m.id === model.id)).length > 0,
    },
  ],
  parentFilterConfig: [
    {
      label: "All Models",
      value: "",
      filterFn: () => true,
    },
  ],
  childSchema: [
    { field: "commonName", label: "Common Name", type: "text", required: true },
    { field: "name", label: "Name", type: "text", required: true },
    { field: "modelClass", label: "Model Class", type: "text" },
    { field: "contextWindow", label: "Context Window", type: "number" },
    { field: "maxTokens", label: "Max Tokens", type: "number" },
    { field: "capabilities", label: "Capabilities", type: "text" },
  ],
  parentSchema: [
    { field: "name", label: "Name", type: "text", required: true },
    { field: "companyDescription", label: "Company Description", type: "text" },
  ],
  additionalFieldsConfig: [],
  theme: {
    childGradient: "from-purple-400 to-indigo-500 dark:from-purple-600 dark:to-indigo-700",
    parentGradient: "from-cyan-400 to-teal-500 dark:from-cyan-600 dark:to-teal-700",
  },
  onCreateChild: async (data) => {
    console.log("Creating child:", data);
  },
  onCreateParent: async (data) => {
    console.log("Creating parent:", data);
  },
};


export const recipeMessageConfig: RelationshipMakerConfig = {
  relationshipDef: RELATIONSHIP_DEFINITIONS.recipeMessage,
  parentEntity: "entityTwo", // recipe
  childEntity: "entityOne", // messageTemplate
  childLabel: "Messages",
  parentLabel: "Recipes",
  addChildButtonLabel: "Add Message",
  addParentButtonLabel: "Add Recipe",
  childCollectionField: "messages",
  childDisplayConfig: {
    primaryField: "role",
    fallbackPrimary: "Message Without Role",
    secondaryFields: [
      { field: "content", label: "Content" },
      { field: "type", label: "Type" },
    ],
  },
  parentDisplayConfig: {
    primaryField: "name",
    fallbackPrimary: "Unnamed Recipe",
    secondaryFields: [
      { field: "description", format: (v) => truncateText(v) },
    ],
  },
  childFilterConfig: [
    {
      label: "All",
      value: "All",
      filterFn: () => true,
    },
    {
      label: "Unassociated",
      value: "Unassociated",
      filterFn: (child, parents) =>
        parents.filter((p: any) => p.messages.some((m: any) => m.id === child.id)).length === 0,
    },
    {
      label: "1+ Matches",
      value: "1+ Matches",
      filterFn: (child, parents) =>
        parents.filter((p: any) => p.messages.some((m: any) => m.id === child.id)).length > 0,
    },
  ],
  parentFilterConfig: [
    {
      label: "All Messages",
      value: "",
      filterFn: () => true,
    },
  ],
  childSchema: [
    { field: "content", label: "Content", type: "text", required: true },
    {
      field: "role",
      label: "Role",
      type: "select",
      options: [
        { value: "user", label: "User" },
        { value: "system", label: "System" },
        { value: "assistant", label: "Assistant" },
      ],
      required: true,
    },
    {
      field: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "text", label: "Text" },
      ],
      required: true,
    },
  ],
  parentSchema: [
    { field: "name", label: "Name", type: "text", required: true },
    { field: "description", label: "Description", type: "text" },
  ],
  additionalFieldsConfig: [
    {
      field: "order",
      label: "Order",
      type: "number",
      required: true,
    },
  ],
  theme: {
    childGradient: "from-blue-400 to-green-500 dark:from-blue-600 dark:to-green-700",
    parentGradient: "from-orange-400 to-red-500 dark:from-orange-600 dark:to-red-700",
  },
  onCreateChild: async (data) => {
    console.log("Creating message:", data);
  },
  onCreateParent: async (data) => {
    console.log("Creating recipe:", data);
  },
};