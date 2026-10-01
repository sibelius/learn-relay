'use client';

import type { ProjectFiles } from './engine/protocol';

const FILES_KEY = (slug: string) => `learn-relay:files:${slug}`;
const DONE_KEY = 'learn-relay:done';

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage may be unavailable (private mode)
  }
};

export const loadFiles = (slug: string): ProjectFiles | null => read<ProjectFiles | null>(FILES_KEY(slug), null);
export const saveFiles = (slug: string, files: ProjectFiles) => write(FILES_KEY(slug), files);
export const clearFiles = (slug: string) => {
  try {
    localStorage.removeItem(FILES_KEY(slug));
  } catch {
    // ignore
  }
};

export const loadDone = (): string[] => read<string[]>(DONE_KEY, []);
export const markDone = (slug: string) => {
  const done = new Set(loadDone());
  done.add(slug);
  write(DONE_KEY, [...done]);
  window.dispatchEvent(new Event('learn-relay:progress'));
};
