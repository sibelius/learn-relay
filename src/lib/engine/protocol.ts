// messages exchanged between the workspace (parent window) and the sandbox iframe

export type ProjectFiles = Record<string, string>;

export type NetworkEntry = {
  id: number;
  kind: 'query' | 'mutation' | 'subscription' | 'subscription-event' | 'unknown';
  name: string;
  query: string;
  variables: Record<string, unknown> | undefined;
  authorized: boolean;
  status: 'pending' | 'done' | 'error';
  response?: unknown;
  startedAt: number;
  duration?: number;
};

export type TestResult = {
  name: string;
  status: 'passed' | 'failed';
  error?: string;
  duration: number;
};

export type CheckResult = {
  title: string;
  status: 'passed' | 'failed' | 'running' | 'pending';
  message?: string;
};

export type ConsoleEntry = { level: 'log' | 'warn' | 'error' | 'info'; message: string; at: number };

export type RunMode = 'app' | 'test';

export type ParentToSandbox =
  | {
      type: 'run';
      slug: string;
      files: ProjectFiles;
      mode: RunMode;
      runChecks: boolean;
      latency: number;
    }
  | { type: 'simulate-post' }
  | { type: 'set-latency'; latency: number };

export type SandboxToParent =
  | { type: 'ready' }
  | { type: 'compile-error'; errors: { message: string; file?: string }[] }
  | { type: 'runtime-error'; message: string; stack?: string }
  | { type: 'network'; entry: NetworkEntry }
  | { type: 'store'; records: Record<string, unknown> }
  | { type: 'console'; entry: ConsoleEntry }
  | { type: 'tests'; results: TestResult[]; done: boolean }
  | { type: 'checks'; results: CheckResult[]; done: boolean }
  | { type: 'compiled'; artifacts: string[] };
