'use client';

import React  from 'react';
import { BsEmojiWink } from "react-icons/bs";

const ForHumansFromAI = ({ quip }) => {

  return (
    <div className="relative rounded-3xl bg-slate-200 dark:bg-slate-800 min-h-[140px] p-4 flex flex-col justify-center">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium flex items-center">
        <BsEmojiWink className="inline-block w-3 h-3 mr-1" />
        For Humans, From AI
      </div>
      <div className="text-gray-700 dark:text-gray-300 font-normal text-sm">
        {quip}
        <span className="inline-block w-1 h-4 ml-1 bg-gray-400 dark:bg-gray-500 animate-pulse"></span>
      </div>
    </div>
  );
};

export default ForHumansFromAI;