import React from 'react';
import { Search, Mic, ArrowUp } from 'lucide-react';
import { LiaLightbulbSolid } from 'react-icons/lia';
import { LuBrain } from "react-icons/lu";
import { CgAttachment } from "react-icons/cg";
import { MdOutlineChecklist } from "react-icons/md";
import { MdOutlineQuestionMark } from "react-icons/md";

const InputPlaceholder = () => {
  // Static placeholder height
  const placeholderHeight = "140px";
  
  return (
    <div className="relative">
      {/* File Chips Area - Above the input (empty placeholder) */}      
      <div className="relative rounded-2xl bg-muted transition-all overflow-hidden">
        {/* Static textarea */}
        <div
          style={{
            height: placeholderHeight,
            paddingBottom: "60px", 
          }}
          className="w-full p-4 rounded-2xl border-none resize-none outline-none bg-muted text-muted-foreground overflow-auto"
        >
          
        </div>
        
        {/* Solid background container for bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 h-[50px] bg-muted z-5">
          <div className="absolute bottom-2 left-4 flex items-center space-x-3">
            <button className="p-2 rounded-full text-muted-foreground border border-border">
              <CgAttachment size={16} />
            </button>
            
            {/* Search Button Placeholder */}
            <button className="p-2 rounded-full text-muted-foreground border border-border">
              <Search size={16} />
            </button>
            <button className="p-2 rounded-full text-muted-foreground border border-border">
              <LuBrain size={16} />
            </button>
            <button className="p-2 rounded-full text-muted-foreground border border-border">
              <MdOutlineChecklist size={16} />
            </button>
            <button className="p-2 rounded-full text-muted-foreground border border-border">
              <MdOutlineQuestionMark size={16} />
            </button>

            {/* Tools Button Placeholder */}
            <button className="p-2 rounded-full text-muted-foreground border border-border">
              <LiaLightbulbSolid size={16} />
            </button>
          </div>
          
          <div className="absolute bottom-2 right-4 flex items-center space-x-3">
            <button className="p-2 rounded-full border border-border text-muted-foreground">
              <Mic size={16} />
            </button>
            
            <div className="flex items-center ml-1 relative">
              {/* Model selection component placeholder */}
              <div className="p-2 rounded-lg text-sm text-muted-foreground">
                Matrx AI
              </div>
              
              <button className="p-2 ml-3 rounded-full text-muted-foreground bg-accent border border-border">
                <ArrowUp size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputPlaceholder;