import { createHighlighter } from 'shiki';

const LANGS = ['tsx', 'ts', 'jsx', 'js', 'graphql', 'json', 'bash'];

// graphql is loaded so graphql`` tags inside tsx get highlighted too
const highlighter = createHighlighter({ themes: ['vitesse-dark'], langs: LANGS });

const ALIASES: Record<string, string> = { typescript: 'ts', javascript: 'js', sh: 'bash', shell: 'bash', gql: 'graphql' };

// server component: highlights code at build time
export default async function CodeBlock({ code, lang = 'tsx' }: { code: string; lang?: string }) {
  const resolved = ALIASES[lang] ?? lang;
  const html = (await highlighter).codeToHtml(code, { lang: LANGS.includes(resolved) ? resolved : 'text', theme: 'vitesse-dark' });
  return <div className='code-block' dangerouslySetInnerHTML={{ __html: html }} />;
}
