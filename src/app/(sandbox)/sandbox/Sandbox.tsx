'use client';

import { useEffect, useState } from 'react';
import type { ParentToSandbox, SandboxToParent } from '@/lib/engine/protocol';
import { getExercise } from '@/exercises';

const post = (msg: SandboxToParent) => window.parent.postMessage({ source: 'learn-relay-sandbox', ...msg }, '*');

// the sandbox runs user code inside an iframe, so each run starts from a clean page
export default function Sandbox() {
  const [error, setError] = useState<{ message: string; stack?: string } | null>(null);

  useEffect(() => {
    let project: Awaited<ReturnType<typeof import('@/lib/engine/runtime').runProject>> | null = null;
    let started = false;

    const reportError = (message: string, stack?: string) => {
      setError({ message, stack });
      post({ type: 'runtime-error', message, stack });
    };

    const onError = (event: ErrorEvent) => {
      const err = event.error ?? event.message;
      reportError(err?.message ?? String(err), err?.stack);
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const err = event.reason;
      if (err?.reported) return;
      reportError(err?.message ?? String(err), err?.stack);
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    const onMessage = async (event: MessageEvent<ParentToSandbox>) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'run' && !started) {
        started = true;
        const exercise = getExercise(msg.slug);
        try {
          const { runProject } = await import('@/lib/engine/runtime');
          project = await runProject({
            files: msg.files,
            mode: msg.mode,
            checks: msg.runChecks ? (exercise?.checks ?? []) : null,
            latency: msg.latency,
            post,
          });
        } catch (e: any) {
          if (!e?.reported) reportError(e?.message ?? String(e), e?.stack);
        }
      }
      if (msg.type === 'simulate-post') project?.server.simulateNewPost();
      if (msg.type === 'set-latency') project?.setLatency(msg.latency);
    };
    window.addEventListener('message', onMessage);
    post({ type: 'ready' });

    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  if (!error) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 12,
        zIndex: 99999,
        background: '#1f1315',
        color: '#ffb4b4',
        border: '1px solid #7f1d1d',
        borderRadius: 10,
        padding: 14,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 12,
        maxHeight: '45%',
        overflow: 'auto',
        boxShadow: '0 10px 30px rgba(0,0,0,.35)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <strong style={{ color: '#fecaca' }}>Runtime error</strong>
        <button onClick={() => setError(null)} style={{ background: 'none', border: 0, color: '#fecaca', cursor: 'pointer' }}>
          ✕
        </button>
      </div>
      <pre style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>{error.message}</pre>
    </div>
  );
}
