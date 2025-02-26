import {
    IconBrandPython,
    IconBrandTypescript,
    IconFileCode,
    IconFileDots,
    IconFileSpreadsheet,
    IconFileText,
    IconFileTypeJs,
    IconFileTypeJsx,
    IconFileTypePdf,
    IconFileTypeTsx,
    IconFileZip,
    IconMusic,
    IconPhoto,
    IconVideo,
} from "@tabler/icons-react";

export function getLanguageFromExtension(filename: string): string {
    const extension = filename?.split(".").pop()?.toLowerCase() || "";

    const languageMap: { [key: string]: string } = {
        js: "javascript",
        ts: "typescript",
        jsx: "javascript",
        tsx: "typescript",
        html: "html",
        css: "css",
        json: "json",
        md: "markdown",
        py: "python",
        rb: "ruby",
        php: "php",
        java: "java",
        c: "c",
        cpp: "cpp",
        cs: "csharp",
        go: "go",
        rs: "rust",
        swift: "swift",
        kt: "kotlin",
        scala: "scala",
        sql: "sql",
        sh: "shell",
        yaml: "yaml",
        yml: "yaml",
        xml: "xml",
        // Add more mappings as needed
    };

    return languageMap[extension] || "plaintext";
}

export function getIconFromExtension(filename: string) {
    const extension = filename?.split(".").pop()?.toLowerCase() || "";

    const iconMap: { [key: string]: React.ComponentType } = {
        js: IconFileTypeJs,
        ts: IconBrandTypescript,
        jsx: IconFileTypeJsx,
        tsx: IconFileTypeTsx,
        html: IconFileCode,
        css: IconFileCode,
        json: IconFileCode,
        md: IconFileText,
        txt: IconFileText,
        pdf: IconFileTypePdf,
        doc: IconFileText,
        docx: IconFileText,
        xls: IconFileSpreadsheet,
        xlsx: IconFileSpreadsheet,
        zip: IconFileZip,
        rar: IconFileZip,
        mp4: IconVideo,
        mov: IconVideo,
        mp3: IconMusic,
        wav: IconMusic,
        jpg: IconPhoto,
        jpeg: IconPhoto,
        png: IconPhoto,
        gif: IconPhoto,
        py: IconBrandPython,
        // Add more mappings as needed
    };

    return iconMap[extension] || IconFileDots;
}
