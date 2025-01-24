// // editor/provider.tsx
// import React, { useState, useMemo, useContext, useEffect } from 'react';
// import { useRefManager, useComponentRef, RefMethod } from '@/lib/refs';
// import { EditorContextValue, EditorRef, DocumentState, ChipBlock, TextStyle, TextBlock, ContentBlock } from './types';

// const EditorContext = React.createContext<EditorContextValue | null>(null);

// export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//     const [editors] = useState<Map<string, EditorRef>>(() => new Map());
//     const manager = useRefManager();

//     const value = useMemo<EditorContextValue>(
//         () => ({
//             editors,

//             // Core editor management
//             registerEditor: (id) => {
//                 editors.set(id, {
//                     ref: React.createRef(),
//                     state: { blocks: [], version: 0, lastUpdate: Date.now() },
//                 });
//             },

//             unregisterEditor: (id) => {
//                 const result = editors.delete(id);
//                 return result;
//             },

//             updateState: (id, state) => {
//                 const editor = editors.get(id);
//                 if (editor) {
//                     editors.set(id, { ...editor, state });
//                     manager.broadcast('onEditorStateChange', id, state);
//                 }
//             },

//             getEditor: (id) => editors.get(id),

//             // Content Management
//             getState: (editorId) => editors.get(editorId)?.state,

//             updateContent: (editorId, state) => {
//                 const editor = editors.get(editorId);
//                 if (editor) {
//                     editors.set(editorId, { ...editor, state });
//                 }
//             },

//             insertContent: (editorId, content) => {
//                 const editor = editors.get(editorId);
//                 if (editor) {
//                     const newBlock: TextBlock = {
//                         id: crypto.randomUUID(),
//                         type: 'text',
//                         content,
//                         position: editor.state.blocks.length,
//                     };
//                     const newState = {
//                         ...editor.state,
//                         blocks: [...editor.state.blocks, newBlock],
//                         version: editor.state.version + 1,
//                         lastUpdate: Date.now(),
//                     };
//                     value.updateState(editorId, newState);
//                 }
//             },

//             getFullPlainText: (editorId) => {
//                 const editor = editors.get(editorId);
//                 if (!editor) return '';
//                 return editor.state.blocks
//                     .filter((block) => block.type !== 'lineBreak')
//                     .map((block) => block.content)
//                     .join(' ');
//             },

//             // Selection Management
//             getSelectedText: (editorId) => {
//                 const editor = editors.get(editorId);
//                 if (!editor?.ref.current) return null;
//                 const selection = window.getSelection();
//                 if (!selection?.rangeCount) return null;
//                 return selection.toString();
//             },

//             formatSelection: (editorId, style) => {
//                 // Implementation depends on your editor's specific needs
//             },

//             // Chip Management
//             insertChip: (editorId, chip) => {
//                 const editor = editors.get(editorId);
//                 if (editor) {
//                     const newState = {
//                         ...editor.state,
//                         blocks: [...editor.state.blocks, { ...chip, position: editor.state.blocks.length }],
//                         version: editor.state.version + 1,
//                         lastUpdate: Date.now(),
//                     };
//                     value.updateState(editorId, newState);
//                 }
//             },

//             removeChip: (editorId, chipId) => {
//                 const editor = editors.get(editorId);
//                 if (editor) {
//                     const newState = {
//                         ...editor.state,
//                         blocks: editor.state.blocks.filter((block) => block.id !== chipId),
//                         version: editor.state.version + 1,
//                         lastUpdate: Date.now(),
//                     };
//                     value.updateState(editorId, newState);
//                 }
//             },

//             updateChip: (editorId, chipId, content) => {
//                 const editor = editors.get(editorId);
//                 if (editor) {
//                     const newBlocks = editor.state.blocks.map((block) =>
//                         block.id === chipId && (block.type === 'chip' || block.type === 'text') ? { ...block, content } : block
//                     ) as ContentBlock[];

//                     value.updateState(editorId, {
//                         ...editor.state,
//                         blocks: newBlocks,
//                         version: editor.state.version + 1,
//                         lastUpdate: Date.now(),
//                     });
//                 }
//             },

//             convertToChip: (editorId, chip) => {
//                 value.insertChip(editorId, chip);
//             },

//             linkChipToBroker: (editorId, chipId, brokerId) => {
//                 const editor = editors.get(editorId);
//                 if (editor) {
//                     const newBlocks = editor.state.blocks.map((block) => (block.id === chipId && block.type === 'chip' ? { ...block, brokerId } : block));
//                     value.updateState(editorId, {
//                         ...editor.state,
//                         blocks: newBlocks,
//                         version: editor.state.version + 1,
//                         lastUpdate: Date.now(),
//                     });
//                 }
//             },

//             unlinkChipFromBroker: (editorId, chipId) => {
//                 const editor = editors.get(editorId);
//                 if (editor) {
//                     const newBlocks = editor.state.blocks.map((block) =>
//                         block.id === chipId && block.type === 'chip' ? { ...block, brokerId: undefined } : block
//                     );
//                     value.updateState(editorId, {
//                         ...editor.state,
//                         blocks: newBlocks,
//                         version: editor.state.version + 1,
//                         lastUpdate: Date.now(),
//                     });
//                 }
//             },

