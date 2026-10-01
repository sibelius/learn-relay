import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import CodeBlock from './CodeBlock';

// server component: markdown with highlighted code blocks
export default function Markdown({ children }: { children: string }) {
  return (
    <div className='md'>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ children, href }) => (
            <a href={href} target='_blank' rel='noreferrer'>
              {children}
            </a>
          ),
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            const text = String(children ?? '');
            const lang = /language-(\w+)/.exec(className ?? '')?.[1];
            if (!lang && !text.includes('\n')) return <code>{children}</code>;
            return <CodeBlock code={text.replace(/\n$/, '')} lang={lang ?? 'text'} />;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
