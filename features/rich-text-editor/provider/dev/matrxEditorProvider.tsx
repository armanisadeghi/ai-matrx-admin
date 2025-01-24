// import { MatrxRecordId } from '@/types';
// import { MATRX_PATTERN, parseMatrxMetadata, transformMatrxText } from '../../utils/patternUtils';

// type DataBrokers = {
//     id: MatrxRecordId;
//     name: string;
//     defaultValue?: string;
//     color?: string;
//     status?: 'new' | 'active' | 'archived' | 'deleted' | string;
//     defaultComponent?: string;
//     dataType?: string;
// };

// export enum DisplayMode {
//     ENCODED = 'encoded',
//     ID_ONLY = 'id_only',
//     NAME = 'name',
//     DEFAULT_VALUE = 'default_value',
//     STATUS = 'status',
// }

// export interface LayoutMetadata {
//     position: number;
//     isVisible: boolean;
//     type?: string;
// }

// export interface EditorState {
//     encodedContent: string;
//     currentDisplay: DisplayMode;
//     displayContent?: string;
//     brokers: DataBrokers[];
//     layout?: LayoutMetadata;
// }

// interface EditorInitializationOptions {
//     initialContent?: string;
//     initialState?: EditorState;
//     messageRecordId?: MatrxRecordId;
// }

// // First, let's create a single editor manager
// class MatrxEditorManager {
//     private state: EditorState;

//     constructor(options: EditorInitializationOptions) {
//         if (options.initialState) {
//             this.state = options.initialState;
//         } else if (options.initialContent) {
//             this.state = {
//                 encodedContent: options.initialContent,
//                 currentDisplay: DisplayMode.ENCODED,
//                 displayContent: options.initialContent,
//                 brokers: [],
//                 layout: {
//                     position: 0,
//                     isVisible: true,
//                 },
//             };
//         } else if (options.messageRecordId) {
//             // Case 4: Message record ID provided
//             this.state = {
//                 encodedContent: '',
//                 currentDisplay: DisplayMode.ENCODED,
//                 displayContent: '',
//                 brokers: [],
//                 layout: {
//                     position: 0,
//                     isVisible: true,
//                 },
//             };
//         } else {
//             // Case 1 & 2: No content or encoded content
//             this.state = {
//                 encodedContent: options.initialContent || '',
//                 currentDisplay: DisplayMode.ENCODED,
//                 displayContent: options.initialContent || '',
//                 brokers: [],
//                 layout: {
//                     position: 0,
//                     isVisible: true,
//                 },
//             };
//         }

//         // Process initial content if provided
//         if (options.initialContent) {
//             this.processInitialContent(options.initialContent);
//         }
//     }

//     updateDisplayMode(newMode: DisplayMode) {
//         if (newMode !== this.state.currentDisplay) {
//             this.state.currentDisplay = newMode;
//             this.state.displayContent = transformMatrxText(this.state.encodedContent, newMode);
//         }
//     }

//     // Update encoded content and sync with brokers
//     updateEncodedContent(newContent: string) {
//         this.state.encodedContent = newContent;
//         this.syncBrokersFromEncoded();
//         this.updateDisplayContent();
//     }

//     private syncBrokersFromEncoded() {
//         MATRX_PATTERN.lastIndex = 0;
//         const matches = Array.from(this.state.encodedContent.matchAll(MATRX_PATTERN));
//         const brokersMap = new Map<string, DataBrokers>();

//         // Update existing brokers or add new ones
//         matches.forEach((match) => {
//             const metadata = parseMatrxMetadata(match[1]);
//             if (metadata.id) {
//                 if (!brokersMap.has(metadata.id)) {
//                     const existingBroker = this.state.brokers.find((b) => b.id === metadata.id);
//                     if (existingBroker) {
//                         brokersMap.set(metadata.id, existingBroker);
//                     } else {
//                         brokersMap.set(metadata.id, {
//                             id: metadata.id,
//                             name: metadata.name || '',
//                             defaultValue: metadata.defaultValue,
//                             color: metadata.color,
//                             status: metadata.status as DataBrokers['status'],
//                             defaultComponent: metadata.defaultComponent,
//                             dataType: metadata.dataType,
//                         });
//                     }
//                 }
//             }
//         });

//         this.state.brokers = Array.from(brokersMap.values());
//     }

//     private updateDisplayContent() {
//         this.state.displayContent = transformMatrxText(this.state.encodedContent, this.state.currentDisplay);
//     }

//     getState(): EditorState {
//         return { ...this.state };
//     }
// }

// // Now create the main provider that manages multiple editors
// class MatrxEditorsProvider {
//     private editors: Map<string, MatrxEditorManager>;

//     constructor() {
//         this.editors = new Map();
//     }

//     createEditor(editorId: string, initialState: EditorState) {
//         const editor = new MatrxEditorManager(initialState);
//         this.editors.set(editorId, editor);
//         return editor;
//     }

//     getEditor(editorId: string): MatrxEditorManager | undefined {
//         return this.editors.get(editorId);
//     }

//     updateAllDisplayModes(newMode: DisplayMode) {
//         this.editors.forEach((editor) => {
//             editor.updateDisplayMode(newMode);
//         });
//     }

//     // Get all brokers across all editors
//     getAllBrokers(): DataBrokers[] {
//         const brokersMap = new Map<string, DataBrokers>();

//         this.editors.forEach((editor) => {
//             editor.getState().brokers.forEach((broker) => {
//                 if (!brokersMap.has(broker.id)) {
//                     brokersMap.set(broker.id, broker);
//                 }
//             });
//         });

//         return Array.from(brokersMap.values());
//     }

//     removeEditor(editorId: string) {
//         this.editors.delete(editorId);
//     }
// }
