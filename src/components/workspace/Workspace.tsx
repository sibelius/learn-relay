'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { exercises, getExercise } from '@/exercises';
import type { CheckResult, ConsoleEntry, NetworkEntry, ProjectFiles, SandboxToParent, TestResult } from '@/lib/engine/protocol';
import { clearFiles, loadDone, loadFiles, markDone, saveFiles } from '@/lib/progress';
import { TOKEN } from '@/exercises/shared';
import Logo from '../Logo';
import { ChecksPanel, ConsolePanel, NetworkPanel, StorePanel, TestsPanel } from './Panels';

const Editor = dynamic(() => import('./Editor'), {
  ssr: false,
  loading: () => <div className='flex-1 grid place-items-center text-sm text-zinc-500'>Loading editor…</div>,
});

type LeftTab = 'exercise' | 'notes' | 'hints' | 'solution';
type DevTab = 'checks' | 'tests' | 'network' | 'store' | 'console';

const LATENCIES = [0, 300, 800, 2000];

type Props = {
  slug: string;
  instructions: React.ReactNode;
  notes: React.ReactNode;
  hints: React.ReactNode[];
  solution: React.ReactNode[];
};

export default function Workspace({ slug, instructions, notes, hints, solution }: Props) {
  const exercise = getExercise(slug)!;
  const index = exercises.findIndex(e => e.slug === slug);
  const prev = exercises[index - 1];
  const next = exercises[index + 1];

  const [files, setFiles] = useState<ProjectFiles>(exercise.files);
  const [loaded, setLoaded] = useState(false);
  const [activeFile, setActiveFile] = useState(exercise.activeFile);
  const [leftTab, setLeftTab] = useState<LeftTab>('exercise');
  const [devTab, setDevTab] = useState<DevTab>(exercise.mode === 'test' ? 'tests' : 'checks');
  const [hintsShown, setHintsShown] = useState(0);
  const [runId, setRunId] = useState(0);
  const [runChecks, setRunChecks] = useState(false);
  const [latency, setLatency] = useState(300);
  const [autoRun, setAutoRun] = useState(true);
  const [done, setDone] = useState(false);
  const [mobilePane, setMobilePane] = useState<'learn' | 'code' | 'preview'>('learn');

  const [network, setNetwork] = useState<NetworkEntry[]>([]);
  const [store, setStore] = useState<Record<string, unknown>>({});
  const [logs, setLogs] = useState<ConsoleEntry[]>([]);
  const [checks, setChecks] = useState<CheckResult[]>(exercise.checks.map(c => ({ title: c.title, status: 'pending' })));
  const [checksDone, setChecksDone] = useState(false);
  const [tests, setTests] = useState<TestResult[]>([]);
  const [testsDone, setTestsDone] = useState(false);
  const [compileErrors, setCompileErrors] = useState<{ message: string }[]>([]);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const filesRef = useRef(files);
  filesRef.current = files;
  const runChecksRef = useRef(runChecks);
  runChecksRef.current = runChecks;
  const latencyRef = useRef(latency);
  latencyRef.current = latency;

  // restore saved progress
  useEffect(() => {
    const saved = loadFiles(slug);
    if (saved) setFiles({ ...exercise.files, ...saved });
    setDone(loadDone().includes(slug));
    setLoaded(true);
    setRunId(id => id + 1);
  }, [slug, exercise.files]);

  const run = useCallback((withChecks: boolean) => {
    setRunChecks(withChecks);
    setRunId(id => id + 1);
    if (withChecks) setDevTab('checks');
  }, []);

  // reset logs on every run
  useEffect(() => {
    setNetwork([]);
    setStore({});
    setLogs([]);
    setTests([]);
    setTestsDone(false);
    setCompileErrors([]);
    setRuntimeError(null);
    setChecksDone(false);
    setChecks(exercise.checks.map(c => ({ title: c.title, status: 'pending' })));
  }, [runId, exercise.checks]);

  // messages from the sandbox
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const msg = event.data as SandboxToParent & { source?: string };
      if (!msg || msg.source !== 'learn-relay-sandbox') return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      switch (msg.type) {
        case 'ready':
          iframeRef.current?.contentWindow?.postMessage(
            { type: 'run', slug, files: filesRef.current, mode: exercise.mode, runChecks: runChecksRef.current, latency: latencyRef.current },
            '*',
          );
          break;
        case 'network':
          setNetwork(list => {
            const i = list.findIndex(e => e.id === msg.entry.id);
            if (i >= 0) {
              const copy = [...list];
              copy[i] = msg.entry;
              return copy;
            }
            return [...list, msg.entry];
          });
          break;
        case 'store':
          setStore(msg.records);
          break;
        case 'console':
          setLogs(list => [...list.slice(-300), msg.entry]);
          break;
        case 'compile-error':
          setCompileErrors(msg.errors);
          break;
        case 'runtime-error':
          setRuntimeError(msg.message);
          setLogs(list => [...list, { level: 'error', message: msg.message, at: Date.now() }]);
          break;
        case 'tests':
          setTests(msg.results);
          setTestsDone(msg.done);
          break;
        case 'checks':
          setChecks(msg.results);
          setChecksDone(msg.done);
          if (msg.done && msg.results.every(r => r.status === 'passed')) {
            markDone(slug);
            setDone(true);
          }
          break;
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [slug, exercise.mode]);

  // auto run after typing
  const firstChange = useRef(true);
  useEffect(() => {
    if (!loaded) return;
    if (firstChange.current) {
      firstChange.current = false;
      return;
    }
    saveFiles(slug, files);
    if (!autoRun) return;
    const t = setTimeout(() => run(false), 900);
    return () => clearTimeout(t);
  }, [files, autoRun, loaded, slug, run]);

  // keyboard shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        run(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        run(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [run]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'set-latency', latency }, '*');
  }, [latency]);

  const fileList = useMemo(() => {
    const hidden = new Set(exercise.hiddenFiles ?? []);
    const all = Object.keys(files);
    const main = all.filter(f => !hidden.has(f)).sort((a, b) => (a === exercise.activeFile ? -1 : b === exercise.activeFile ? 1 : a.localeCompare(b)));
    const rest = all.filter(f => hidden.has(f)).sort();
    return { main, rest };
  }, [files, exercise.hiddenFiles, exercise.activeFile]);

  const reset = () => {
    if (!confirm('Reset all files of this exercise to the starter code?')) return;
    clearFiles(slug);
    setFiles(exercise.files);
    setActiveFile(exercise.activeFile);
  };

  const applySolution = () => {
    if (!confirm('Replace your code with the solution? (you can reset back to the starter code later)')) return;
    setFiles(f => ({ ...f, ...exercise.solution }));
    const first = Object.keys(exercise.solution)[0];
    if (first) setActiveFile(first);
  };

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(TOKEN);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      prompt('Copy your token', TOKEN);
    }
  };

  // exposed for the e2e verification script (scripts/verify.mjs)
  useEffect(() => {
    document.body.dataset.checks = JSON.stringify({ done: checksDone, results: checks, tests, compileErrors, runtimeError });
  }, [checks, checksDone, tests, compileErrors, runtimeError]);

  const passed = checks.filter(c => c.status === 'passed').length;
  const usesSubscription = /subscription/i.test(exercise.tags.join(' ')) || Object.keys(files).some(f => /Subscription/.test(f));

  return (
    <div className='h-dvh flex flex-col bg-[#0b0d12] text-zinc-200 overflow-hidden'>
      {/* top bar */}
      <header className='h-12 shrink-0 border-b border-white/10 flex items-center gap-3 px-3'>
        <Link href='/' className='flex items-center gap-2 shrink-0' aria-label='Learn Relay home'>
          <Logo className='w-6 h-6' />
          <span className='font-semibold hidden sm:inline'>Learn Relay</span>
        </Link>
        <span className='text-zinc-600 hidden sm:inline'>/</span>
        <select
          className='bg-transparent text-sm font-medium outline-none min-w-0 max-w-[50vw] truncate cursor-pointer'
          value={slug}
          onChange={e => (window.location.href = `/exercises/${e.target.value}`)}
          aria-label='Choose exercise'
        >
          {exercises.map(e => (
            <option key={e.slug} value={e.slug} className='bg-zinc-900'>
              {e.number} · {e.title}
            </option>
          ))}
        </select>
        {done && <span className='text-xs rounded-full bg-emerald-500/15 text-emerald-300 px-2 py-0.5 shrink-0'>✓ solved</span>}
        <div className='ml-auto flex items-center gap-1.5'>
          {prev && (
            <Link href={`/exercises/${prev.slug}`} className='btn-ghost hidden md:inline-flex' title={prev.title}>
              ← {prev.number}
            </Link>
          )}
          {next && (
            <Link href={`/exercises/${next.slug}`} className='btn-ghost hidden md:inline-flex' title={next.title}>
              {next.number} →
            </Link>
          )}
          <button className='btn-ghost' onClick={() => run(false)} title='Run (⌘S)'>
            ▶ Run
          </button>
          <button className='btn-primary' onClick={() => run(true)} title='Check my solution (⌘⏎)'>
            ✓ Check
          </button>
        </div>
      </header>

      {/* mobile pane switcher */}
      <div className='lg:hidden flex border-b border-white/10 text-sm'>
        {(['learn', 'code', 'preview'] as const).map(p => (
          <button key={p} onClick={() => setMobilePane(p)} className={`flex-1 py-2 capitalize ${mobilePane === p ? 'text-white border-b-2 border-[#F26B00]' : 'text-zinc-500'}`}>
            {p}
          </button>
        ))}
      </div>

      <div className='flex-1 min-h-0 grid lg:grid-cols-[minmax(300px,24%)_minmax(0,1fr)_minmax(0,1fr)]'>
        {/* left: instructions */}
        <aside className={`min-h-0 flex-col border-r border-white/10 ${mobilePane === 'learn' ? 'flex' : 'hidden'} lg:flex`}>
          <div className='flex border-b border-white/10 text-sm shrink-0'>
            {(['exercise', 'notes', 'hints', 'solution'] as const).map(t => (
              <button key={t} onClick={() => setLeftTab(t)} className={`tab ${leftTab === t ? 'tab-active' : ''}`}>
                {t}
              </button>
            ))}
          </div>
          <div className='flex-1 overflow-y-auto p-4'>
            {leftTab === 'exercise' && (
              <>
                {instructions}
                {exercise.mode === 'app' && /Authorization|token/i.test(exercise.instructions) && (
                  <div className='mt-4 rounded-lg border border-white/10 bg-white/[.03] p-3 text-sm'>
                    <div className='font-medium mb-1'>Your user token</div>
                    <p className='text-zinc-400 text-xs mb-2'>
                      The replacement for <code>pnpm get-token</code>. It logs you in as <b>Sibelius Seraphini</b>.
                    </p>
                    <code className='block break-all text-[11px] text-amber-200/90 bg-black/40 rounded p-2'>{TOKEN}</code>
                    <button className='btn-ghost mt-2' onClick={copyToken}>
                      {copied ? 'Copied!' : 'Copy token'}
                    </button>
                  </div>
                )}
                <div className='mt-6 flex gap-2'>
                  {next && (
                    <Link href={`/exercises/${next.slug}`} className={done ? 'btn-primary' : 'btn-ghost'}>
                      Next: {next.title} →
                    </Link>
                  )}
                </div>
              </>
            )}
            {leftTab === 'notes' && notes}
            {leftTab === 'hints' && (
              <div className='space-y-3'>
                {hints.slice(0, hintsShown).map((h, i) => (
                  <div key={i} className='rounded-lg border border-white/10 bg-white/[.03] p-3 text-sm'>
                    <div className='text-xs text-[#ff9a4d] mb-1'>Hint {i + 1}</div>
                    {h}
                  </div>
                ))}
                {hintsShown < exercise.hints.length ? (
                  <button className='btn-ghost' onClick={() => setHintsShown(n => n + 1)}>
                    Show hint {hintsShown + 1} of {exercise.hints.length}
                  </button>
                ) : (
                  <p className='text-sm text-zinc-500'>No more hints. Still stuck? Peek at the solution tab.</p>
                )}
              </div>
            )}
            {leftTab === 'solution' && (
              <div className='space-y-4'>
                <p className='text-sm text-zinc-400'>Try to solve it yourself first. Struggling is how you learn!</p>
                <button className='btn-primary' onClick={applySolution}>
                  Load solution in the editor
                </button>
                {solution}
              </div>
            )}
          </div>
        </aside>

        {/* middle: editor */}
        <section className={`min-h-0 min-w-0 flex-col border-r border-white/10 ${mobilePane === 'code' ? 'flex' : 'hidden'} lg:flex`}>
          <div className='flex items-center border-b border-white/10 shrink-0'>
            <div className='flex-1 flex overflow-x-auto no-scrollbar'>
              {fileList.main.map(f => (
                <button key={f} onClick={() => setActiveFile(f)} className={`file-tab ${activeFile === f ? 'file-tab-active' : ''}`}>
                  {f}
                </button>
              ))}
              {fileList.rest.length > 0 && (
                <select
                  className='bg-transparent text-xs text-zinc-500 px-2 outline-none cursor-pointer'
                  value={fileList.rest.includes(activeFile) ? activeFile : ''}
                  onChange={e => e.target.value && setActiveFile(e.target.value)}
                  aria-label='Other files'
                >
                  <option value='' className='bg-zinc-900'>
                    + {fileList.rest.length} more files
                  </option>
                  {fileList.rest.map(f => (
                    <option key={f} value={f} className='bg-zinc-900'>
                      {f}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <label className='text-xs text-zinc-500 flex items-center gap-1 px-2 shrink-0 cursor-pointer'>
              <input type='checkbox' checked={autoRun} onChange={e => setAutoRun(e.target.checked)} className='accent-[#F26B00]' />
              auto run
            </label>
            <button className='text-xs text-zinc-500 hover:text-zinc-200 px-3 shrink-0' onClick={reset}>
              reset
            </button>
          </div>
          {compileErrors.length > 0 && (
            <div className='shrink-0 max-h-40 overflow-auto bg-red-950/60 border-b border-red-900 text-red-200 text-xs font-mono p-3 space-y-1'>
              <div className='font-sans font-semibold text-red-300'>Relay compiler error</div>
              {compileErrors.map((e, i) => (
                <pre key={i} className='whitespace-pre-wrap'>
                  {e.message}
                </pre>
              ))}
            </div>
          )}
          <div className='flex-1 min-h-0 flex'>
            {files[activeFile] != null && (
              <Editor path={`${slug}/${activeFile}`} value={files[activeFile]} onChange={value => setFiles(f => ({ ...f, [activeFile]: value }))} />
            )}
          </div>
        </section>

        {/* right: preview + devtools */}
        <section className={`min-h-0 min-w-0 flex-col ${mobilePane === 'preview' ? 'flex' : 'hidden'} lg:flex`}>
          <div className='h-9 shrink-0 flex items-center gap-2 px-3 border-b border-white/10 text-xs text-zinc-400'>
            <span className='flex items-center gap-1.5'>
              <span className={`w-2 h-2 rounded-full ${runtimeError || compileErrors.length ? 'bg-red-500' : 'bg-emerald-500'}`} />
              {exercise.mode === 'test' ? 'test runner' : 'localhost:7500 · in-browser GraphQL server'}
            </span>
            <div className='ml-auto flex items-center gap-2'>
              {usesSubscription && exercise.mode === 'app' && (
                <button className='btn-ghost !py-0.5' onClick={() => iframeRef.current?.contentWindow?.postMessage({ type: 'simulate-post' }, '*')}>
                  + simulate new post
                </button>
              )}
              <label className='flex items-center gap-1'>
                latency
                <select value={latency} onChange={e => setLatency(Number(e.target.value))} className='bg-transparent outline-none text-zinc-200 cursor-pointer'>
                  {LATENCIES.map(l => (
                    <option key={l} value={l} className='bg-zinc-900'>
                      {l}ms
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className='flex-[3] min-h-0 bg-[#f6f7f9] relative'>
            {loaded && (
              <iframe
                key={runId}
                ref={iframeRef}
                src='/sandbox'
                title='Exercise preview'
                className='w-full h-full border-0 bg-[#f6f7f9]'
                sandbox='allow-scripts allow-same-origin allow-modals allow-forms'
              />
            )}
            {exercise.mode === 'test' && (
              <div className='absolute inset-0 pointer-events-none flex items-end justify-end p-2'>
                <span className='text-[10px] text-zinc-400 bg-white/80 rounded px-1.5 py-0.5'>components rendered by tests show up here</span>
              </div>
            )}
          </div>
          <div className='flex-[2] min-h-0 flex flex-col border-t border-white/10'>
            <div className='flex border-b border-white/10 text-xs shrink-0 overflow-x-auto no-scrollbar'>
              <DevTabButton id='checks' tab={devTab} setTab={setDevTab}>
                Checks {checksDone || passed ? <span className={passed === checks.length ? 'text-emerald-400' : 'text-zinc-500'}>{passed}/{checks.length}</span> : null}
              </DevTabButton>
              {exercise.mode === 'test' && (
                <DevTabButton id='tests' tab={devTab} setTab={setDevTab}>
                  Tests{' '}
                  {tests.length > 0 && (
                    <span className={tests.every(t => t.status === 'passed') ? 'text-emerald-400' : 'text-red-400'}>
                      {tests.filter(t => t.status === 'passed').length}/{tests.length}
                    </span>
                  )}
                </DevTabButton>
              )}
              <DevTabButton id='network' tab={devTab} setTab={setDevTab}>
                Network <span className='text-zinc-500'>{network.length || ''}</span>
              </DevTabButton>
              <DevTabButton id='store' tab={devTab} setTab={setDevTab}>
                Relay Store <span className='text-zinc-500'>{Object.keys(store).length || ''}</span>
              </DevTabButton>
              <DevTabButton id='console' tab={devTab} setTab={setDevTab}>
                Console {logs.some(l => l.level === 'error') ? <span className='text-red-400'>●</span> : null}
              </DevTabButton>
            </div>
            <div className='flex-1 min-h-0 overflow-auto'>
              {devTab === 'checks' && <ChecksPanel checks={checks} done={checksDone} running={runChecks} onCheck={() => run(true)} solved={done} next={next} />}
              {devTab === 'tests' && <TestsPanel tests={tests} done={testsDone} />}
              {devTab === 'network' && <NetworkPanel entries={network} />}
              {devTab === 'store' && <StorePanel records={store} />}
              {devTab === 'console' && <ConsolePanel logs={logs} />}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const DevTabButton = ({ id, tab, setTab, children }: { id: DevTab; tab: DevTab; setTab: (t: DevTab) => void; children: React.ReactNode }) => (
  <button onClick={() => setTab(id)} className={`tab whitespace-nowrap ${tab === id ? 'tab-active' : ''}`}>
    {children}
  </button>
);
