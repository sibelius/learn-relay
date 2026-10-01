import type { Exercise } from './types';
import { allTestsPass, testingNotes, testingProject, TESTING_HIDDEN } from './10-testUsePreloadQuery';
import { LIKE_SPEC, likeSpecSolution } from './11-testUseFragment';

// the spec of exercise 11 (solved) + fireEvent / act imports
const baseSpec = likeSpecSolution
  .replace("import React from 'react';", "import React, { act } from 'react';")
  .replace("import { render, waitFor } from '@testing-library/react';", "import { fireEvent, render, waitFor } from '@testing-library/react';");

const clickTest = `
it('click in the like button', async () => {
  const environment = createMockEnvironment();

  const variables = {
    id: 'postId',
  };

  const customMockResolvers = {
    Post: () => ({
      id: variables.id,
      likesCount: 289,
      meHasLiked: false,
    }),
  };

  environment.mock.queuePendingOperation(PostLikeButtonSpecQuery, variables);
  environment.mock.queueOperationResolver(operation =>
    MockPayloadGenerator.generate(operation, customMockResolvers),
  );

  const preloadedQuery = loadQuery(environment, PostLikeButtonSpecQuery, variables, {
    fetchPolicy: 'store-or-network',
  });

  const Root = getRoot({
    environment,
    preloadedQuery,
  });

  const { debug, findByTestId, findByText } = render(<Root />);

  expect(await findByText('289')).toBeInTheDocument();

  /**
   * TODO
   * Get the likeButton in the DOM using the testId (data-testid='likeButton')
   */

  /**
   * TODO
   * Click on the like button and assert the variables passed to the mutation operation
   */

  /**
   * TODO
   * Mock the mutation response (the server says the post now has 300 likes)
   * and assert the new likesCount
   */

  expect(await findByText('300')).toBeInTheDocument();
  debug();
});
`;

const clickTestSolution = `
it('click in the like button', async () => {
  const environment = createMockEnvironment();

  const variables = {
    id: 'postId',
  };

  const customMockResolvers = {
    Post: () => ({
      id: variables.id,
      likesCount: 289,
      meHasLiked: false,
    }),
  };

  environment.mock.queuePendingOperation(PostLikeButtonSpecQuery, variables);
  environment.mock.queueOperationResolver(operation =>
    MockPayloadGenerator.generate(operation, customMockResolvers),
  );

  const preloadedQuery = loadQuery(environment, PostLikeButtonSpecQuery, variables, {
    fetchPolicy: 'store-or-network',
  });

  const Root = getRoot({
    environment,
    preloadedQuery,
  });

  const { getByText, findByTestId, findByText } = render(<Root />);

  expect(await findByText('289')).toBeInTheDocument();

  const likeButton = await findByTestId('likeButton');

  fireEvent.click(likeButton);

  // wait the mutation to be called
  const mutationOperation = await waitFor(() => environment.mock.getMostRecentOperation());

  expect(mutationOperation.request.node.operation.name).toBe('PostLikeMutation');
  expect(mutationOperation.fragment.variables).toEqual({
    input: {
      post: variables.id,
    },
  });

  // the optimistic response is applied right away
  expect(getByText('290')).toBeInTheDocument();

  // resolve the mutation synchronously, the server says the post has 300 likes now
  act(() => {
    environment.mock.resolveMostRecentOperation(operation =>
      MockPayloadGenerator.generate(operation, {
        Post: () => ({
          id: variables.id,
          meHasLiked: true,
          likesCount: 300,
        }),
      }),
    );
  });

  expect(await findByText('300')).toBeInTheDocument();
});
`;

const notes = `# Testing mutations

Mutations usually happen when the user interacts with your app.
We need to simulate the user interaction and
assert the mutations are called with the right variables.

## Mutation testing flow

\`\`\`jsx
// render component
const { getByTestId } = render(<Root />);

// get the like button
const likeButton = getByTestId('likeButton');

// click the button that will call the mutation
fireEvent.click(likeButton);

// wait the mutation to be called
await waitFor(() => environment.mock.getMostRecentOperation());

// get the mutation (PostLikeMutation)
const mutationOperation = environment.mock.getMostRecentOperation();

// expect the mutation was called with the proper variables
expect(mutationOperation.fragment.variables.input).toEqual({
  post: postId,
});
\`\`\`

## Mocking the mutation response

The mock environment never talks to a server: the mutation stays pending until you resolve it.

\`\`\`jsx
act(() => {
  environment.mock.resolveMostRecentOperation(operation =>
    MockPayloadGenerator.generate(operation, {
      Post: () => ({ id: postId, meHasLiked: true, likesCount: 300 }),
    }),
  );
});
\`\`\`

\`PostLikeButton\` uses an \`optimisticResponse\`, so the DOM is updated *before* the mutation is resolved (\`likesCount + 1\`). After resolving the mutation, Relay replaces the optimistic data with the server data.

You can also reject a mutation to test the error flow (the optimistic update is rolled back):

\`\`\`jsx
environment.mock.rejectMostRecentOperation(new Error('Something went wrong'));
\`\`\`

## References

- https://relay.dev/docs/guides/testing-relay-components/
- https://react.dev/reference/react/act

---

${testingNotes}`;

