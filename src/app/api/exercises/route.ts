import { exercises } from '@/exercises';

// used by scripts/verify.mjs to run the solutions of every exercise
export const GET = () => Response.json(exercises.map(e => ({ slug: e.slug, solution: e.solution })));
