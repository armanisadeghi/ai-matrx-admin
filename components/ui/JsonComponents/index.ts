// components/ui/JsonComponents/index.tsx

import { JsonViewer, FullJsonViewer, EnhancedJsonViewer, EnhancedJsonViewerGroup } from '@/components/ui/JsonComponents/JsonViewerComponent';
import FullEditableJsonViewer, { EditableJsonViewer } from './JsonEditor';
import SchemaBasedJsonEditor from "./SchemaBasedJsonEditor";
import UniversalJsonGroup, {createJsonComponent} from "./UniversalJsonGroup";


// Default export
// export default MatrxJson;

// Named exports
export {
    JsonViewer,
    FullJsonViewer,
    EditableJsonViewer,
    FullEditableJsonViewer,
    SchemaBasedJsonEditor,
    EnhancedJsonViewer,
    EnhancedJsonViewerGroup,
    UniversalJsonGroup,
    createJsonComponent,
};

// Aliased exports for consistency with previous naming conventions
export const JsonEditor = EditableJsonViewer;
export const SchemaJsonEditor = SchemaBasedJsonEditor;

// // Composite object with all components
// export const MatrxJson = {
//     Viewer: JsonViewer,
//     FullViewer: FullJsonViewer,
//     EnhancedViewer: EnhancedJsonViewer,
//     EnhancedViewerGroup: EnhancedJsonViewerGroup,
//     Editor: EditableJsonViewer,
//     FullEditor: FullEditableJsonViewer,
//     SchemaEditor: SchemaBasedJsonEditor,
//     universalGroup: UniversalJsonGroup,
// };
