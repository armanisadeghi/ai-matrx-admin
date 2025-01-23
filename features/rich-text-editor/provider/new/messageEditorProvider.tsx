// import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
// import { MatrxRecordId } from '@/types';
// import { MATRX_PATTERN, parseMatrxMetadata, transformMatrxText } from '../../utils/patternUtils';
// import { UseMessageBrokersHook, useRelatedDataBrokers } from '@/components/playground/hooks/useMessageBrokers';
// import { RelationshipHook, useJoinedActiveParent } from '@/app/entities/hooks/relationships/useRelationships';
// import { useRecipeMessages, UseRecipeMessagesHook } from '@/components/playground/hooks/useRecipeMessages';
// import { v4 as uuidv4 } from 'uuid';
// import MessagesContainer from './MessagesContainer';
// import { createRelationshipDefinition } from '@/app/entities/hooks/relationships/definitionConversionUtil';

// function generateTemporaryId() {
//     const uniqueId = uuidv4();
//     return `new-record-${uniqueId}`;
// }

// type DataBrokers = {
//     matrxRecordId: MatrxRecordId;
//     name: string;
//     defaultValue?: string;
//     color?: string;
//     status?: 'new' | 'active' | 'archived' | 'deleted' | string;
//     defaultComponent?: string;
//     dataType?: string;
//     id: MatrxRecordId;
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
//     role: 'user' | 'assistant' | 'system' | string;
//     order: number;
//     type?: 'text' | 'base64_image' | 'blob' | 'image_url' | 'other' | string;
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

// class MatrxEditorManager {
//     private state: EditorState;
//     private brokerHook?: UseMessageBrokersHook;

//     constructor(initialState: EditorState, brokerHook?: UseMessageBrokersHook) {
//         this.state = { ...initialState }; // Create a copy
//         this.brokerHook = brokerHook;
//     }

//     updateDisplayMode(newMode: DisplayMode): EditorState {
//         if (newMode !== this.state.currentDisplay) {
//             this.state = {
//                 ...this.state,
//                 currentDisplay: newMode,
//                 displayContent: transformMatrxText(this.state.encodedContent, newMode),
//             };
//         }
//         return { ...this.state };
//     }

//     updateEncodedContent(newContent: string): EditorState {
//         this.state = {
//             ...this.state,
//             encodedContent: newContent,
//             content: newContent,
//             displayContent: transformMatrxText(newContent, this.state.currentDisplay),
//         };
//         this.syncBrokersFromEncoded();
//         return { ...this.state };
//     }

//     private syncBrokersFromEncoded() {
//         MATRX_PATTERN.lastIndex = 0;
//         const matches = Array.from(this.state.encodedContent.matchAll(MATRX_PATTERN));
//         const brokersMap = new Map<MatrxRecordId, DataBrokers>();

//         matches.forEach((match) => {
//             const metadata = parseMatrxMetadata(match[1]);
//             if (metadata.id) {
//                 if (!brokersMap.has(metadata.id)) {
//                     const existingBroker = this.state.brokers.find((b) => b.id === metadata.id);
//                     if (existingBroker) {
//                         brokersMap.set(metadata.id, existingBroker);
//                     } else {
//                         const newBroker: DataBrokers = {
//                             matrxRecordId: metadata.id,
//                             id: metadata.id,
//                             name: metadata.name || '',
//                             defaultValue: metadata.defaultValue,
//                             color: metadata.color,
//                             status: metadata.status as DataBrokers['status'],
//                             defaultComponent: metadata.defaultComponent,
//                             dataType: metadata.dataType,
//                         };
//                         brokersMap.set(metadata.id, newBroker);
//                     }
//                 }
//             }
//         });

//         this.state = {
//             ...this.state,
//             brokers: Array.from(brokersMap.values()),
//         };
//     }

//     getState(): EditorState {
//         return { ...this.state };
//     }
// }

// interface EditorContextType {
//     state: EditorState;
//     updateDisplayMode: (mode: DisplayMode) => void;
//     updateEncodedContent: (content: string) => void;
//     syncState: () => Promise<void>;
//     brokerHook: UseMessageBrokersHook;
// }

// const EditorContext = createContext<EditorContextType | null>(null);

// // EditorProvider - Single Message Instance
// interface EditorProviderProps {
//     children: React.ReactNode;
//     messageMatrxId?: MatrxRecordId;
//     initialContent?: string;
//     initialState?: EditorState;
// }

// export function EditorProvider({ children, messageMatrxId, initialContent, initialState }: EditorProviderProps) {
//     const [editorManager] = useState<MatrxEditorManager>(() => {
//         const defaultState: EditorState = {
//             matrxRecordId: messageMatrxId || generateTemporaryId(),
//             role: 'user',
//             order: 0,
//             type: 'text',
//             encodedContent: '',
//             currentDisplay: DisplayMode.ENCODED,
//             displayContent: '',
//             brokers: [],
//             layout: { position: 0, isVisible: true },
//         };

