import type { NetworkEntry, ProjectFiles, RunMode, TestResult } from '@/lib/engine/protocol';
import type { GraphQLServer } from '@/lib/engine/server';

export type CheckContext = {
  // DOM container where the exercise app is rendered
  root: HTMLElement;
  // @testing-library queries bound to the app root
  screen: any;
  user: any;
  fireEvent: any;
  waitFor: <T>(fn: () => T | Promise<T>, options?: { timeout?: number }) => Promise<T>;
  expect: any;
  files: ProjectFiles;
  // source code of a file with comments removed
  source: (path: string) => string;
  network: NetworkEntry[];
  clearNetwork: () => void;
  server: GraphQLServer;
  // the last Relay Environment created by the user code
  env: () => any;
  tests: TestResult[];
  sleep: (ms: number) => Promise<void>;
  assert: (condition: unknown, message: string) => void;
};

export type Check = {
  title: string;
  run: (ctx: CheckContext) => Promise<void> | void;
};

export type Exercise = {
  slug: string;
  number: string;
  title: string;
  // short description for cards
  summary: string;
  // which Relay APIs this exercise is about
  tags: string[];
  // markdown with the exercise instructions
  instructions: string;
  // markdown with the concepts behind the exercise
  notes: string;
  hints: string[];
  mode: RunMode;
  // file that is opened by default in the editor
  activeFile: string;
  files: ProjectFiles;
  solution: ProjectFiles;
  checks: Check[];
  // files that are part of the project but are boring (shown at the end of the file list)
  hiddenFiles?: string[];
  // true for exercises that are not part of the original workshop
  bonus?: boolean;
};
