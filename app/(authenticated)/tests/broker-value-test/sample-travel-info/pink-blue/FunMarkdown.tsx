'use client'

import ReactMarkdown from "react-markdown";

const FunMarkdownRenderer: React.FC<{ content: string; type: string; role: string; fontSize?: number }> = ({ content, fontSize }) => {
    return (
      <div
        className="prose dark:prose-invert w-full p-2 
          bg-gradient-to-br from-pink-50 to-cyan-50 dark:from-pink-950 dark:to-cyan-950 
          border-2 border-pink-200 dark:border-pink-800 shadow-lg rounded-xl"
        style={{ fontSize: fontSize ? `${fontSize}px` : "inherit" }}
      >
        <ReactMarkdown
          components={{
            h1: ({ node, children }) => <h1 className="text-2xl font-bold text-pink-500 dark:text-pink-400">{children}</h1>,
            h2: ({ node, children }) => <h2 className="text-xl font-semibold text-cyan-500 dark:text-cyan-400">{children}</h2>,
            p: ({ node, children }) => <p className="text-gray-700 dark:text-gray-300">{children}</p>,
            ul: ({ node, children }) => <ul className="list-disc list-inside space-y-1 text-gray-800 dark:text-gray-300">{children}</ul>,
            li: ({ node, children }) => <li className="before:content-['🔥'] before:mr-2">{children}</li>,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };
  
  export default FunMarkdownRenderer;