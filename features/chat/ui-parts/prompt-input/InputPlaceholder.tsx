import React from 'react';
import { FileText, X, Paperclip, Search, Mic, ArrowUp } from 'lucide-react';
import { BsCloudUpload } from 'react-icons/bs';
import { LuSearchCheck } from 'react-icons/lu';
import { LiaLightbulbSolid } from 'react-icons/lia';
import { HiOutlineLightBulb } from 'react-icons/hi';

const InputPlaceholder = () => {
  // Static placeholder height
  const placeholderHeight = "60px";
  
  return (
    <div className="relative">
      {/* File Chips Area - Above the input (empty placeholder) */}
      <div className="mb-2 flex flex-wrap gap-2 max-w-full overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-zinc-400 dark:scrollbar-thumb-zinc-600">
        {/* Empty file chip placeholder */}
        <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-zinc-300/80 dark:bg-zinc-700/80 text-sm text-gray-800 dark:text-gray-200 shadow-md opacity-30">
          <FileText size={14} className="mr-1.5 text-gray-600 dark:text-gray-400" />
          <span className="truncate max-w-[120px]">placeholder.txt</span>
          <span className="mx-1.5 text-xs text-gray-600 dark:text-gray-400">10KB</span>
          <button className="p-0.5 rounded-full">
            <X size={14} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>
      
      <div className="relative rounded-3xl bg-zinc-200 dark:bg-zinc-800 transition-all overflow-hidden">
        {/* Static textarea */}
        <div
          style={{
            height: placeholderHeight,
            paddingBottom: "60px", 
          }}
          className="w-full p-4 rounded-3xl border-none resize-none outline-none bg-zinc-200 dark:bg-zinc-800 text-gray-500 dark:text-gray-500 overflow-auto"
        >
          What do you want to know?
        </div>
        
        {/* Solid background container for bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 h-[50px] bg-zinc-200 dark:bg-zinc-800 z-5">
          <div className="absolute bottom-2 left-4 flex items-center space-x-3">
            <button className="p-2 rounded-full text-gray-800 dark:text-gray-300 border border-zinc-300 dark:border-zinc-700">
              <Paperclip size={18} />
            </button>
            
            {/* Search Button Placeholder */}
            <button className="p-2 rounded-full text-gray-800 dark:text-gray-300 border border-zinc-300 dark:border-zinc-700">
              <Search size={18} />
            </button>
            
            {/* Tools Button Placeholder */}
            <button className="p-2 rounded-full text-gray-800 dark:text-gray-300 border border-zinc-300 dark:border-zinc-700">
              <LiaLightbulbSolid size={18} />
            </button>
          </div>
          
          <div className="absolute bottom-2 right-4 flex items-center space-x-3">
            <button className="p-2 rounded-full border border-zinc-300 dark:border-zinc-700 text-gray-800 dark:text-gray-300">
              <Mic size={18} />
            </button>
            
            <div className="flex items-center ml-1 relative">
              {/* Model selection component placeholder */}
              <div className="p-2 rounded-lg bg-zinc-300 dark:bg-zinc-700 text-sm text-gray-800 dark:text-gray-300">
                Model
              </div>
              
              <button className="p-2 ml-3 rounded-full text-gray-800 dark:text-gray-300 bg-zinc-300 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-700">
                <ArrowUp size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputPlaceholder;