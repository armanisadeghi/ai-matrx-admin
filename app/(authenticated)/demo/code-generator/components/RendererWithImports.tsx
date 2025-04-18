// import React, { useState, useEffect } from 'react';
// import { LiveProvider, LiveError, LivePreview } from 'react-live';

// // Import your design system components
// import * as ui from '@components/ui';
// import * as authHooks from '@hooks/auth';
// import * as dataHooks from '@hooks/data';
// import * as utils from '@utils/formatting';
// import axios from 'axios';
// import * as _ from 'lodash';
// import * as dateFns from 'date-fns';
// import * as Icons from 'react-icons/all';
// import { supabase } from '@/utils/supabase/client';

// /**
//  * Enhanced DynamicComponentRenderer that handles imports
//  * This component can be used anywhere in your app to render
//  * dynamically generated React components
//  */
// const DynamicComponentRenderer = ({ code, containerClassName = '' }) => {
//   const [processedCode, setProcessedCode] = useState('');
//   const [error, setError] = useState(null);
  
//   // Process the code to handle imports and other transformations
//   useEffect(() => {
//     try {
//       if (!code) {
//         setProcessedCode('');
//         return;
//       }
      
//       // Process import comments and prepare the code
//       const transformedCode = processComponentCode(code);
//       setProcessedCode(transformedCode);
//       setError(null);
//     } catch (err) {
//       console.error('Error processing component code:', err);
//       setError(err.message);
//     }
//   }, [code]);
  
//   // Create a scope with all the required dependencies
//   const scope = {
//     React,
//     useState: React.useState,
//     useEffect: React.useEffect,
//     useContext: React.useContext,
//     useReducer: React.useReducer,
//     useCallback: React.useCallback,
//     useMemo: React.useMemo,
//     useRef: React.useRef,
//     // UI Components
//     Button,
//     Card,
//     TextField,
//     Table,
//     Badge,
//     // Hooks
//     useAuth: authHooks.useAuth,
//     useData: dataHooks.useData,
//     // Utils
//     formatDate: utils.formatDate,
//     // External libs
//     axios,
//     _,
//     dateFns,
//     Icons
//   };
  
//   // The actual component rendering
//   return (
//     <div className={`dynamic-component-container ${containerClassName}`}>
//       {error ? (
//         <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-md text-red-700 dark:text-red-300">
//           <h3 className="font-bold mb-2">Error Rendering Component</h3>
//           <pre className="whitespace-pre-wrap text-sm">{error}</pre>
//         </div>
//       ) : processedCode ? (
//         <LiveProvider code={processedCode} scope={scope} noInline={true}>
//           <div className="live-preview-wrapper bg-white dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-700">
//             <LiveError className="p-3 mb-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-md text-red-700 dark:text-red-300 text-sm" />
//             <LivePreview />
//           </div>
//         </LiveProvider>
//       ) : (
//         <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 flex items-center justify-center min-h-[200px]">
//           <p>No component code provided</p>
//         </div>
//       )}
//     </div>
//   );
// };

// /**
//  * Process component code to handle imports and transformations
//  */
// function processComponentCode(code) {
//   // Extract import comments
//   const importRegex = /\/\/\s*@import\s+(.+)\s+from\s+['"](.+)['"]/g;
//   let match;
//   const imports = [];
  
//   // Collect all import statements
//   while ((match = importRegex.exec(code)) !== null) {
//     imports.push({
//       what: match[1].trim(),
//       from: match[2].trim(),
//       fullMatch: match[0]
//     });
//   }
  
//   // Remove import comments from the code
//   let processedCode = code;
//   imports.forEach(imp => {
//     processedCode = processedCode.replace(imp.fullMatch, '');
//   });
  
//   // Trim extra whitespace that may have been left
//   processedCode = processedCode.replace(/^\s*\n/gm, '');
  
//   // Validate the component structure
//   if (!processedCode.includes('render(<')) {
//     throw new Error("Component code must include 'render(<Component />)' at the end");
//   }
  
//   return processedCode;
// }

// export default DynamicComponentRenderer;