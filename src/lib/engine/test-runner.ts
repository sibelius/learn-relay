// A tiny jest/vitest compatible test runner that runs inside the sandbox
import type { TestResult } from './protocol';

type Fn = () => unknown | Promise<unknown>;
type TestCase = { name: string; fn: Fn; only?: boolean; skip?: boolean };

export const formatValue = (value: unknown): string => {
  if (value instanceof HTMLElement) return `<${value.tagName.toLowerCase()}>${value.textContent?.slice(0, 60) ?? ''}`;
  if (typeof value === 'function') return value.name ? `[Function ${value.name}]` : '[Function]';
  if (typeof value === 'string') return JSON.stringify(value);
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
};

const isEqual = (a: any, b: any): boolean => {
  if (Object.is(a, b)) return true;
  if (b && typeof b === 'object' && b.__asymmetricMatcher) return b.match(a);
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a).filter(k => a[k] !== undefined);
  const keysB = Object.keys(b).filter(k => b[k] !== undefined);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(k => isEqual(a[k], b[k]));
};

export class AssertionError extends Error {}

type MockFn = ((...args: any[]) => any) & {
  mock: { calls: any[][]; results: any[] };
  _isMockFunction: true;
  mockImplementation: (impl: (...args: any[]) => any) => MockFn;
  mockReturnValue: (v: any) => MockFn;
  mockResolvedValue: (v: any) => MockFn;
  mockClear: () => void;
  mockRestore: () => void;
};

export const fn = (impl?: (...args: any[]) => any): MockFn => {
  let implementation = impl;
  const mockFn: any = function (this: any, ...args: any[]) {
    mockFn.mock.calls.push(args);
    const result = implementation ? implementation.apply(this, args) : undefined;
    mockFn.mock.results.push({ type: 'return', value: result });
    return result;
  };
  mockFn.mock = { calls: [], results: [] };
  mockFn._isMockFunction = true;
  mockFn.mockImplementation = (i: any) => ((implementation = i), mockFn);
  mockFn.mockReturnValue = (v: any) => ((implementation = () => v), mockFn);
  mockFn.mockResolvedValue = (v: any) => ((implementation = () => Promise.resolve(v)), mockFn);
  mockFn.mockClear = () => {
    mockFn.mock.calls = [];
    mockFn.mock.results = [];
  };
  mockFn.mockRestore = () => {};
  return mockFn;
};

export const spyOn = (obj: any, method: string) => {
  const original = obj[method];
  const spy = fn(function (this: any, ...args: any[]) {
    return original?.apply(this, args);
  });
  spy.mockRestore = () => {
    obj[method] = original;
  };
  obj[method] = spy;
  return spy;
};

const makeMatchers = (actual: any, negate: boolean) => {
  const assert = (pass: boolean, message: string) => {
    if (pass === negate) throw new AssertionError(negate ? message.replace('expected', 'expected NOT') : message);
  };
  const isMock = (v: any) => v && v._isMockFunction;
  return {
    toBe: (expected: any) => assert(Object.is(actual, expected), `expected ${formatValue(actual)} to be ${formatValue(expected)}`),
    toEqual: (expected: any) => assert(isEqual(actual, expected), `expected ${formatValue(actual)} to equal ${formatValue(expected)}`),
    toStrictEqual: (expected: any) => assert(isEqual(actual, expected), `expected ${formatValue(actual)} to equal ${formatValue(expected)}`),
    toBeTruthy: () => assert(!!actual, `expected ${formatValue(actual)} to be truthy`),
    toBeFalsy: () => assert(!actual, `expected ${formatValue(actual)} to be falsy`),
    toBeNull: () => assert(actual === null, `expected ${formatValue(actual)} to be null`),
    toBeUndefined: () => assert(actual === undefined, `expected ${formatValue(actual)} to be undefined`),
    toBeDefined: () => assert(actual !== undefined, `expected value to be defined`),
    toContain: (item: any) => assert(actual?.includes?.(item), `expected ${formatValue(actual)} to contain ${formatValue(item)}`),
    toHaveLength: (n: number) => assert(actual?.length === n, `expected length ${actual?.length} to be ${n}`),
    toMatch: (re: RegExp | string) => assert(typeof actual === 'string' && (typeof re === 'string' ? actual.includes(re) : re.test(actual)), `expected ${formatValue(actual)} to match ${re}`),
    toBeGreaterThan: (n: number) => assert(actual > n, `expected ${actual} to be greater than ${n}`),
    toBeLessThan: (n: number) => assert(actual < n, `expected ${actual} to be less than ${n}`),
    toBeInTheDocument: () =>
      assert(actual instanceof Node && actual.ownerDocument?.contains(actual) === true, `expected element to be in the document`),
    toHaveTextContent: (text: string | RegExp) => {
      const content = (actual as HTMLElement)?.textContent ?? '';
      assert(typeof text === 'string' ? content.includes(text) : text.test(content), `expected element to have text content ${formatValue(String(text))}, got ${formatValue(content)}`);
    },
    toBeDisabled: () => assert(!!(actual as HTMLButtonElement)?.disabled, `expected element to be disabled`),
    toHaveBeenCalled: () => assert(isMock(actual) && actual.mock.calls.length > 0, `expected mock to have been called`),
    toHaveBeenCalledTimes: (n: number) =>
      assert(isMock(actual) && actual.mock.calls.length === n, `expected mock to have been called ${n} times, but it was called ${actual?.mock?.calls?.length ?? 0} times`),
    toHaveBeenCalledWith: (...args: any[]) =>
      assert(isMock(actual) && actual.mock.calls.some((c: any[]) => isEqual(c, args)), `expected mock to have been called with ${formatValue(args)}`),
    toThrow: (msg?: string) => {
      let threw = false;
      let error: any;
      try {
        actual();
      } catch (e) {
        threw = true;
        error = e;
      }
      assert(threw && (!msg || String(error?.message).includes(msg)), `expected function to throw${msg ? ` "${msg}"` : ''}`);
    },
  };
};

