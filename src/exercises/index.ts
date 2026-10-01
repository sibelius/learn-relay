import type { Exercise } from './types';
import { exercise01 } from './01-fetchGraphql';
import { exercise02 } from './02-useLazyLoadQuery';
import { exercise03 } from './03-useFragment';
import { exercise04 } from './04-usePaginationFragment';
import { exercise05 } from './05-useMutation';
import { exercise06 } from './06-mutationUpdater';
import { exercise07 } from './07-useRefetchableFragment';
import { exercise08 } from './08-useSubscription';
import { exercise09 } from './09-usePreloadedQuery';
import { exercise10 } from './10-testUsePreloadQuery';
import { exercise11 } from './11-testUseFragment';
import { exercise12 } from './12-testUseMutation';
import { exercise13 } from './13-declarativeDirectives';
import { exercise14 } from './14-optimisticUpdates';
import { exercise15 } from './15-fetchPolicies';
import { exercise16 } from './16-relayStore';
import { exercise17 } from './17-required';

export const exercises: Exercise[] = [exercise01, exercise02, exercise03, exercise04, exercise05, exercise06, exercise07, exercise08, exercise09, exercise10, exercise11, exercise12, exercise13, exercise14, exercise15, exercise16, exercise17];

export const getExercise = (slug: string) => exercises.find(e => e.slug === slug);
