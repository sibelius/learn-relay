'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { CheckResult, ConsoleEntry, NetworkEntry, TestResult } from '@/lib/engine/protocol';
import type { Exercise } from '@/exercises/types';

const Empty = ({ children }: { children: React.ReactNode }) => <div className='p-4 text-xs text-zinc-500'>{children}</div>;

const StatusIcon = ({ status }: { status: CheckResult['status'] | TestResult['status'] }) => {
  if (status === 'passed') return <span className='text-emerald-400'>✓</span>;
  if (status === 'failed') return <span className='text-red-400'>✕</span>;
  if (status === 'running') return <span className='inline-block w-3 h-3 rounded-full border-2 border-zinc-600 border-t-[#F26B00] animate-spin' />;
  return <span className='text-zinc-600'>○</span>;
};

export function ChecksPanel({
  checks,
  done,
  running,
  onCheck,
  solved,
  next,
}: {
  checks: CheckResult[];
  done: boolean;
  running: boolean;
  onCheck: () => void;
  solved: boolean;
  next?: Exercise;
}) {
  const allPassed = done && checks.every(c => c.status === 'passed');
  return (
    <div className='p-3 space-y-2 text-sm'>
      {allPassed && (
        <div className='rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 flex items-center gap-3'>
          <span className='text-2xl'>🎉</span>
          <div className='flex-1'>
            <div className='font-semibold text-emerald-300'>All checks passed!</div>
            <div className='text-xs text-zinc-400'>Try the extras, or move on to the next exercise.</div>
          </div>
          {next && (
            <Link href={`/exercises/${next.slug}`} className='btn-primary'>
              Next →
            </Link>
          )}
        </div>
      )}
      {!running && (
        <div className='flex items-center gap-3 text-xs text-zinc-400'>
          <span>Checks verify your solution against the running app.</span>
          <button onClick={onCheck} className='btn-primary ml-auto'>
            ✓ Check my solution
          </button>
        </div>
      )}
      <ul className='space-y-1.5'>
        {checks.map((c, i) => (
          <li key={i} className='rounded-md bg-white/[.03] border border-white/5 px-3 py-2'>
            <div className='flex items-center gap-2'>
              <StatusIcon status={c.status} />
              <span className={c.status === 'pending' ? 'text-zinc-500' : ''}>{c.title}</span>
            </div>
            {c.message && <pre className='mt-1.5 text-xs text-red-300 whitespace-pre-wrap font-mono'>{c.message}</pre>}
          </li>
        ))}
      </ul>
      {solved && !allPassed && <p className='text-xs text-emerald-400/70'>You solved this exercise before ✓</p>}
    </div>
  );
}

export function TestsPanel({ tests, done }: { tests: TestResult[]; done: boolean }) {
  if (!tests.length) return <Empty>{done ? 'No tests found. Write tests with it("...", () => {}) in a *.spec.tsx file.' : 'Running tests…'}</Empty>;
  const failed = tests.filter(t => t.status === 'failed').length;
  return (
    <div className='p-3 space-y-1.5 text-sm'>
      <div className={`text-xs ${failed ? 'text-red-400' : 'text-emerald-400'}`}>
        {done ? `Tests: ${failed ? `${failed} failed, ` : ''}${tests.length - failed} passed, ${tests.length} total` : 'Running…'}
      </div>
      {tests.map((t, i) => (
        <div key={i} className='rounded-md bg-white/[.03] border border-white/5 px-3 py-2'>
          <div className='flex items-center gap-2'>
            <StatusIcon status={t.status} />
            <span>{t.name}</span>
            <span className='ml-auto text-xs text-zinc-600'>{Math.round(t.duration)}ms</span>
          </div>
          {t.error && <pre className='mt-1.5 text-xs text-red-300 whitespace-pre-wrap font-mono'>{t.error}</pre>}
        </div>
      ))}
    </div>
  );
}

const KIND_COLORS: Record<string, string> = {
  query: 'text-sky-300 bg-sky-500/10',
  mutation: 'text-fuchsia-300 bg-fuchsia-500/10',
  subscription: 'text-emerald-300 bg-emerald-500/10',
  'subscription-event': 'text-emerald-300 bg-emerald-500/10',
  unknown: 'text-zinc-300 bg-zinc-500/10',
};

