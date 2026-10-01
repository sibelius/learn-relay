import Link from 'next/link';

import { exercises } from '@/exercises';
import Logo from '@/components/Logo';
import ExerciseGrid from '@/components/ExerciseGrid';
import CodeBlock from '@/components/CodeBlock';

const FEATURES = [
  {
    title: 'The real Relay compiler',
    body: 'Your graphql tags are compiled by the official Rust Relay compiler, running as WebAssembly in your browser.',
  },
  {
    title: 'A GraphQL server in a tab',
    body: 'A mini social network with posts, comments, likes, auth and subscriptions. No setup, no MongoDB.',
  },
  {
    title: 'See inside Relay',
    body: 'Inspect every request in the Network tab and watch normalized records change in the Relay Store tab.',
  },
  {
    title: 'Instant feedback',
    body: 'Automated checks run against your app, so you know when you solved it. Stuck? Hints and solutions are one click away.',
  },
];

const snippet = `import { graphql, useFragment } from 'react-relay';

const Post = (props) => {
  const post = useFragment(
    graphql\`
      fragment Post_post on Post {
        content
        author { name }
      }
    \`,
    props.post,
  );

  return <Text>{post.content}</Text>;
};`;

export default function Home() {
  const first = exercises[0];
  return (
    <main className='min-h-dvh'>
      <div className='absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(242,107,0,.18),transparent)] pointer-events-none' />
      <nav className='relative max-w-6xl mx-auto px-5 h-16 flex items-center gap-3'>
        <Logo className='w-7 h-7' />
        <span className='font-semibold'>Learn Relay</span>
        <div className='ml-auto flex items-center gap-4 text-sm text-zinc-400'>
          <a href='#exercises' className='hover:text-white'>
            Exercises
          </a>
          <a href='https://github.com/sibelius/relay-workshop' target='_blank' rel='noreferrer' className='hover:text-white'>
            GitHub
          </a>
          <a href='https://relay.dev' target='_blank' rel='noreferrer' className='hover:text-white hidden sm:inline'>
            relay.dev
          </a>
        </div>
      </nav>

      <section className='relative max-w-6xl mx-auto px-5 pt-14 pb-20 grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center'>
        <div>
          <div className='inline-flex items-center gap-2 text-xs rounded-full border border-white/10 bg-white/[.03] px-3 py-1 text-zinc-400 mb-6'>
            <span className='w-1.5 h-1.5 rounded-full bg-emerald-400' /> {exercises.length} hands-on exercises · runs 100% in your browser
          </div>
          <h1 className='text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05] text-white'>
            Learn <span className='text-[#F26B00]'>Relay</span>
            <br />
            by solving problems.
          </h1>
          <p className='mt-6 text-lg text-zinc-400 max-w-xl'>
            The Relay workshop by Sibelius Seraphini, rebuilt as an interactive playground. Write real Relay code, watch the store update, and pass the checks, all
            without installing anything.
          </p>
          <div className='mt-8 flex flex-wrap gap-3'>
            <Link href={`/exercises/${first.slug}`} className='btn-primary !text-base !px-5 !py-2.5'>
              Start learning →
            </Link>
            <a href='#exercises' className='btn-ghost !text-base !px-5 !py-2.5'>
              See all exercises
            </a>
          </div>
        </div>
        <div className='rounded-2xl border border-white/10 bg-[#0f1218] shadow-2xl shadow-orange-950/30 overflow-hidden'>
          <div className='flex items-center gap-1.5 px-4 h-9 border-b border-white/10'>
            <span className='w-2.5 h-2.5 rounded-full bg-white/10' />
            <span className='w-2.5 h-2.5 rounded-full bg-white/10' />
            <span className='w-2.5 h-2.5 rounded-full bg-white/10' />
            <span className='ml-3 text-xs font-mono text-zinc-500'>Post.tsx</span>
          </div>
          <CodeBlock code={snippet} />
        </div>
      </section>

      <section className='relative max-w-6xl mx-auto px-5 pb-20 grid sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        {FEATURES.map(f => (
          <div key={f.title} className='rounded-xl border border-white/10 bg-white/[.02] p-5'>
            <h3 className='font-semibold text-white'>{f.title}</h3>
            <p className='mt-2 text-sm text-zinc-400 leading-relaxed'>{f.body}</p>
          </div>
        ))}
      </section>

      <section id='exercises' className='relative max-w-6xl mx-auto px-5 pb-24 scroll-mt-8'>
        <h2 className='text-2xl font-bold text-white'>Exercises</h2>
        <p className='mt-2 text-zinc-400'>Start from the beginning, or jump to the topic you want to learn. Your progress is saved in this browser.</p>
        <ExerciseGrid
          items={exercises.map(e => ({ slug: e.slug, number: e.number, title: e.title, summary: e.summary, tags: e.tags, bonus: !!e.bonus, mode: e.mode }))}
        />
      </section>

      <footer className='border-t border-white/10'>
        <div className='max-w-6xl mx-auto px-5 py-8 text-sm text-zinc-500 flex flex-wrap gap-x-6 gap-y-2'>
          <span>
            Based on{' '}
            <a className='underline hover:text-zinc-300' href='https://github.com/sibelius/relay-workshop' target='_blank' rel='noreferrer'>
              sibelius/relay-workshop
            </a>
          </span>
          <span>
            Made by{' '}
            <a className='underline hover:text-zinc-300' href='https://github.com/sibelius' target='_blank' rel='noreferrer'>
              @sibelius
            </a>
          </span>
          <span className='sm:ml-auto'>Relay is an open source project by Meta. This site is not affiliated with Meta.</span>
        </div>
      </footer>
    </main>
  );
}
