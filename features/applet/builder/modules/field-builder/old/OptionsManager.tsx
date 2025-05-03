// 'use client';

// import React from 'react';
// import { FieldOption } from '../../../builder.types';
// import { PlusIcon, Trash2Icon } from 'lucide-react';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Button } from '@/components/ui/button';

// interface OptionsManagerProps {
//   options: FieldOption[];
//   onOptionChange: (index: number, key: keyof FieldOption, value: string) => void;
//   onRemoveOption: (index: number) => void;
//   onAddOption: () => void;
// }

// const OptionsManager: React.FC<OptionsManagerProps> = ({
//   options,
//   onOptionChange,
//   onRemoveOption,
//   onAddOption
// }) => {
//   return (
//     <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900">
//       <div className="flex justify-between items-center">
//         <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Options</h3>
//         <Button
//           onClick={onAddOption}
//           size="sm"
//           className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white"
//         >
//           <PlusIcon className="h-3.5 w-3.5 mr-1" />
//           Add Option
//         </Button>
//       </div>
      
//       {options?.map((option, index) => (
//         <div key={option.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800">
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//             <div>
//               <Label htmlFor={`option-label-${index}`} className="text-xs font-medium text-gray-700 dark:text-gray-300">
//                 Label
//               </Label>
//               <Input
//                 id={`option-label-${index}`}
//                 type="text"
//                 value={option.label}
//                 onChange={(e) => onOptionChange(index, 'label', e.target.value)}
//                 className="h-8 mt-1 text-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
//               />
//             </div>
//             <div className="relative">
//               <Label htmlFor={`option-desc-${index}`} className="text-xs font-medium text-gray-700 dark:text-gray-300">
//                 Description
//               </Label>
//               <div className="flex mt-1">
//                 <Input
//                   id={`option-desc-${index}`}
//                   type="text"
//                   value={option.description || ''}
//                   onChange={(e) => onOptionChange(index, 'description', e.target.value)}
//                   className="h-8 text-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-r-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
//                 />
//                 <Button
//                   onClick={() => onRemoveOption(index)}
//                   variant="ghost"
//                   size="icon"
//                   className="h-8 rounded-l-none border border-l-0 border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
//                   title="Remove option"
//                 >
//                   <Trash2Icon className="h-4 w-4" />
//                 </Button>
//               </div>
//             </div>
//           </div>
//         </div>
//       ))}
      
//       {(!options || options.length === 0) && (
//         <div className="text-center p-6 bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
//           <p className="text-sm text-gray-500 dark:text-gray-400">No options defined yet.</p>
//           <Button
//             onClick={onAddOption}
//             size="sm"
//             className="mt-3 bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white"
//           >
//             <PlusIcon className="h-4 w-4 mr-1" />
//             Add Your First Option
//           </Button>
//         </div>
//       )}
      
//       {options && options.length > 0 && (
//         <div className="flex justify-center pt-2">
//           <Button
//             onClick={onAddOption}
//             variant="outline"
//             size="sm"
//             className="border-rose-200 hover:border-rose-300 dark:border-rose-800 dark:hover:border-rose-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20"
//           >
//             <PlusIcon className="h-4 w-4 mr-1" />
//             Add Another Option
//           </Button>
//         </div>
//       )}
//     </div>
//   );
// };

// export default OptionsManager; 