//         const initialEditorState = initialState || defaultState;
//         if (initialContent) {
//             initialEditorState.content = initialContent;
//             initialEditorState.encodedContent = initialContent;
//             initialEditorState.displayContent = transformMatrxText(initialContent, DisplayMode.ENCODED);
//         }

//         return new MatrxEditorManager(initialEditorState);
//     });

//     const [state, setState] = useState<EditorState>(editorManager.getState());
//     const brokerHook = useRelatedDataBrokers(messageMatrxId);

//     useEffect(() => {
//         if (brokerHook.messageBrokerIsLoading) return;
//         const newState = editorManager.getState();
//         newState.brokers = brokerHook.processedDataBrokers as DataBrokers[];
//         setState(newState);
//     }, [brokerHook.processedDataBrokers]);

//     const updateDisplayMode = useCallback(
//         (newMode: DisplayMode) => {
//             const newState = editorManager.updateDisplayMode(newMode);
//             setState(newState);
//         },
//         [editorManager]
//     );

//     const updateEncodedContent = useCallback(
//         (newContent: string) => {
//             const newState = editorManager.updateEncodedContent(newContent);
//             setState(newState);
//         },
//         [editorManager]
//     );

//     const syncState = useCallback(async () => {
//         if (!messageMatrxId) return;

//         try {
//             await Promise.all(
//                 state.brokers.map((broker) =>
//                     brokerHook.addDataBroker(broker.id, {
//                         name: broker.name,
//                         defaultValue: broker.defaultValue,
//                         color: broker.color,
//                     })
//                 )
//             );
//         } catch (error) {
//             console.error('Failed to sync editor state:', error);
//             throw error;
//         }
//     }, [messageMatrxId, state.brokers, brokerHook.addDataBroker]);

//     return (
//         <EditorContext.Provider
//             value={{
//                 state,
//                 updateDisplayMode,
//                 updateEncodedContent,
//                 syncState,
//                 brokerHook,
//             }}
//         >
//             {children}
//         </EditorContext.Provider>
//     );
// }

// // EditorsProvider - Recipe Level Management
// interface EditorsState {
//     editors: Record<string, EditorState>;
//     orderedIds: string[];
// }

// interface EditorsContextType {
//     editors: Record<string, EditorState>;
//     orderedIds: string[];
//     canProceed: boolean;
//     createRecipeEditors: () => void;
//     removeEditor: (messageMatrxId: string, ) => void;
//     addNewSection: () => void;
//     reorderMessages: (draggedId: MatrxRecordId, dropTargetId: MatrxRecordId) => void;
//     renderMessageContainer: () => React.ReactNode;
// }

// const EditorsContext = createContext<EditorsContextType | null>(null);

// export const recipeMessageDef = createRelationshipDefinition({
//     relationshipKey: 'recipeMessage',
//     parent: 'recipe',
//     child: 'messageTemplate',
//     orderField: 'order',
// });

// export function EditorsProvider({ children }: { children: React.ReactNode }) {
//     const [editors, setEditors] = useState<Record<string, EditorState>>({});
//     const [orderedIds, setOrderedIds] = useState<string[]>([]);
//     const [canProceed, setCanProceed] = useState(false);

//     const { relationshipHook } = useJoinedActiveParent(recipeMessageDef);
//     const { messages, addMessage, handleDragDrop, messageMatrxIds, deleteMessage, recipeMessageIsLoading } = useRecipeMessages(relationshipHook);

//     useEffect(() => {
//         if (recipeMessageIsLoading) return;

//         if (!recipeMessageIsLoading && messages.length > 0) {
//             createRecipeEditors();
//         }
//     }, [recipeMessageIsLoading, messages.length]);

//     useEffect(() => {
//         if (recipeMessageIsLoading) return;

//         if (!recipeMessageIsLoading && orderedIds.length > 0) {
//             setCanProceed(true);
//         }
//     }, [recipeMessageIsLoading, orderedIds.length]);

//     const createRecipeEditors = useCallback(() => {
//         const newEditors = messages.reduce(
//             (acc, message) => ({
//                 ...acc,
//                 [message.matrxRecordId]: {
//                     ...message,
//                     matrxRecordId: message.matrxRecordId,
//                     role: message.role,
//                     order: message.order || 0,
//                     type: message.type || 'text',
//                     content: message.content || '',
//                     encodedContent: message.content || '',
//                     currentDisplay: DisplayMode.ENCODED,
//                     displayContent: transformMatrxText(message.content || '', DisplayMode.ENCODED),
//                     brokers: [],
//                     layout: { position: message.order || 0, isVisible: true },
//                 },
//             }),
//             {}
//         );

