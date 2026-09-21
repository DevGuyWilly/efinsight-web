import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/cn';

/**
 * Advisor text is model output, so it is untrusted. react-markdown never renders raw HTML, rehype-sanitize
 * strips anything unsafe from the result (including javascript: URLs), and links open with rel=noopener.
 * The `.efs-md` styles live in styles/index.css.
 */
export const MarkdownContent = memo(function MarkdownContent({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn('efs-md', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
});
