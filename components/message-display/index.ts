import LinkWrapper from './blocks/LinkWrapper';
import TableWrapper from './blocks/TableWrapper';
import MessageContentDisplay from './MessageContentDisplay';

// Note: CodeBlock is dynamically imported in MessageContentDisplay.tsx to avoid circular dependencies
// If you need CodeBlock, import it directly: import CodeBlock from '@/components/mardown-display/code/CodeBlock'

export { LinkWrapper, TableWrapper };

export default MessageContentDisplay;
