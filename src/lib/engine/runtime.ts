// Runs an exercise project inside the sandbox iframe:
// compile graphql tags -> transpile TS/JSX -> evaluate modules -> render or run tests -> run checks
import './act-polyfill';
import * as React from 'react';
import ReactDefault from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import * as JSXRuntime from 'react/jsx-runtime';
import * as ReactRelay from 'react-relay';
import * as RelayRuntime from 'relay-runtime';
import * as RelayTestUtils from 'relay-test-utils';
import * as ReactRouter from 'react-router';
import * as TestingLibrary from '@testing-library/react';
import userEventModule from '@testing-library/user-event';
import { transform } from 'sucrase';

import { compile, extractGraphQLTags, initCompiler, replaceGraphQLTags, type Artifacts } from './compiler';
import { createServer, USER_TOKEN, type GraphQLServer } from './server';
import { schemaSDL } from './schema';
import * as UI from './ui';
import { createTestRunner, expect as expectFn, AssertionError } from './test-runner';
import type { CheckResult, NetworkEntry, ProjectFiles, RunMode, SandboxToParent, TestResult } from './protocol';
import type { Check, CheckContext } from '@/exercises/types';

type Post = (msg: SandboxToParent) => void;

const normalizePath = (path: string) => {
  const parts: string[] = [];
  for (const part of path.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return parts.join('/');
};

const dirname = (path: string) => path.split('/').slice(0, -1).join('/');

const EXTENSIONS = ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.js'];

const stripComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

export type RunOptions = {
  files: ProjectFiles;
  mode: RunMode;
  checks: Check[] | null;
  latency: number;
  post: Post;
};

export type RunningProject = {
  server: GraphQLServer;
  setLatency: (ms: number) => void;
};

const formatGraphQLName = (query: string) => {
  const m = query.match(/\b(query|mutation|subscription)\s+([_A-Za-z][_0-9A-Za-z]*)/);
  if (m) return { kind: m[1] as NetworkEntry['kind'], name: m[2] };
  if (/^\s*(\{|query\b)/.test(query)) return { kind: 'query' as const, name: 'anonymous query' };
  if (/^\s*mutation\b/.test(query)) return { kind: 'mutation' as const, name: 'anonymous mutation' };
  return { kind: 'unknown' as const, name: 'unknown' };
};

const headersToRecord = (headers: any): Record<string, string> => {
  if (!headers) return {};
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    const out: Record<string, string> = {};
    headers.forEach((v, k) => (out[k] = v));
    return out;
  }
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return { ...headers };
};

export const runProject = async ({ files, mode, checks, latency: initialLatency, post }: RunOptions): Promise<RunningProject> => {
  let latency = initialLatency;
  if (!document.getElementById('root')) {
    const rootEl = document.createElement('div');
    rootEl.id = 'root';
    document.body.prepend(rootEl);
  }
  const server = createServer();
  const network: NetworkEntry[] = [];
  let networkId = 0;
  const environments: any[] = [];

  const logNetwork = (entry: NetworkEntry) => {
    const index = network.findIndex(e => e.id === entry.id);
    if (index >= 0) network[index] = entry;
    else network.push(entry);
    post({ type: 'network', entry: JSON.parse(JSON.stringify(entry)) });
  };

  // ---- console proxy
  const originalConsole = { log: console.log, warn: console.warn, error: console.error, info: console.info };
  const stringify = (args: unknown[]) =>
    args
      .map(a => {
        if (typeof a === 'string') return a;
        if (a instanceof Error) return a.message;
        try {
          return JSON.stringify(a, null, 2);
        } catch {
          return String(a);
        }
      })
      .join(' ');
  (['log', 'warn', 'error', 'info'] as const).forEach(level => {
    console[level] = (...args: unknown[]) => {
      originalConsole[level](...args);
      const message = stringify(args);
      // React act() warnings are noisy inside the sandbox
      if (/not wrapped in act|ReactDOMTestUtils|act\(\.\.\.\)/.test(message)) return;
      post({ type: 'console', entry: { level, message, at: Date.now() } });
    };
  });

  // ---- fake GraphQL HTTP server: intercept fetch to /graphql
  const realFetch = window.fetch.bind(window);
  const isGraphQLUrl = (url: string) => /\/graphql\/?(\?.*)?$/.test(url) || url.includes(':7500');
  const sandboxFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (!isGraphQLUrl(url)) return realFetch(input as any, init);
    const headers = headersToRecord(init?.headers);
    let body: any = {};
    try {
      body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
    } catch {
      body = {};
    }
    const query: string = body.query ?? '';
    const { kind, name } = formatGraphQLName(query);
    const entry: NetworkEntry = {
      id: ++networkId,
      kind,
      name: body.operationName ?? name,
      query,
      variables: body.variables,
      authorized: Object.keys(headers).some(k => k.toLowerCase() === 'authorization' && !!headers[k]),
      status: 'pending',
      startedAt: Date.now(),
    };
    logNetwork(entry);
    await new Promise(r => setTimeout(r, latency));
    if ((init?.method ?? 'GET').toUpperCase() !== 'POST') {
      const response = { errors: [{ message: 'The GraphQL server only accepts POST requests, use method: "POST"' }] };
      logNetwork({ ...entry, status: 'error', response, duration: Date.now() - entry.startedAt });
      return new Response(JSON.stringify(response), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }
    const response = query ? server.execute(query, body.variables, headers) : { errors: [{ message: 'Must provide query string.' }] };
    logNetwork({ ...entry, status: response.errors ? 'error' : 'done', response, duration: Date.now() - entry.startedAt });
    return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  window.fetch = sandboxFetch as typeof fetch;

  // ---- graphql-ws compatible client talking to the in-browser server
  const graphqlWs = {
    createClient: (options: { url: string; connectionParams?: any }) => ({
      subscribe: (payload: { query: string; variables?: any; operationName?: string }, sink: { next: (v: any) => void; error: (e: any) => void; complete: () => void }) => {
        const params = typeof options.connectionParams === 'function' ? options.connectionParams() : (options.connectionParams ?? {});
        const headers: Record<string, string> = {};
        const auth = params?.authorization ?? params?.Authorization;
        if (auth) headers.authorization = auth;
        const { name } = formatGraphQLName(payload.query);
        const entry: NetworkEntry = {
          id: ++networkId,
          kind: 'subscription',
          name: payload.operationName ?? name,
          query: payload.query,
          variables: payload.variables,
          authorized: !!auth,
          status: 'pending',
          startedAt: Date.now(),
        };
        logNetwork(entry);
        const unsubscribe = server.subscribe(payload.query, payload.variables, headers, result => {
          logNetwork({
            id: ++networkId,
            kind: 'subscription-event',
            name: entry.name,
            query: payload.query,
            variables: payload.variables,
            authorized: !!auth,
            status: result.errors ? 'error' : 'done',
            response: result,
            startedAt: Date.now(),
            duration: 0,
          });
          sink.next(result);
        });
        return () => {
          unsubscribe();
          logNetwork({ ...entry, status: 'done', duration: Date.now() - entry.startedAt });
        };
      },
      dispose: () => {},
      on: () => () => {},
    }),
  };

  // ---- track Relay environments for the store inspector
  let storeTimer: any = null;
  const postStore = () => {
    if (storeTimer) return;
    storeTimer = setTimeout(() => {
      storeTimer = null;
      const env = environments[environments.length - 1];
      if (!env) return;
      try {
        post({ type: 'store', records: env.getStore().getSource().toJSON() });
      } catch {
        // ignore
      }
    }, 50);
  };
  const registerEnvironment = (env: any) => {
    environments.push(env);
    postStore();
  };
  class Environment extends RelayRuntime.Environment {
    constructor(config: any) {
      const userLog = config?.log;
      super({
        ...config,
        log: (event: any) => {
          userLog?.(event);
          if (event.name === 'store.notify.complete' || event.name === 'store.publish' || event.name === 'execute.complete') postStore();
        },
      });
      registerEnvironment(this);
    }
  }
  const createMockEnvironment = (...args: any[]) => {
    const env = (RelayTestUtils.createMockEnvironment as any)(...args);
    registerEnvironment(env);
    return env;
  };
  setInterval(postStore, 1000);

  // ---- compile graphql
  post({ type: 'console', entry: { level: 'info', message: 'Compiling GraphQL with relay-compiler (wasm)…', at: Date.now() } });
  await initCompiler();
  const documents: string[] = [];
  for (const code of Object.values(files)) documents.push(...extractGraphQLTags(stripComments(code)));
  const result = compile(schemaSDL, documents);
  if (!result.ok) {
    post({ type: 'compile-error', errors: result.errors });
    throw Object.assign(new Error('compile error'), { reported: true });
  }
  const artifacts: Artifacts = result.artifacts;
  post({ type: 'compiled', artifacts: Object.keys(artifacts) });

  const relayArtifact = (name: string) => {
    const artifact = artifacts[name];
    if (!artifact) throw new Error(`Relay artifact "${name}" was not found`);
    return artifact;
  };

  // ---- module system
  const esm = (mod: any, def?: any) => ({ ...mod, default: def ?? mod.default ?? mod, __esModule: true });
  const relayRuntimeModule = esm({ ...RelayRuntime, Environment, graphql: (strings: TemplateStringsArray) => relayArtifactFromTag(strings) });
  const relayArtifactFromTag = (strings: TemplateStringsArray) => {
    throw new Error(`graphql tag was not compiled: ${String(strings?.[0] ?? '').slice(0, 60)}`);
  };
  const reactRelayModule = esm({ ...ReactRelay });

  const runner = createTestRunner();
  const vitestModule = esm({ ...runner.globals, vi: runner.mockApi, jest: runner.mockApi });

  const workshopRelay = esm({
    connectionUpdater: ({ store, parentId, connectionName, edge, before = false }: any) => {
      if (!edge) return;
      const parentProxy = store.get(parentId);
      if (!parentProxy) return console.warn(`Parent proxy not found for "${parentId}"`);
      const conn = RelayRuntime.ConnectionHandler.getConnection(parentProxy, connectionName);
      if (!conn) return console.warn('maybe this connection is not in relay store: ', connectionName);
      if (before) RelayRuntime.ConnectionHandler.insertEdgeBefore(conn, edge);
      else RelayRuntime.ConnectionHandler.insertEdgeAfter(conn, edge);
    },
    connectionDeleteEdgeUpdater: ({ parentId, connectionName, nodeId, store }: any) => {
      const parentProxy = store.get(parentId);
      if (!parentProxy) return console.warn(`Parent proxy not found for "${parentId}"`);
      const conn = RelayRuntime.ConnectionHandler.getConnection(parentProxy, connectionName);
      if (!conn) return console.warn(`Connection ${connectionName} not found on ${parentId}`);
      RelayRuntime.ConnectionHandler.deleteNode(conn, nodeId);
    },
    useSubscription: ReactRelay.useSubscription,
  });

  const virtualModules: Record<string, any> = {
    // act comes from the patched default export (see act-polyfill)
    react: esm({ ...React, act: (ReactDefault as any).act }, ReactDefault),
    'react-dom': esm(ReactDOM),
    'react-dom/client': esm(ReactDOMClient),
    'react/jsx-runtime': JSXRuntime,
    'react/jsx-dev-runtime': JSXRuntime,
    'react-relay': reactRelayModule,
    'react-relay/hooks': reactRelayModule,
    'react-relay/lib/hooks': reactRelayModule,
    'relay-runtime': relayRuntimeModule,
    'relay-test-utils': esm({ ...RelayTestUtils, createMockEnvironment }),
    'react-router': esm(ReactRouter),
    'react-router-dom': esm(ReactRouter),
    '@testing-library/react': esm(TestingLibrary),
    '@testing-library/dom': esm(TestingLibrary),
    '@testing-library/user-event': esm({ userEvent: userEventModule }, userEventModule),
    '@testing-library/jest-dom': esm({}),
    vitest: vitestModule,
    '@jest/globals': vitestModule,
    'graphql-ws': esm(graphqlWs),
    '@workshop/ui': esm(UI),
    '@workshop/relay': workshopRelay,
    '@workshop/server': esm({ USER_TOKEN, getToken: () => USER_TOKEN }),
    'isomorphic-fetch': esm({}),
  };

  const cache = new Map<string, { exports: any }>();

  const resolveFile = (from: string, spec: string) => {
    const base = normalizePath(`${dirname(from)}/${spec}`);
    for (const ext of EXTENSIONS) {
      if (files[base + ext] != null) return base + ext;
    }
    return null;
  };

  const requireFrom = (from: string) => (spec: string) => {
    const generated = spec.match(/(?:^|\/)__generated__\/([_A-Za-z][_0-9A-Za-z]*)\.graphql(?:\.(?:ts|js))?$/);
    if (generated) {
      const artifact = relayArtifact(generated[1]);
      return { default: artifact, __esModule: true, ...artifact };
    }
    if (spec.startsWith('.') || spec.startsWith('/')) {
      const path = resolveFile(from, spec);
      if (!path) throw new Error(`Cannot find module '${spec}' from '${from}'`);
      return load(path);
    }
    if (spec in virtualModules) return virtualModules[spec];
    if (spec.startsWith('@mui/')) throw new Error(`'${spec}' is not available here, use components from '@workshop/ui'`);
    throw new Error(`Module '${spec}' is not available in the sandbox`);
  };

  const load = (path: string) => {
    const cached = cache.get(path);
    if (cached) return cached.exports;
    const module = { exports: {} as any };
    cache.set(path, module);
    let code: string;
    try {
      code = transform(replaceGraphQLTags(files[path]), {
        transforms: ['typescript', 'jsx', 'imports'],
        jsxRuntime: 'automatic',
        production: true,
        filePath: path,
      }).code;
    } catch (e: any) {
      throw Object.assign(new Error(`${path}: ${e.message}`), { file: path });
    }
    const fn = new Function('require', 'module', 'exports', '__relayArtifact', 'fetch', `${code}\n//# sourceURL=sandbox:///${path}`);
    fn(requireFrom(path), module, module.exports, relayArtifact, sandboxFetch);
    return module.exports;
  };

  // ---- run
  const testResults: TestResult[] = [];
  if (mode === 'test') {
    Object.assign(window as any, runner.globals, { jest: runner.mockApi, vi: runner.mockApi });
    const testFiles = Object.keys(files).filter(f => /\.(spec|test)\.(t|j)sx?$/.test(f));
    for (const file of testFiles) load(file);
    const results = await runner.run(
      r => post({ type: 'tests', results: r, done: false }),
      () => TestingLibrary.cleanup(),
    );
    testResults.push(...results);
    post({ type: 'tests', results, done: true });
  } else {
    load(files['index.tsx'] != null ? 'index.tsx' : Object.keys(files)[0]);
  }

  // ---- checks
  if (checks) {
    const results: CheckResult[] = checks.map(c => ({ title: c.title, status: 'pending' }));
    post({ type: 'checks', results: [...results], done: false });
    const root = document.getElementById('root') ?? document.body;
    const userEvent = userEventModule.setup();
    const ctx: CheckContext = {
      root,
      screen: TestingLibrary.within(root),
      user: userEvent,
      fireEvent: TestingLibrary.fireEvent,
      waitFor: (fn, options) => TestingLibrary.waitFor(fn as any, { timeout: Math.max(3000, latency * 4 + 2000), ...options }) as any,
      expect: expectFn,
      files,
      source: (path: string) => stripComments(files[path] ?? ''),
      network,
      clearNetwork: () => {
        network.length = 0;
      },
      server,
      env: () => environments[environments.length - 1],
      tests: testResults,
      sleep: ms => new Promise(r => setTimeout(r, ms)),
      assert: (condition, message) => {
        if (!condition) throw new AssertionError(message);
      },
    };
    for (let i = 0; i < checks.length; i++) {
      results[i] = { title: checks[i].title, status: 'running' };
      post({ type: 'checks', results: [...results], done: false });
      try {
        await checks[i].run(ctx);
        results[i] = { title: checks[i].title, status: 'passed' };
      } catch (e: any) {
        const message = String(e?.message ?? e).split('\n\nIgnored nodes')[0].split('\n\n<')[0];
        results[i] = { title: checks[i].title, status: 'failed', message: message.slice(0, 600) };
        // checks are sequential, mark the rest as pending
        post({ type: 'checks', results: [...results], done: true });
        return { server, setLatency: ms => (latency = ms) };
      }
      post({ type: 'checks', results: [...results], done: false });
    }
    post({ type: 'checks', results: [...results], done: true });
  }

  return { server, setLatency: ms => (latency = ms) };
};