export function NetworkPanel({ entries }: { entries: NetworkEntry[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const entry = entries.find(e => e.id === selected);
  if (!entries.length) return <Empty>No GraphQL requests yet.</Empty>;
  return (
    <div className='flex h-full min-h-0 text-xs'>
      <ul className={`${entry ? 'w-2/5' : 'w-full'} overflow-auto border-r border-white/10`}>
        {entries.map(e => (
          <li key={e.id}>
            <button
              onClick={() => setSelected(e.id === selected ? null : e.id)}
              className={`w-full text-left px-3 py-1.5 flex items-center gap-2 border-b border-white/5 hover:bg-white/5 ${selected === e.id ? 'bg-white/10' : ''}`}
            >
              <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${KIND_COLORS[e.kind]}`}>{e.kind === 'subscription-event' ? 'event' : e.kind}</span>
              <span className='truncate font-mono'>{e.name}</span>
              <span className='ml-auto shrink-0 text-zinc-500'>
                {e.status === 'pending' ? '…' : e.status === 'error' ? <span className='text-red-400'>error</span> : e.duration != null ? `${e.duration}ms` : ''}
              </span>
              {e.authorized && <span title='Authorization header sent'>🔑</span>}
            </button>
          </li>
        ))}
      </ul>
      {entry && (
        <div className='flex-1 overflow-auto p-3 space-y-3 font-mono'>
          <Section title='Query'>{entry.query}</Section>
          <Section title='Variables'>{JSON.stringify(entry.variables ?? {}, null, 2)}</Section>
          <Section title='Response'>{entry.response ? JSON.stringify(entry.response, null, 2) : 'pending…'}</Section>
        </div>
      )}
    </div>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <div className='text-[10px] uppercase tracking-wide text-zinc-500 mb-1 font-sans'>{title}</div>
    <pre className='whitespace-pre-wrap break-all text-zinc-300'>{children}</pre>
  </div>
);

const decodeId = (id: string) => {
  try {
    const decoded = atob(id);
    return /^[A-Za-z]+:[\w-]+$/.test(decoded) ? decoded : null;
  } catch {
    return null;
  }
};

const Value = ({ value }: { value: any }) => {
  if (value && typeof value === 'object') {
    if ('__ref' in value) return <span className='text-[#ff9a4d]'>→ {value.__ref}</span>;
    if ('__refs' in value)
      return (
        <span className='text-[#ff9a4d]'>
          [{(value.__refs as string[]).length} refs] {(value.__refs as string[]).slice(0, 3).join(', ')}
          {(value.__refs as string[]).length > 3 ? '…' : ''}
        </span>
      );
    return <span className='text-zinc-400'>{JSON.stringify(value)}</span>;
  }
  if (typeof value === 'string') return <span className='text-amber-200'>&quot;{value}&quot;</span>;
  return <span className='text-sky-300'>{String(value)}</span>;
};

export function StorePanel({ records }: { records: Record<string, any> }) {
  const [filter, setFilter] = useState('');
  const ids = useMemo(() => Object.keys(records).filter(id => !filter || (id + JSON.stringify(records[id])).toLowerCase().includes(filter.toLowerCase())), [records, filter]);
  if (!Object.keys(records).length) return <Empty>The Relay store is empty. Records show up here after Relay fetches data.</Empty>;
  return (
    <div className='text-xs font-mono'>
      <div className='sticky top-0 bg-[#0b0d12] border-b border-white/10 p-2 flex items-center gap-2'>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder='filter records…'
          className='flex-1 bg-white/5 rounded px-2 py-1 outline-none font-sans'
        />
        <span className='text-zinc-500 font-sans'>{ids.length} records</span>
      </div>
      {ids.map(id => {
        const record = records[id] ?? {};
        const decoded = decodeId(id);
        return (
          <details key={id} className='border-b border-white/5 px-3 py-1.5'>
            <summary className='cursor-pointer select-none'>
              <span className='text-zinc-200'>{id}</span>
              <span className='text-zinc-500'> · {record.__typename}</span>
              {decoded && <span className='text-zinc-600'> · {decoded}</span>}
            </summary>
            <div className='pl-4 pt-1 space-y-0.5'>
              {Object.entries(record)
                .filter(([k]) => k !== '__id' && k !== '__typename')
                .map(([k, v]) => (
                  <div key={k} className='break-all'>
                    <span className='text-zinc-500'>{k}: </span>
                    <Value value={v} />
                  </div>
                ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

export function ConsolePanel({ logs }: { logs: ConsoleEntry[] }) {
  if (!logs.length) return <Empty>Console output from your code shows up here.</Empty>;
  return (
    <div className='font-mono text-xs'>
      {logs.map((l, i) => (
        <pre
          key={i}
          className={`px-3 py-1 border-b border-white/5 whitespace-pre-wrap break-all ${
            l.level === 'error' ? 'text-red-300 bg-red-500/5' : l.level === 'warn' ? 'text-amber-200 bg-amber-500/5' : l.level === 'info' ? 'text-zinc-500' : 'text-zinc-300'
          }`}
        >
          {l.message}
        </pre>
      ))}
    </div>
  );
}
