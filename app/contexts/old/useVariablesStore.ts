// // hooks/useVariablesStore.ts
// import { create } from 'zustand';
// import { v4 as uuidv4 } from 'uuid';

// export interface Variable {
//     id: string;
//     displayName: string;
//     officialName: string;
//     value: string;
//     componentType: string;
//     instructions: string;
//     defaultSource: string;
//     sourceDetails?: string;
//     isConnected: boolean;
//     isReady: boolean;
//     isDeleted: boolean;
//     color: string;
// }

// interface EditorState {
//     content: string;
//     selection: { start: number; end: number } | null;
// }

// interface VariablesState {
//     variables: Record<string, Variable>;
//     editor: EditorState;
//     addVariable: (data?: Partial<Variable>) => string;
//     updateVariable: (id: string, data: Partial<Variable>) => void;
//     deleteVariable: (id: string) => void;
//     restoreVariable: (id: string) => void;
//     updateEditorContent: (content: string) => void;
//     updateEditorSelection: (selection: EditorState['selection']) => void;
// }

// const getRandomColor = () => {
//     const colors = ['rgb(239 68 68)', 'rgb(34 197 94)', 'rgb(59 130 246)',
//         'rgb(168 85 247)', 'rgb(234 179 8)', 'rgb(236 72 153)'];
//     return colors[Math.floor(Math.random() * colors.length)];
// };

// export const useVariablesStore = create<VariablesState>((set) => ({
//     variables: {},
//     editor: {
//         content: '',
//         selection: null
//     },
//     addVariable: (data) => {
//         const id = uuidv4();
//         const displayName = data?.displayName || 'New Variable';
//         set((state) => ({
//             variables: {
//                 ...state.variables,
//                 [id]: {
//                     id,
//                     displayName,
//                     officialName: data?.officialName || displayName,
//                     value: data?.value || '',
//                     componentType: data?.componentType || 'input',
//                     instructions: data?.instructions || '',
//                     defaultSource: data?.defaultSource || 'None',
//                     isConnected: true,
//                     isReady: false,
//                     isDeleted: false,
//                     color: data?.color || getRandomColor(),
//                     ...data
//                 }
//             }
//         }));
//         return id;
//     },
//     updateVariable: (id, data) => {
//         set((state) => ({
//             variables: {
//                 ...state.variables,
//                 [id]: { ...state.variables[id], ...data }
//             }
//         }));
//     },
//     deleteVariable: (id) => {
//         set((state) => ({
//             variables: {
//                 ...state.variables,
//                 [id]: { ...state.variables[id], isDeleted: true }
//             }
//         }));
//     },
//     restoreVariable: (id) => {
//         set((state) => ({
//             variables: {
//                 ...state.variables,
//                 [id]: { ...state.variables[id], isDeleted: false }
//             }
//         }));
//     },
//     updateEditorContent: (content) => {
//         set((state) => ({
//             editor: { ...state.editor, content }
//         }));
//     },
//     updateEditorSelection: (selection) => {
//         set((state) => ({
//             editor: { ...state.editor, selection }
//         }));
//     }
// }));
