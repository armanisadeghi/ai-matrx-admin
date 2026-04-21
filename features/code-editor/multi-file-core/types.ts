export interface CodeFile {
  name: string;
  path: string;
  language: string;
  content: string;
  icon?: React.ReactNode;
  readOnly?: boolean;
}