//             getChipContent: (editorId, chipId) => {
//                 const editor = editors.get(editorId);
//                 const chip = editor?.state.blocks.find((block) => block.id === chipId && block.type === 'chip') as ChipBlock;
//                 return chip?.content || null;
//             },

//             getChipBrokerId: (editorId, chipId) => {
//                 const editor = editors.get(editorId);
//                 const chip = editor?.state.blocks.find((block) => block.id === chipId && block.type === 'chip') as ChipBlock;
//                 return chip?.brokerId || null;
//             },

//             getChip: (editorId, chipId) => {
//                 const editor = editors.get(editorId);
//                 return (editor?.state.blocks.find((block) => block.id === chipId && block.type === 'chip') as ChipBlock) || null;
//             },

//             // Style Management
//             getActiveStyles: (editorId) => {
//                 const editor = editors.get(editorId);
//                 // Implementation depends on your selection model
//                 return {};
//             },

//             resetStyles: (editorId) => {
//                 const editor = editors.get(editorId);
//                 if (editor) {
//                     const newBlocks = editor.state.blocks.map((block) => ({ ...block, style: undefined }));
//                     value.updateState(editorId, {
//                         ...editor.state,
//                         blocks: newBlocks,
//                         version: editor.state.version + 1,
//                         lastUpdate: Date.now(),
//                     });
//                 }
//             },

//             applyStyle: (editorId, style) => {
//                 const editor = editors.get(editorId);
//                 if (editor) {
//                     const newBlocks = editor.state.blocks.map((block) => {
//                         if (block.type === 'lineBreak') return block;
//                         return {
//                             ...block,
//                             style: { ...block.style, ...style },
//                         };
//                     }) as ContentBlock[];

//                     value.updateState(editorId, {
//                         ...editor.state,
//                         blocks: newBlocks,
//                         version: editor.state.version + 1,
//                         lastUpdate: Date.now(),
//                     });
//                 }
//             },

//             applyStyleToChip: (editorId, chipId, style) => {
//                 const editor = editors.get(editorId);
//                 if (editor) {
//                     const newBlocks = editor.state.blocks.map((block) =>
//                         block.id === chipId && block.type === 'chip' ? { ...block, style: { ...block.style, ...style } } : block
//                     ) as ContentBlock[];

//                     value.updateState(editorId, {
//                         ...editor.state,
//                         blocks: newBlocks,
//                         version: editor.state.version + 1,
//                         lastUpdate: Date.now(),
//                     });
//                 }
//             },

//             applyStyleToSelection: (editorId, style) => {
//                 // to be implemented
//             },
//         }),
//         [editors, manager]
//     );

//     // Register provider methods with ref system
//     const methodsForRefSystem = useMemo(() => {
//         const methods: { [key: string]: RefMethod } = {};

//         // Convert context methods to ref methods
//         Object.entries(value).forEach(([key, method]) => {
//             if (typeof method === 'function') {
//                 methods[key] = method as RefMethod;
//             }
//         });

//         return methods;
//     }, [value]);

//     // Register provider methods with ref system
//     useComponentRef('editorProvider', methodsForRefSystem);

//     return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
// };

// // Hook implementation
// export const useEditor = (id: string) => {
//     const context = useContext(EditorContext);
//     if (!context) throw new Error('useEditor must be used within EditorProvider');

//     useEffect(() => {
//         context.registerEditor(id);
//         return () => {
//             context.unregisterEditor(id);
//         };
//     }, [id, context]);

//     const manager = useRefManager();

//     // Register methods with ref system
//     const methods = useMemo(
//         () => ({
//             getState: () => context.getState(id),
//             updateContent: (state: DocumentState) => context.updateContent(id, state),
//             insertContent: (content: string) => context.insertContent(id, content),
//             getFullPlainText: () => context.getFullPlainText(id),
//             getSelectedText: () => context.getSelectedText(id),
//             formatSelection: (style: Partial<TextStyle>) => context.formatSelection(id, style),
//             insertChip: (chip: ChipBlock) => context.insertChip(id, chip),
//             removeChip: (chipId: string) => context.removeChip(id, chipId),
//             updateChip: (chipId: string, content: string) => context.updateChip(id, chipId, content),
//             convertToChip: (chip: ChipBlock) => context.convertToChip(id, chip),
//             linkChipToBroker: (chipId: string, brokerId: string) => context.linkChipToBroker(id, chipId, brokerId),
//             unlinkChipFromBroker: (chipId: string) => context.unlinkChipFromBroker(id, chipId),
//             getChipContent: (chipId: string) => context.getChipContent(id, chipId),
//             getChipBrokerId: (chipId: string) => context.getChipBrokerId(id, chipId),
//             getChip: (chipId: string) => context.getChip(id, chipId),
//             getActiveStyles: () => context.getActiveStyles(id),
//             resetStyles: () => context.resetStyles(id),
//             applyStyle: (style: Partial<TextStyle>) => context.applyStyle(id, style),
//             applyStyleToSelection: (style: Partial<TextStyle>) => context.applyStyleToSelection(id, style),
//             applyStyleToChip: (chipId: string, style: Partial<TextStyle>) => context.applyStyleToChip(id, chipId, style),
//         }),
//         [context, id]
//     );

//     useComponentRef(id, methods);

//     return {
//         ...context.getEditor(id),
//         ...methods,
//     };
// };
