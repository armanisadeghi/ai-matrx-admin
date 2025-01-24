// import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
// import { MatrxRecordId } from '@/types';
// import { transformMatrxText } from '../utils/patternUtils';
// import { UseMessageBrokersHook, useRelatedDataBrokers } from '@/components/playground/hooks/useMessageBrokers';
// import { RelationshipHook } from '@/app/entities/hooks/relationships/useRelationships';
// import { useRecipeMessages } from '@/components/playground/hooks/useRecipeMessages';
// import { v4 as uuidv4 } from 'uuid';

// function generateTemporaryId() {
//   return `new-record-${uuidv4()}`;
// }

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
//     matrxRecordId: MatrxRecordId;
//     role: 'user' | 'assistant' | 'system';
//     order: number;
//     type?: "text" | "base64_image" | "blob" | "image_url" | "other";
//     content?: string;
//     id?: string;
//     recipeId?: string;
//     parentMatrxId?: MatrxRecordId;
//     encodedContent: string;
//     currentDisplay: DisplayMode;
//     displayContent?: string;
//     brokers: DataBrokers[];
//     layout?: LayoutMetadata;
// }

// // Root provider to manage multiple editors
// interface EditorsState {
//     editors: Record<string, EditorState>;
//     orderedIds: string[];  // Keeps track of message order
// }

// interface EditorsContextType {
//     state: EditorsState;
//     createEditor: (messageMatrxId: string, initialContent?: string, messageData?: Partial<EditorState>) => void;
//     removeEditor: (messageMatrxId: string) => void;
//     createRecipeEditors: (relationshipHook: RelationshipHook) => void;
//     addNewSection: () => void;
//     reorderMessages: (sourceIndex: number, destinationIndex: number) => void;
//     getOrderedEditors: () => EditorState[];
// }

// const EditorsContext = createContext<EditorsContextType | null>(null);

// export function EditorsProvider({ children }: { children: React.ReactNode }) {
//     const [state, setState] = useState<EditorsState>({
//         editors: {},
//         orderedIds: []
//     });

//     const getOrderedEditors = useCallback(() => {
//         return state.orderedIds.map(id => state.editors[id]);
//     }, [state.editors, state.orderedIds]);

//     const createEditor = useCallback((
//         messageMatrxId: string,
//         initialContent?: string,
//         messageData?: Partial<EditorState>
//     ) => {
//         setState(prev => {
//             const currentOrder = prev.orderedIds.length;
//             const order = messageData?.order ?? currentOrder + 1;

//             const newState: EditorState = {
//                 matrxRecordId: messageMatrxId,
//                 role: messageData?.role || 'user',
//                 order,
//                 type: messageData?.type || 'text',
//                 content: initialContent || '',
//                 id: messageData?.id,
//                 recipeId: messageData?.recipeId,
//                 parentMatrxId: messageData?.parentMatrxId,
//                 encodedContent: initialContent || '',
//                 currentDisplay: DisplayMode.ENCODED,
//                 displayContent: transformMatrxText(initialContent || '', DisplayMode.ENCODED),
//                 brokers: [],
//                 layout: { position: order, isVisible: true }
//             };

//             const newOrderedIds = [...prev.orderedIds];
//             if (!newOrderedIds.includes(messageMatrxId)) {
//                 newOrderedIds.push(messageMatrxId);
//             }

//             return {
//                 editors: {
//                     ...prev.editors,
//                     [messageMatrxId]: newState
//                 },
//                 orderedIds: newOrderedIds
//             };
//         });
//     }, []);

//     const removeEditor = useCallback((messageMatrxId: string) => {
//         setState(prev => {
//             const newEditors = { ...prev.editors };
//             delete newEditors[messageMatrxId];
            
//             return {
//                 editors: newEditors,
//                 orderedIds: prev.orderedIds.filter(id => id !== messageMatrxId)
//             };
//         });
//     }, []);

//     const createRecipeEditors = useCallback((relationshipHook: RelationshipHook) => {
//         const { messages } = useRecipeMessages(relationshipHook);
        
//         // Clear existing editors before creating new ones
//         setState({ editors: {}, orderedIds: [] });
        
//         messages.forEach((message) => {
//             createEditor(
//                 message.matrxRecordId,
//                 message.content,
//                 message
//             );
//         });
//     }, [createEditor]);

//     const addNewSection = useCallback(() => {
//         const currentEditors = getOrderedEditors();
//         const lastMessage = currentEditors[currentEditors.length - 1];
//         const lastRole = lastMessage?.role || 'system';
//         const nextRole = lastRole === 'user' ? 'assistant' : 'user';

//         const messageMatrxId = generateTemporaryId();
//         createEditor(messageMatrxId, '', {
//             role: nextRole,
//             type: 'text',
//             order: (currentEditors.length + 1)
//         });
//     }, [createEditor, getOrderedEditors]);

//     const reorderMessages = useCallback((sourceIndex: number, destinationIndex: number) => {
//         setState(prev => {
//             const newOrderedIds = [...prev.orderedIds];
//             const [removed] = newOrderedIds.splice(sourceIndex, 1);
//             newOrderedIds.splice(destinationIndex, 0, removed);

//             // Update order numbers in editors
//             const newEditors = { ...prev.editors };
//             newOrderedIds.forEach((id, index) => {
//                 newEditors[id] = {
//                     ...newEditors[id],
//                     order: index + 1
//                 };
//             });

//             return {
//                 editors: newEditors,
//                 orderedIds: newOrderedIds
//             };
//         });
//     }, []);

//     return (
//         <EditorsContext.Provider value={{
//             state,
//             createEditor,
//             removeEditor,
//             createRecipeEditors,
//             addNewSection,
//             reorderMessages,
//             getOrderedEditors
//         }}>
//             {children}
//         </EditorsContext.Provider>
//     );
// }

// export const useEditors = () => {
//     const context = useContext(EditorsContext);
//     if (!context) throw new Error('useEditors must be used within an EditorsProvider');
//     return context;
// };