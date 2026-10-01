import type { Exercise } from './types';
import { allTestsPass, testingNotes, testingProject, TESTING_HIDDEN } from './10-testUsePreloadQuery';

export const LIKE_SPEC = 'components/feed/like/__tests__/PostLikeButton.spec.tsx';

const spec = `import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { graphql, loadQuery, PreloadedQuery, usePreloadedQuery } from 'react-relay';
import { createMockEnvironment, MockPayloadGenerator } from 'relay-test-utils';

import PostLikeButton from '../PostLikeButton';
import { type WithProviders, withProviders } from '../../../../test/withProviders';

// TODO - import the compiled test query after you declare it below
// import PostLikeButtonSpecQuery from './__generated__/PostLikeButtonSpecQuery.graphql';

type RootProps = Pick<WithProviders, 'environment'> & {
  preloadedQuery: PreloadedQuery<any> | null;
};

export const getRoot = ({ preloadedQuery, environment }: RootProps) => {
  const UseQueryWrapper = () => {
    /**
     * TODO
     * add usePreloadedQuery of a test operation (PostLikeButtonSpecQuery)
     * using the @relay_test_operation directive
     */
    const data = {
      post: {},
    };

    return <PostLikeButton post={data.post} />;
  };

  return withProviders({
    Component: UseQueryWrapper,
    environment,
  });
};

it('should render post like button and likes count', async () => {
  const environment = createMockEnvironment();

  const postId = 'postId';
  const variables = {
    id: postId,
  };

  /**
   * TODO
   * properly mock resolvers
   */
  const customMockResolvers = {};

  /**
   * TODO
   * queue a pending operation, this would be a loadQuery call
   */

  /**
   * TODO
   * mock a queued operation
   */

  /**
   * TODO
   * loadQuery the test GraphQL operation
   */
  const preloadedQuery = null;

  const Root = getRoot({
    preloadedQuery,
    environment,
  });

  const { getByText, debug } = render(<Root />);

  // it should render likes count
  await waitFor(() => {
    expect(getByText('10')).toBeTruthy();
  });

  debug();
});
`;

export const likeSpecSolution = `import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { graphql, loadQuery, PreloadedQuery, usePreloadedQuery } from 'react-relay';
import { createMockEnvironment, MockPayloadGenerator } from 'relay-test-utils';

import PostLikeButton from '../PostLikeButton';
import { type WithProviders, withProviders } from '../../../../test/withProviders';

import PostLikeButtonSpecQuery from './__generated__/PostLikeButtonSpecQuery.graphql';

type RootProps = Pick<WithProviders, 'environment'> & {
  preloadedQuery: PreloadedQuery<any>;
};

export const getRoot = ({ preloadedQuery, environment }: RootProps) => {
  const UseQueryWrapper = () => {
    const data = usePreloadedQuery(
      graphql\`
        query PostLikeButtonSpecQuery($id: ID!) @relay_test_operation {
          post: node(id: $id) {
            ...PostLikeButton_post
          }
        }
      \`,
      preloadedQuery,
    );

    return <PostLikeButton post={data.post} />;
  };

  return withProviders({
    Component: UseQueryWrapper,
    environment,
  });
};

it('should render post like button and likes count', async () => {
  const environment = createMockEnvironment();

  const postId = 'postId';
  const variables = {
    id: postId,
  };

  const customMockResolvers = {
    Post: () => ({
      id: variables.id,
      meHasLiked: true,
      likesCount: 10,
    }),
  };

  // queue a pending operation, this is the loadQuery call below
  environment.mock.queuePendingOperation(PostLikeButtonSpecQuery, variables);

  // mock the queued operation
  environment.mock.queueOperationResolver(operation =>
    MockPayloadGenerator.generate(operation, customMockResolvers),
  );

  const preloadedQuery = loadQuery(environment, PostLikeButtonSpecQuery, variables, {
    fetchPolicy: 'store-or-network',
  });

  const Root = getRoot({
    preloadedQuery,
    environment,
  });

  const { getByText, getByTestId } = render(<Root />);

  // it should render likes count
  await waitFor(() => {
    expect(getByText('10')).toBeTruthy();
  });
  expect(getByTestId('likeButton')).toBeInTheDocument();
});

it('should not render likesCount when it is zero', async () => {
  const environment = createMockEnvironment();

  const variables = {
    id: 'postId',
  };

  const customMockResolvers = {
    Post: () => ({
      id: variables.id,
      likesCount: 0,
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

  const { findByTestId, queryByText } = render(<Root />);

  expect(await findByTestId('likeButton')).toBeInTheDocument();
  expect(queryByText(/[0-9]+/)).not.toBeInTheDocument();
});
`;

export const testUseFragmentNotes = `# Testing a component that has no query

When testing a component that has no query, only \`useFragment\`/\`usePaginationFragment\`/\`useRefetchableFragment\`,
you need to create a test Query to be able to mock and test them.

## Creating the wrapper test query

\`\`\`jsx
export const getRoot = ({ preloadedQuery, environment }) => {
  const UseQueryWrapper = () => {
    const data = usePreloadedQuery(
      graphql\`
        query PostLikeButtonSpecQuery($id: ID!) @relay_test_operation {
          post: node(id: $id) {
            ...PostLikeButton_post
          }
        }
      \`,
      preloadedQuery,
    );

    return <PostLikeButton post={data.post} />;
  };

  return withProviders({ Component: UseQueryWrapper, environment });
};
\`\`\`

We need to spread all fragments of the component being tested inside the test Query.
The rest is similar to testing a component that has a query.

\`@relay_test_operation\` tells the compiler this operation is only used in tests. In a regular project the compiler also emits type information for every selection, so \`MockPayloadGenerator\` can generate values with the right types (numbers for \`Int\`, booleans for \`Boolean\`, and so on).

> In this in-browser sandbox that type information is not available, so mock every field you assert on (e.g. \`likesCount: 10\`).

---

${testingNotes}`;

