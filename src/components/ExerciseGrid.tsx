'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { loadDone } from '@/lib/progress';

type Item = { slug: string; number: string; title: string; summary: string; tags: string[]; bonus: boolean; mode: string };

export default function ExerciseGrid({ items }: { items: Item[] }) {
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => {
    const update = () => setDone(loadDone());
    update();
    window.addEventListener('learn-relay:progress', update);
    return () => window.removeEventListener('learn-relay:progress', update);
  }, []);

  const solved = items.filter(i => done.includes(i.slug)).length;

  return (
    <>
      <div className='mt-5 flex items-center gap-3 text-sm text-zinc-400'>
        <div className='h-1.5 w-48 rounded-full bg-white/10 overflow-hidden'>
          <div className='h-full bg-[#F26B00] transition-all' style={{ width: `${(solved / items.length) * 100}%` }} />
        </div>
        {solved}/{items.length} solved
      </div>
      <div className='mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4'>
        {items.map(e => {
          const isDone = done.includes(e.slug);
          return (
            <Link
              key={e.slug}
              href={`/exercises/${e.slug}`}
              className='group rounded-xl border border-white/10 bg-white/[.02] p-5 hover:border-[#F26B00]/60 hover:bg-white/[.04] transition-colors flex flex-col'
            >
              <div className='flex items-center gap-2'>
                <span className='font-mono text-sm text-[#ff9a4d]'>{e.number}</span>
                {e.bonus && <span className='text-[10px] uppercase tracking-wide rounded bg-violet-500/15 text-violet-300 px-1.5 py-0.5'>bonus</span>}
                {e.mode === 'test' && <span className='text-[10px] uppercase tracking-wide rounded bg-sky-500/15 text-sky-300 px-1.5 py-0.5'>testing</span>}
                {isDone && <span className='ml-auto text-xs text-emerald-400'>✓ solved</span>}
              </div>
              <h3 className='mt-2 font-semibold text-white group-hover:text-[#ffb27a]'>{e.title}</h3>
              <p className='mt-1.5 text-sm text-zinc-400 leading-relaxed flex-1'>{e.summary}</p>
              <div className='mt-4 flex flex-wrap gap-1.5'>
                {e.tags.map(t => (
                  <span key={t} className='text-[11px] font-mono rounded bg-white/5 px-1.5 py-0.5 text-zinc-400'>
                    {t}
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
