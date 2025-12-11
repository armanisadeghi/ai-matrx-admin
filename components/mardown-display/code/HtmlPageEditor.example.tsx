"use client";
import { useState } from "react";
import MultiFileCodeEditor, { CodeFile } from "../../../features/code-editor/components/code-block/MultiFileCodeEditor";

/**
 * Example: HTML Page Editor with CSS, HTML, and combined view
 * This demonstrates using the MultiFileCodeEditor for editing HTML pages
 */
export default function HtmlPageEditorExample() {
    // Initial content
    const initialHtmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Page</title>
</head>
<body>
    <h1>Hello World</h1>
    <p class="intro">This is a sample paragraph.</p>
    <div class="container">
        <button class="btn">Click me</button>
    </div>
</body>
</html>`;

    const initialCssContent = `.intro {
    font-size: 18px;
    color: #333;
    margin-bottom: 20px;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

.btn {
    background-color: #007bff;
    color: white;
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.btn:hover {
    background-color: #0056b3;
}`;

    // State for file contents
    const [htmlContent, setHtmlContent] = useState(initialHtmlContent);
    const [cssContent, setCssContent] = useState(initialCssContent);

    // Generate combined HTML (with embedded CSS)
    const generateCombinedHtml = () => {
        return htmlContent.replace(
            '</head>',
            `    <style>\n${cssContent}\n    </style>\n</head>`
        );
    };

    // Define files with proper paths for multi-model support
    const files: CodeFile[] = [
        {
            name: "index.html",
            path: "index.html", // Unique identifier for this model
            language: "html",
            content: htmlContent,
        },
        {
            name: "styles.css",
            path: "styles.css", // Unique identifier for this model
            language: "css",
            content: cssContent,
        },
        {
            name: "combined.html",
            path: "combined.html", // Unique identifier for this model
            language: "html",
            content: generateCombinedHtml(),
        },
    ];

    // Handle file content changes
    const handleChange = (path: string, content: string) => {
        if (path === "index.html") {
            setHtmlContent(content);
        } else if (path === "styles.css") {
            setCssContent(content);
        }
        // Combined view is read-only / auto-generated
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                HTML Page Editor
            </h1>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
                Edit your HTML and CSS separately, then view the combined result.
            </p>
            
            <MultiFileCodeEditor
                files={files}
                onChange={handleChange}
                onFileSelect={(path) => console.log('Selected file:', path)}
                autoFormatOnOpen={true}
                showSidebar={true}
                height="600px"
            />

            {/* Preview section (optional) */}
            <div className="mt-4">
                <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
                    Live Preview
                </h2>
                <div className="border border-border rounded-lg p-4 bg-textured">
                    <iframe
                        srcDoc={generateCombinedHtml()}
                        className="w-full h-96 border-0"
                        title="HTML Preview"
                        sandbox="allow-same-origin"
                    />
                </div>
            </div>
        </div>
    );
}

