import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { exercises, getExercise } from '@/exercises';
import Workspace from '@/components/workspace/Workspace';
import Markdown from '@/components/Markdown';
import CodeBlock from '@/components/CodeBlock';

export const generateStaticParams = () => exercises.map(e => ({ slug: e.slug }));

export async function generateMetadata({ params }: PageProps<'/exercises/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const exercise = getExercise(slug);
  if (!exercise) return {};
  const title = `${exercise.number} · ${exercise.title}`;
  return {
    title,
    description: exercise.summary,
    openGraph: { title: `${title} | Learn Relay`, description: exercise.summary },
    twitter: { title: `${title} | Learn Relay`, description: exercise.summary },
  };
}

export default async function ExercisePage({ params }: PageProps<'/exercises/[slug]'>) {
  const { slug } = await params;
  const exercise = getExercise(slug);
  if (!exercise) notFound();
  // markdown and code are highlighted on the server and passed to the client workspace
  return (
    <Workspace
      key={slug}
      slug={slug}
      instructions={<Markdown>{exercise.instructions}</Markdown>}
      notes={<Markdown>{exercise.notes}</Markdown>}
      hints={exercise.hints.map((h, i) => (
        <Markdown key={i}>{h}</Markdown>
      ))}
      solution={Object.entries(exercise.solution).map(([file, code]) => (
        <div key={file} className='solution-code'>
          <div className='text-xs text-zinc-500 mb-1 font-mono'>{file}</div>
          <CodeBlock code={code} lang='tsx' />
        </div>
      ))}
    />
  );
}
