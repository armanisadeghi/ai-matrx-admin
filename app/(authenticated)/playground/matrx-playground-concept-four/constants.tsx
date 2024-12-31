// // constants.ts
// import {
//     CheckCircle2,
//     ChevronDown,
//     ChevronUp,
//     Database,
//     SquareFunction as FunctionIcon,
//     Globe,
//     Files,
//     Terminal,
//     Type,
//     ListFilter,
//     ToggleLeft,
//     Sliders,
//     Radio,
//     CheckSquare,
//     Settings,
//     Variable,
//     TextCursorInput,
//     X,
//     Circle,
//     XCircle,
//     Blocks,
//     MessageCircleQuestion,
//   } from "lucide-react";
  
// export const componentTypes = [
//     {value: 'input', label: 'Input'},
//     {value: 'textarea', label: 'Textarea'},
//     {value: 'select', label: 'Select'},
//     {value: 'switch', label: 'Switch'},
//     {value: 'slider', label: 'Slider'},
//     {value: 'radio', label: 'Radio'},
//     {value: 'checkbox', label: 'Checkbox'}
// ];

// export const sourceTypes = [
//     {value: 'userInput', label: 'User Input'},
//     {value: 'API', label: 'API'},
//     {value: 'Environment', label: 'Environment'},
//     {value: 'Database', label: 'Database'},
//     {value: 'File', label: 'File'},
//     {value: 'Function', label: 'Function'},
//     {value: 'Generated', label: 'Generated'},
//     {value: 'None', label: 'None'}
// ];

// export const getComponentIcon = (type: string) => {
//     switch (type) {
//       case "input":
//         return <TextCursorInput className="h-4 w-4" />;
//       case "textarea":
//         return <Type className="h-4 w-4" />;
//       case "select":
//         return <ListFilter className="h-4 w-4" />;
//       case "switch":
//         return <ToggleLeft className="h-4 w-4" />;
//       case "slider":
//         return <Sliders className="h-4 w-4" />;
//       case "radio":
//         return <Radio className="h-4 w-4" />;
//       case "checkbox":
//         return <CheckSquare className="h-4 w-4" />;
//       default:
//         return <Settings className="h-4 w-4" />;
//     }
//   };
  
//   export const getSourceIcon = (source: string) => {
//     switch (source) {
//       case "API":
//         return <Globe className="h-4 w-4" />;
//       case "Database":
//         return <Database className="h-4 w-4" />;
//       case "Function":
//         return <FunctionIcon className="h-4 w-4" />;
//       case "File":
//         return <Files className="h-4 w-4" />;
//       case "Environment":
//         return <Terminal className="h-4 w-4" />;
//       default:
//         return <Variable className="h-4 w-4" />;
//     }
//   };
  
  