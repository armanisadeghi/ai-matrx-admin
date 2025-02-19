import { Monitor } from "lucide-react";
import { useEffect, useState } from "react";

const PreviewPanel = ({ code, language }: {code: string, language: string}) => {
    const [previewContent, setPreviewContent] = useState('');

    useEffect(() => {
        if (language === 'html') {
            setPreviewContent(`
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { margin: 0; font-family: sans-serif; }
                    </style>
                </head>
                <body>
                    ${code}
                </body>
                </html>
            `);
        } else if (language === 'css') {
            setPreviewContent(`
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { margin: 0; font-family: sans-serif; padding: 20px; }
                        ${code}
                    </style>
                </head>
                <body>
                    <div class="preview-container">
                        <h1>Heading 1</h1>
                        <h2>Heading 2</h2>
                        <p>This is a paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
                        <button class="button">Button</button>
                        <div class="box">Styled Box</div>
                        <ul>
                            <li>List item 1</li>
                            <li>List item 2</li>
                        </ul>
                        <form>
                            <input type="text" placeholder="Input field" />
                        </form>
                    </div>
                </body>
                </html>
            `);
        } else if (language === 'javascript' || language === 'typescript') {
            setPreviewContent(`
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { margin: 0; font-family: sans-serif; padding: 20px; }
                        .error { color: red; padding: 10px; border: 1px solid red; background: #fff5f5; }
                        #app { min-height: 100vh; }
                    </style>
                </head>
                <body>
                    <div id="app"></div>
                    <script type="text/javascript">
                        try {
                            ${code}
                        } catch (error) {
                            document.getElementById('app').innerHTML = 
                                '<div class="error">Error: ' + error.message + '</div>';
                        }
                    </script>
                </body>
                </html>
            `);
        }
    }, [code, language]);

    return (
        <div className="h-full bg-white dark:bg-gray-800 flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center space-x-3">
                    <Monitor className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-300">Preview</span>
                </div>
            </div>
            <div className="flex-grow">
                <iframe
                    srcDoc={previewContent}
                    className="w-full h-full border-none bg-white"
                    sandbox="allow-scripts allow-modals"
                    title="Preview"
                />
            </div>
        </div>
    );
};

export default PreviewPanel;