export const exercise12: Exercise = {
  slug: '12-testUseMutation',
  number: '12',
  title: 'test useMutation',
  summary: 'Click the like button, assert the PostLikeMutation variables and mock the mutation response.',
  tags: ['relay-test-utils', 'getMostRecentOperation', 'resolveMostRecentOperation', 'fireEvent'],
  mode: 'test',
  activeFile: LIKE_SPEC,
  instructions: `# 12 - test useMutation

Learn how to test components that use \`useMutation\`.

The spec already has the tests from the previous exercise. Complete the \`click in the like button\` test.

## Exercise

- [ ] render the \`PostLikeButton\` component using @testing-library (same as 11-testUseFragment)
- [ ] click on the like button (\`data-testid='likeButton'\`)
- [ ] assert the mutation is called with the right variables
- [ ] mock the mutation response and assert the new \`likesCount\` in the DOM

## Extras

- [ ] assert the optimistic response (\`likesCount + 1\`) is rendered before resolving the mutation
- [ ] test clicking the button of a post you already liked (\`PostUnLikeMutation\`)

## Code Helpers

- click a button

\`\`\`jsx
fireEvent.click(likeButton);
\`\`\`

- wait the mutation to be called

\`\`\`jsx
await waitFor(() => environment.mock.getMostRecentOperation());
\`\`\`

- get the mutation operation

\`\`\`jsx
const mutationOperation = environment.mock.getMostRecentOperation();
mutationOperation.fragment.variables; // { input: { post: 'postId' } }
\`\`\`

- resolve the mutation

\`\`\`jsx
environment.mock.resolveMostRecentOperation(operation =>
  MockPayloadGenerator.generate(operation, customMockResolvers),
);
\`\`\`

### tricks for the mutation response

Don't resolve the mutation inside an asynchronous \`act\`: the mutation response must be synchronous (\`act(() => { ... })\`).`,
  notes,
  hints: [
    '`const likeButton = await findByTestId(\'likeButton\')` and then `fireEvent.click(likeButton)`.',
    '`const mutationOperation = await waitFor(() => environment.mock.getMostRecentOperation())` and `expect(mutationOperation.fragment.variables).toEqual({ input: { post: variables.id } })`.',
    'Resolve it: `act(() => { environment.mock.resolveMostRecentOperation(op => MockPayloadGenerator.generate(op, { Post: () => ({ id: variables.id, meHasLiked: true, likesCount: 300 }) })) })`.',
  ],
  files: {
    ...testingProject(),
    [LIKE_SPEC]: baseSpec + clickTest,
  },
  solution: {
    [LIKE_SPEC]: baseSpec + clickTestSolution,
  },
  hiddenFiles: TESTING_HIDDEN,
  checks: [
    {
      title: 'The test clicks the likeButton',
      run: ({ source, assert }) => {
        const code = source(LIKE_SPEC);
        assert(/(get|find|query)ByTestId\s*\(\s*['"`]likeButton['"`]/.test(code), "Get the button with getByTestId('likeButton') (or findByTestId)");
        assert(/(fireEvent|user|userEvent)\s*\.\s*click\s*\(/.test(code), 'Click the button with fireEvent.click(likeButton)');
      },
    },
    {
      title: 'The test asserts the mutation variables',
      run: ({ source, assert }) => {
        const code = source(LIKE_SPEC);
        assert(/\.getMostRecentOperation\s*\(/.test(code) || /\.getAllOperations\s*\(/.test(code), 'Get the mutation with environment.mock.getMostRecentOperation()');
        assert(/\.variables/.test(code), 'Assert the mutation variables, e.g. expect(mutationOperation.fragment.variables).toEqual({ input: { post: variables.id } })');
      },
    },
    {
      title: 'The test resolves the mutation with a mock response',
      run: ({ source, assert }) => {
        const code = source(LIKE_SPEC);
        assert(/\.resolveMostRecentOperation\s*\(|\.resolve\s*\(/.test(code), 'Resolve the mutation with environment.mock.resolveMostRecentOperation(...)');
      },
    },
    {
      title: 'All tests pass',
      run: ctx => allTestsPass(ctx),
    },
  ],
};