//         // Update state with new data
//         console.log('----Setting editors:', newEditors);
//         setEditors(newEditors);
//         setOrderedIds(messages.map((m) => m.matrxRecordId));
//     }, []);

//     const removeEditor = useCallback((messageMatrxId: string) => {
//         deleteMessage(messageMatrxId, (success: boolean) => {
//             if (success) {
//                 setEditors((prev) => {
//                     const newEditors = { ...prev };
//                     delete newEditors[messageMatrxId];
//                     return newEditors;
//                 });
//                 setOrderedIds((prev) => prev.filter((id) => id !== messageMatrxId));
//             }
//         });
//     }, []);

//     const addNewSection = useCallback(() => {
//         const lastMessage = messages[messages.length - 1];
//         const lastRole = lastMessage?.role || 'system';
//         const nextRole = lastRole === 'user' ? 'assistant' : 'user';

//         const newMessage: { role: 'user' | 'assistant' | 'system'; type: 'text'; content: string; order: number } = {
//             role: nextRole,
//             type: 'text',
//             content: '',
//             order: messages.length + 1,
//         };

//         addMessage(newMessage, (success) => {
//             if (!success) {
//                 console.error('Failed to add new message section');
//                 return;
//             }
//         });
//     }, []);

//     const reorderMessages = useCallback(
//         (draggedId: MatrxRecordId, dropTargetId: MatrxRecordId) => {
//             handleDragDrop(draggedId, dropTargetId);

//             setOrderedIds((prev) => {
//                 const currentIds = [...prev];
//                 const draggedIndex = currentIds.indexOf(draggedId);
//                 const dropTargetIndex = currentIds.indexOf(dropTargetId);

//                 if (draggedIndex === -1 || dropTargetIndex === -1) return prev;

//                 currentIds.splice(draggedIndex, 1);
//                 currentIds.splice(dropTargetIndex, 0, draggedId);
//                 return currentIds;
//             });

//             setEditors((prev) => {
//                 const updatedEditors = { ...prev };
//                 const currentIds = orderedIds;
//                 currentIds.forEach((id, index) => {
//                     updatedEditors[id] = {
//                         ...updatedEditors[id],
//                         order: index + 1,
//                         layout: {
//                             ...updatedEditors[id].layout,
//                             position: index + 1,
//                         },
//                     };
//                 });
//                 return updatedEditors;
//             });
//         },
//         [orderedIds]
//     );

//     const renderMessageContainer = useCallback(() => {
//         console.log('Rendering container with:', {
//             hasOrderedIds: orderedIds?.length > 0,
//             hasEditors: Object.keys(editors).length > 0,
//             orderedIds,
//             editors,
//         });

//         if (!orderedIds?.length || !Object.keys(editors).length) {
//             console.log('Rendering empty container');
//             return (
//                 <MessagesContainer
//                     messages={[]}
//                     onDragDrop={(draggedId, dropTargetId) => reorderMessages(draggedId, dropTargetId)}
//                     deleteMessage={(messageId) => removeEditor(messageId)}
//                     onAddSection={() => addNewSection()}
//                 />
//             );
//         }

//         const orderedEditors = orderedIds.map((id) => editors[id]).filter((editor): editor is EditorState => !!editor);

//         console.log('Rendering container with editors:', orderedEditors);

//         return (
//             <MessagesContainer
//                 messages={orderedEditors}
//                 onDragDrop={(draggedId, dropTargetId) => reorderMessages(draggedId, dropTargetId, recipeMessagesHook)}
//                 deleteMessage={(messageId) => removeEditor(messageId, recipeMessagesHook)}
//                 onAddSection={() => addNewSection(recipeMessagesHook)}
//             />
//         );
//     }, [editors, orderedIds, reorderMessages, removeEditor, addNewSection]);

//     return (
//         <EditorsContext.Provider
//             value={{
//                 editors,
//                 orderedIds,
//                 canProceed,
//                 createRecipeEditors,
//                 removeEditor,
//                 addNewSection,
//                 reorderMessages,
//                 renderMessageContainer,
//             }}
//         >
//             {children}
//         </EditorsContext.Provider>
//     );
// }

// export const useMessageEditor = () => {
//     const context = useContext(EditorContext);
//     if (!context) throw new Error('useEditor must be used within an EditorProvider');
//     return context;
// };

// export const useMessageEditors = () => {
//     const context = useContext(EditorsContext);
//     if (!context) throw new Error('useEditors must be used within an EditorsProvider');
//     return context;
// };