export const expect: any = (actual: any) => {
  const matchers: any = makeMatchers(actual, false);
  matchers.not = makeMatchers(actual, true);
  return matchers;
};
expect.any = (ctor: any) => ({ __asymmetricMatcher: true, match: (v: any) => v != null && (v.constructor === ctor || v instanceof ctor) });
expect.anything = () => ({ __asymmetricMatcher: true, match: (v: any) => v != null });
expect.stringContaining = (s: string) => ({ __asymmetricMatcher: true, match: (v: any) => typeof v === 'string' && v.includes(s) });
expect.objectContaining = (o: any) => ({ __asymmetricMatcher: true, match: (v: any) => v && Object.keys(o).every(k => isEqual(v[k], o[k])) });

export const createTestRunner = () => {
  const tests: TestCase[] = [];
  const beforeEachFns: Fn[] = [];
  const afterEachFns: Fn[] = [];
  const beforeAllFns: Fn[] = [];
  const afterAllFns: Fn[] = [];
  const prefix: string[] = [];

  const it: any = (name: string, testFn: Fn) => tests.push({ name: [...prefix, name].join(' › '), fn: testFn });
  it.only = (name: string, testFn: Fn) => tests.push({ name: [...prefix, name].join(' › '), fn: testFn, only: true });
  it.skip = (name: string, testFn: Fn) => tests.push({ name: [...prefix, name].join(' › '), fn: testFn, skip: true });
  it.todo = (name: string) => tests.push({ name: [...prefix, name].join(' › '), fn: () => {}, skip: true });

  const describe: any = (name: string, body: () => void) => {
    prefix.push(name);
    try {
      body();
    } finally {
      prefix.pop();
    }
  };
  describe.only = describe;
  describe.skip = () => {};

  const globals = {
    it,
    test: it,
    describe,
    expect,
    beforeEach: (f: Fn) => beforeEachFns.push(f),
    afterEach: (f: Fn) => afterEachFns.push(f),
    beforeAll: (f: Fn) => beforeAllFns.push(f),
    afterAll: (f: Fn) => afterAllFns.push(f),
  };

  const mockApi = {
    fn,
    spyOn,
    mock: () => {},
    clearAllMocks: () => {},
    resetAllMocks: () => {},
    restoreAllMocks: () => {},
    useFakeTimers: () => {},
    useRealTimers: () => {},
  };

  const run = async (onResult: (results: TestResult[]) => void, cleanup?: () => void) => {
    const results: TestResult[] = [];
    const hasOnly = tests.some(t => t.only);
    for (const f of beforeAllFns) await f();
    for (const t of tests) {
      if (t.skip || (hasOnly && !t.only)) continue;
      const start = performance.now();
      try {
        for (const f of beforeEachFns) await f();
        await t.fn();
        for (const f of afterEachFns) await f();
        results.push({ name: t.name, status: 'passed', duration: performance.now() - start });
      } catch (e: any) {
        // testing-library appends a DOM dump to its errors, keep only the message
        const message = String(e?.message ?? e).split('\n\nIgnored nodes')[0];
        results.push({ name: t.name, status: 'failed', error: message, duration: performance.now() - start });
      } finally {
        cleanup?.();
      }
      onResult([...results]);
    }
    for (const f of afterAllFns) await f();
    return results;
  };

  return { globals, mockApi, run, tests };
};