export const exercise11: Exercise = {
  slug: '11-testUseFragment',
  number: '11',
  title: 'test useFragment',
  summary: 'Test a fragment component (PostLikeButton) using a @relay_test_operation wrapper query.',
  tags: ['@relay_test_operation', 'relay-test-utils', 'MockPayloadGenerator', 'testing-library'],
  mode: 'test',
  activeFile: LIKE_SPEC,
  instructions: `# 11 - test useFragment

Learn how to test components using \`useFragment\` and \`@relay_test_operation\` with @testing-library.

\`PostLikeButton\` only has a fragment (\`PostLikeButton_post\`), so it can't be rendered by itself: we need a **test query** that spreads its fragment.

## Exercise

- [ ] render the \`PostLikeButton\` component using @testing-library
- [ ] use the \`withProviders\` helper to add all Providers for the component you want to test
- [ ] create a wrapper component that uses \`usePreloadedQuery\` with a test query using the \`@relay_test_operation\` directive
- [ ] mock the test query with \`queuePendingOperation\` + \`queueOperationResolver\`
- [ ] call \`loadQuery\` before rendering the component
- [ ] assert the post likes count

## Extras

- [ ] add another test (\`it\`), testing that when \`likesCount\` is zero there isn't any number in the DOM

## Code Helpers

- test operation

\`\`\`graphql
query PostLikeButtonSpecQuery($id: ID!) @relay_test_operation {
  post: node(id: $id) {
    ...PostLikeButton_post
  }
}
\`\`\`

- import the compiled artifact of the test query

\`\`\`js
import PostLikeButtonSpecQuery from './__generated__/PostLikeButtonSpecQuery.graphql';
\`\`\``,
  notes: testUseFragmentNotes,
  hints: [
    'Inside `UseQueryWrapper`: `const data = usePreloadedQuery(graphql`query PostLikeButtonSpecQuery($id: ID!) @relay_test_operation { post: node(id: $id) { ...PostLikeButton_post } }`, preloadedQuery);`',
    'Uncomment the `import PostLikeButtonSpecQuery from \'./__generated__/PostLikeButtonSpecQuery.graphql\'` line once the query exists.',
    'Mock the Post: `const customMockResolvers = { Post: () => ({ id: variables.id, meHasLiked: true, likesCount: 10 }) }`.',
    '`environment.mock.queuePendingOperation(PostLikeButtonSpecQuery, variables)`, `environment.mock.queueOperationResolver(op => MockPayloadGenerator.generate(op, customMockResolvers))` and then `const preloadedQuery = loadQuery(environment, PostLikeButtonSpecQuery, variables)`.',
  ],
  files: {
    ...testingProject(),
    [LIKE_SPEC]: spec,
  },
  solution: {
    [LIKE_SPEC]: likeSpecSolution,
  },
  hiddenFiles: TESTING_HIDDEN,
  checks: [
    {
      title: 'The spec declares PostLikeButtonSpecQuery with @relay_test_operation',
      run: ({ source, assert }) => {
        const code = source(LIKE_SPEC);
        assert(/query\s+PostLikeButtonSpecQuery\b/.test(code), 'Declare a `query PostLikeButtonSpecQuery($id: ID!)` inside the spec');
        assert(/@relay_test_operation/.test(code), 'Add the @relay_test_operation directive to the test query');
        assert(/\.\.\.\s*PostLikeButton_post/.test(code), 'Spread ...PostLikeButton_post inside the test query');
      },
    },
    {
      title: 'The wrapper renders PostLikeButton with usePreloadedQuery + loadQuery',
      run: ({ source, assert }) => {
        const code = source(LIKE_SPEC);
        assert(/usePreloadedQuery\s*(<[^>]*>)?\s*\(/.test(code), 'Use usePreloadedQuery inside the UseQueryWrapper');
        assert(/loadQuery\s*(<[^>]*>)?\s*\(/.test(code), 'Call loadQuery(environment, PostLikeButtonSpecQuery, variables) before rendering');
      },
    },
    {
      title: 'The test query is mocked with MockPayloadGenerator',
      run: ({ source, assert }) => {
        const code = source(LIKE_SPEC);
        assert(/\.queuePendingOperation\s*\(/.test(code) && /\.queueOperationResolver\s*\(/.test(code), 'Use environment.mock.queuePendingOperation + queueOperationResolver before loadQuery');
        assert(/MockPayloadGenerator\.generate\s*\(/.test(code), 'Generate the payload with MockPayloadGenerator.generate(operation, customMockResolvers)');
        assert(/likesCount\s*:/.test(code), 'Mock the likesCount of the Post in your mock resolvers');
      },
    },
    {
      title: 'All tests pass',
      run: ctx => allTestsPass(ctx),
    },
  ],
};
