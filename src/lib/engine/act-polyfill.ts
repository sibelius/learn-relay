// Production builds of React don't ship act(), but @testing-library/react (used by tests and checks)
// needs it. This must be imported before @testing-library/react, which reads React.act on load.
import React from 'react';
import { flushSync } from 'react-dom';

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

const act = (callback: () => unknown) => {
  let result: unknown;
  // flushSync renders updates scheduled by the callback synchronously, like act does
  flushSync(() => {
    result = callback();
  });
  if (result && typeof (result as Promise<unknown>).then === 'function') {
    return (result as Promise<unknown>).then(async value => {
      await tick();
      flushSync(() => {});
      return value;
    });
  }
  return {
    then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => tick().then(() => resolve(result), reject),
  };
};

const ReactAny = React as any;
if (typeof ReactAny.act !== 'function') {
  ReactAny.act = act;
}

export {};
