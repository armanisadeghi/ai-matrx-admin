// import React, { useRef } from 'react';
// import { EditorHeader } from './EditorHeader';
// import { StructuredEditor } from './StructuredEditor';
// import type { DocumentState } from '../types';

// interface EditorWithHeaderProps {
//   editorId: string;
//   content?: DocumentState;
//   onStateChange?: (state: DocumentState) => void;
//   onInsertChip?: (content: string) => void;
//   showHeader?: boolean;
// }

// type EditorRef = {
//   processContent: () => void;
//   insertChip: (content: string) => void;
// };

// export const EditorWithHeader: React.FC<EditorWithHeaderProps> = ({
//   editorId,
//   content,
//   onStateChange,
//   onInsertChip,
//   showHeader = true
// }) => {
//   const editorRef = useRef<EditorRef>(null);

//   const handleInsertChip = (chipContent: string) => {
//     editorRef.current?.insertChip(chipContent);
//     onInsertChip?.(chipContent);
//   };

//   const handleProcessContent = () => {
//     editorRef.current?.processContent();
//   };

//   return (
//     <div>
//       {showHeader && (
//         <EditorHeader
//           editorId={editorId}
//           onInsertChip={handleInsertChip}
//           onProcessContent={handleProcessContent}
//         />
//       )}
//       <StructuredEditor
//         ref={editorRef}
//         editorId={editorId}
//         content={content}
//         onStateChange={onStateChange}
//         onInsertChip={onInsertChip}
//       />
//     </div>
//   );
// };