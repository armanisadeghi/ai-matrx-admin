// import React from 'react';
// import { Paperclip, Search, Mic, ArrowUp } from 'lucide-react';
// import { LiaLightbulbSolid } from 'react-icons/lia';
// import { FaMicrophoneLines } from "react-icons/fa6";
// import { LuBrainCircuit } from "react-icons/lu";
// import { LuBrain } from "react-icons/lu";
// import { CgAttachment } from "react-icons/cg";
// import { MdOutlineChecklist } from "react-icons/md";
// import { MdOutlineQuestionMark } from "react-icons/md";
// import { BsPatchQuestion } from "react-icons/bs";

// const InputPlaceholder = () => {
//   // Static placeholder height
//   const placeholderHeight = "140px";
  
//   return (
//     <div className="relative">
//       {/* File Chips Area - Above the input (empty placeholder) */}      
//       <div className="relative rounded-3xl bg-zinc-200 dark:bg-zinc-800 transition-all overflow-hidden">
//         {/* Static textarea */}
//         <div
//           style={{
//             height: placeholderHeight,
//             paddingBottom: "60px", 
//           }}
//           className="w-full p-4 rounded-3xl border-none resize-none outline-none bg-zinc-200 dark:bg-zinc-800 text-gray-500 dark:text-gray-500 overflow-auto"
//         >
//           What do you want to know?
//         </div>
        
//         {/* Solid background container for bottom controls */}
//         <div className="absolute bottom-0 left-0 right-0 h-[50px] bg-zinc-200 dark:bg-zinc-800 z-5">
//           <div className="absolute bottom-2 left-4 flex items-center space-x-3">
//             <button className="p-2 rounded-full text-gray-800 dark:text-gray-300 border border-zinc-300 dark:border-zinc-700">
//               <CgAttachment size={16} />
//             </button>
            
//             {/* Search Button Placeholder */}
//             <button className="p-2 rounded-full text-gray-800 dark:text-gray-300 border border-zinc-300 dark:border-zinc-700">
//               <Search size={16} />
//             </button>
//             <button className="p-2 rounded-full text-gray-800 dark:text-gray-300 border border-zinc-300 dark:border-zinc-700">
//               <LuBrain size={16} />
//             </button>
//             <button className="p-2 rounded-full text-gray-800 dark:text-gray-300 border border-zinc-300 dark:border-zinc-700">
//               <MdOutlineChecklist size={16} />
//             </button>
//             <button className="p-2 rounded-full text-gray-800 dark:text-gray-300 border border-zinc-300 dark:border-zinc-700">
//               <MdOutlineQuestionMark size={16} />
//             </button>

//             {/* Tools Button Placeholder */}
//             <button className="p-2 rounded-full text-gray-800 dark:text-gray-300 border border-zinc-300 dark:border-zinc-700">
//               <LiaLightbulbSolid size={16} />
//             </button>
//           </div>
          
//           <div className="absolute bottom-2 right-4 flex items-center space-x-3">
//             <button className="p-2 rounded-full border border-zinc-300 dark:border-zinc-700 text-gray-800 dark:text-gray-300">
//               <Mic size={16} />
//             </button>
            
//             <div className="flex items-center ml-1 relative">
//               {/* Model selection component placeholder */}
//               <div className="p-2 rounded-lg text-sm text-gray-800 dark:text-gray-300">
//                 Matrx AI
//               </div>
              
//               <button className="p-2 ml-3 rounded-full text-gray-800 dark:text-gray-300 bg-zinc-300 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-700">
//                 <ArrowUp size={16} />
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default InputPlaceholder;