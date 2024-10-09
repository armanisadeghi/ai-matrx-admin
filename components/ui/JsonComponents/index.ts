// components/ui/JsonComponents/index.ts

import { JsonViewer, FullJsonViewer } from './JsonViewer';
import FullEditableJsonViewer, { EditableJsonViewer } from './JsonEditor';
import SchemaBasedJsonEditor from "./SchemaBasedJsonEditor";

// Composite object with all components
const Json = {
    Viewer: JsonViewer,
    FullViewer: FullJsonViewer,
    Editor: EditableJsonViewer,
    FullEditor: FullEditableJsonViewer,
    SchemaEditor: SchemaBasedJsonEditor,
};

// Default export
export default Json;

// Named exports
export {
    JsonViewer,
    FullJsonViewer,
    EditableJsonViewer,
    FullEditableJsonViewer,
    SchemaBasedJsonEditor
};

// Aliased exports for consistency with previous naming conventions
export const JsonEditor = EditableJsonViewer;
export const SchemaJsonEditor = SchemaBasedJsonEditor;
