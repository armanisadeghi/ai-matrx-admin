"use client";

import { AlertTriangle } from "lucide-react";

interface DefaultErrorFallbackProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
}

const DefaultErrorFallback = ({
  title = "Display Error",
  message = "There was an error displaying this content.",
  icon = <AlertTriangle size={48} className="text-amber-500 mb-4" />
}: DefaultErrorFallbackProps) => {
  return (
    <div className="max-w-5xl mx-auto overflow-hidden rounded-xl shadow-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 p-8">
      <div className="flex flex-col items-center justify-center py-12 text-center">
        {icon}
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-slate-600 dark:text-slate-400">{message}</p>
      </div>
    </div>
  );
};

export default DefaultErrorFallback;
