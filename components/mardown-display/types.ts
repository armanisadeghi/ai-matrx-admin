// types/table.ts
import { DisplayTheme } from "./themes";

export interface MarkdownTableData {
    headers: string[];
    rows: string[][];
    originalContent?: string; // Store original markdown for copy
}


export interface MarkdownTableProps {
    data: MarkdownTableData;
    className?: string;
    fontSize?: number;
    theme?: DisplayTheme;
    onSave?: (data: MarkdownTableData) => void;
}

export interface SectionItem {
    name: string;
  }
  
  export interface MarkdownTable {
    title: string;
    data: MarkdownTableData;
  }
  
  export interface Section {
    title: string;
    intro: string;
    items: SectionItem[];
    tables: MarkdownTable[];
    outro: string;
  }
  
  export interface ParsedContent {
    intro: string;
    sections: Section[];
    outro: string;
  }
  