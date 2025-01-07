// Style definitions
export interface TextStyle {
  text?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    color?: string;
    fontSize?: string;
    fontFamily?: string;
    alignment?: 'left' | 'center' | 'right' | 'justify';
    lineHeight?: string | number;
  };
  spacing?: {
    letterSpacing?: string;
    wordSpacing?: string;
    indent?: string | number;
  };
  background?: {
    color?: string;
  };
  special?: {
    link?: string;
    codeLanguage?: string;
    quotation?: boolean;
  };
 }
 
 // Block types
 export interface BaseBlock {
  id: string;
  position: number;
  type: "text" | "chip" | "lineBreak";
 }
 
 export interface TextBlock extends BaseBlock {
  type: "text";
  content: string;
  style?: TextStyle;
 }
 
 export interface ChipBlock extends BaseBlock {
  type: "chip";
  content: string;
  label?: string;
  brokerId?: string;
  style?: TextStyle;
 }
 
 export interface LineBreakBlock extends BaseBlock {
  type: "lineBreak";
  content: "";
 }
 
 export type ContentBlock = TextBlock | ChipBlock | LineBreakBlock;
 
 export interface DocumentState {
  blocks: ContentBlock[];
  version: number;
  lastUpdate: number;
 }
 
 export interface BrokerChipEvent {
  type: "remove" | "edit" | "toggle";
  brokerId: string;
  content?: string;
 }