import type { CheckContext, Exercise } from './types';
import { BASE_HIDDEN, relayProject } from './shared';

// ---- the app used by the testing exercises (10, 11 and 12)

const providers = `import React from 'react';
import { RelayEnvironmentProvider } from 'react-relay';
import { SnackbarProvider } from '@workshop/ui';

import Environment from './relay/Environment';

type Props = {
  children: React.ReactNode;
  // tests can provide a mock environment
  environment?: any;
};
const Providers = ({ children, environment }: Props) => {
  return (
    <RelayEnvironmentProvider environment={environment ?? Environment}>
      <SnackbarProvider>{children}</SnackbarProvider>
    </RelayEnvironmentProvider>
  );
};

export default Providers;
`;

const relayIndex = `export { default as Environment } from './Environment';
`;

const root = `import React, { Suspense } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import { routes } from './routes';

import Providers from './Providers';
import Loading from './Loading';
import ErrorBoundaryRetry from './ErrorBoundaryRetry';

const router = createMemoryRouter(routes);

const Root = () => {
  return (
    <Providers>
      <ErrorBoundaryRetry>
        <Suspense fallback={<Loading />}>
          <RouterProvider router={router} />
        </Suspense>
      </ErrorBoundaryRetry>
    </Providers>
  );
};

export default Root;
`;

const routes = `import React from 'react';
import { loadQuery } from 'react-relay';
import type { RouteObject } from 'react-router-dom';

import { Environment } from './relay';

import AppQuery from './__generated__/AppQuery.graphql';
import PostDetailQuery from './components/feed/post/__generated__/PostDetailQuery.graphql';

import App from './App';
import PostDetail from './components/feed/post/PostDetail';

export const routes: RouteObject[] = [
  {
    element: <App />,
    path: '/',
    loader: () => {
      return {
        appQuery: loadQuery(Environment, AppQuery, {}, { fetchPolicy: 'network-only' }),
      };
    },
  },
  {
    path: '/post/:id',
    element: <PostDetail />,
    loader: ({ params }) => {
      return {
        postDetailQuery: loadQuery(
          Environment,
          PostDetailQuery,
          { id: params.id },
          { fetchPolicy: 'store-or-network' },
        ),
      };
    },
  },
];
`;

const app = `import React from 'react';
import { Content, Flex, Text } from '@workshop/ui';
import { graphql, PreloadedQuery, usePreloadedQuery } from 'react-relay';
import { useLoaderData } from 'react-router-dom';

import Feed from './Feed';

type LoaderData = {
  appQuery: PreloadedQuery<any>;
};

const App = () => {
  const loadedData = useLoaderData() as LoaderData;

  const query = usePreloadedQuery(
    graphql\`
      query AppQuery {
        ...Feed_query
      }
    \`,
    loadedData.appQuery,
  );

  return (
    <Content>
      <Flex flexDirection='column'>
        <Text fontSize={20} fontWeight={700}>Posts</Text>
        <Feed query={query} />
      </Flex>
    </Content>
  );
};

export default App;
`;

const feed = `import React, { useCallback } from 'react';
import { Button, Flex } from '@workshop/ui';
import { graphql, usePaginationFragment } from 'react-relay';

import Post from './components/feed/post/Post';

type Props = {
  query: any;
};
const Feed = (props: Props) => {
  const { data, loadNext, isLoadingNext, hasNext } = usePaginationFragment(
    graphql\`
      fragment Feed_query on Query
      @argumentDefinitions(first: { type: Int, defaultValue: 3 }, after: { type: String })
      @refetchable(queryName: "FeedPaginationQuery") {
        posts(first: $first, after: $after) @connection(key: "Feed_posts", filters: []) {
          edges {
            node {
              id
              ...Post_post
            }
          }
        }
      }
    \`,
    props.query,
  );

  const loadMore = useCallback(() => {
    if (isLoadingNext) {
      return;
    }
    loadNext(3);
  }, [isLoadingNext, loadNext]);

  return (
    <Flex flexDirection='column'>
      {data.posts.edges.map(({ node }) => (
        <Post key={node.id} post={node} />
      ))}
      <Button mt='10px' onClick={loadMore} disabled={!hasNext || isLoadingNext}>
        {isLoadingNext ? 'Loading…' : 'Load More'}
      </Button>
    </Flex>
  );
};

export default Feed;
`;

const post = `import React from 'react';
import { useFragment, graphql } from 'react-relay';
import { Link } from 'react-router-dom';
import { Avatar, Card, CardActions, Flex, Text } from '@workshop/ui';

import PostLikeButton from '../like/PostLikeButton';

type Props = {
  post: any;
  isDetail?: boolean;
};
const Post = (props: Props) => {
  const { isDetail = false } = props;

  const post = useFragment(
    graphql\`
      fragment Post_post on Post {
        id
        content
        author {
          id
          name
        }
        ...PostLikeButton_post
      }
    \`,
    props.post,
  );

  const content = <Text mt='10px'>{post.content}</Text>;

  return (
    <Card mt='10px' p='12px'>
      <Flex alignItems='center' gap='8px'>
        <Avatar>{post.author?.name?.charAt(0) ?? '?'}</Avatar>
        <Text fontWeight={600}>{post.author?.name}</Text>
      </Flex>
      {isDetail ? content : <Link to={\`/post/\${post.id}\`} style={{ color: 'inherit', textDecoration: 'none' }}>{content}</Link>}
      <CardActions mt='8px'>
        <PostLikeButton post={post} />
      </CardActions>
    </Card>
  );
};

export default Post;
`;

const postDetail = `import React from 'react';
import { usePreloadedQuery, graphql, PreloadedQuery } from 'react-relay';
import { Link, useLoaderData } from 'react-router-dom';
import { Card, Content, Text } from '@workshop/ui';

import Post from './Post';

type LoaderData = {
  postDetailQuery: PreloadedQuery<any>;
};

const PostDetail = () => {
  // get data preloaded in the route loader (routes.tsx)
  const loadedData = useLoaderData() as LoaderData;

  const data = usePreloadedQuery(
    graphql\`
      query PostDetailQuery($id: ID!) {
        post: node(id: $id) {
          ...Post_post
        }
      }
    \`,
    loadedData.postDetailQuery,
  );

  const { post } = data;

  if (!post) {
    return (
      <Content>
        <Card p='20px' alignItems='center' justifyContent='center'>
          <Text>Post not found</Text>
        </Card>
      </Content>
    );
  }

  return (
    <Content>
      <Text as='h1' fontSize={20} fontWeight={700}>PostDetail</Text>
      <Link to='/'>← back</Link>
      <Post post={post} isDetail={true} />
    </Content>
  );
};

export default PostDetail;
`;

const postLikeButton = `import React from 'react';
import { useFragment, graphql, useMutation } from 'react-relay';
import { FavoriteBorderIcon, FavoriteIcon, IconButton, Text, theme } from '@workshop/ui';

import { likeOptimisticResponse, PostLike } from './PostLikeMutation';
import { PostUnLike, unlikeOptimisticResponse } from './PostUnLikeMutation';

type Props = {
  post: any;
};
const PostLikeButton = (props: Props) => {
  const post = useFragment(
    graphql\`
      fragment PostLikeButton_post on Post {
        id
        meHasLiked
        likesCount
      }
    \`,
    props.post,
  );

  const [postLike] = useMutation(PostLike);
  const [postUnLike] = useMutation(PostUnLike);

  const Icon = post.meHasLiked ? FavoriteIcon : FavoriteBorderIcon;

  const handleLike = () => {
    const config = {
      variables: {
        input: {
          post: post.id,
        },
      },
      optimisticResponse: post.meHasLiked ? unlikeOptimisticResponse(post) : likeOptimisticResponse(post),
    };

    const mutationFn = post.meHasLiked ? postUnLike : postLike;

    mutationFn(config);
  };

  return (
    <>
      <IconButton data-testid='likeButton' aria-label='like' onClick={handleLike}>
        <Icon style={{ color: post.meHasLiked ? theme.relayOrange : theme.relayDark }} />
      </IconButton>
      {post.likesCount > 0 ? <Text>{post.likesCount}</Text> : null}
    </>
  );
};

export default PostLikeButton;
`;

const postLikeMutation = `import { graphql } from 'react-relay';

export const PostLike = graphql\`
  mutation PostLikeMutation($input: PostLikeInput!) {
    PostLike(input: $input) {
      success
      error
      post {
        meHasLiked
        likesCount
      }
    }
  }
\`;

export const likeOptimisticResponse = post => ({
  PostLike: {
    success: '',
    error: null,
    post: {
      id: post.id,
      meHasLiked: true,
      likesCount: post.likesCount + 1,
    },
  },
});
`;

const postUnLikeMutation = `import { graphql } from 'react-relay';

export const PostUnLike = graphql\`
  mutation PostUnLikeMutation($input: PostUnLikeInput!) {
    PostUnLike(input: $input) {
      success
      error
      post {
        meHasLiked
        likesCount
      }
    }
  }
\`;

export const unlikeOptimisticResponse = post => ({
  PostUnLike: {
    success: '',
    error: null,
    post: {
      id: post.id,
      meHasLiked: false,
      likesCount: post.likesCount - 1,
    },
  },
});
`;

const withProviders = `import React, { Suspense } from 'react';
import { createMemoryRouter, RouteObject, RouterProvider } from 'react-router-dom';

import ErrorBoundary from '../ErrorBoundaryRetry';
import Providers from '../Providers';

export type WithProviders = {
  // the mock environment created with createMockEnvironment()
  environment: any;
  // a component to render (used when testing a single component)
  Component?: React.ComponentType;
  // routes to render (used when testing a route with a loader)
  routes?: RouteObject[];
  initialEntries?: string[];
};

/**
 * add all the Providers the app needs (Relay, router, Suspense, ErrorBoundary)
 * to make tests as close to the real usage as possible
 */
export const withProviders = ({ environment, Component, routes, initialEntries = ['/'] }: WithProviders) => {
  const testRoutes: RouteObject[] = routes ?? [{ path: '*', element: Component ? <Component /> : null }];

  const router = createMemoryRouter(testRoutes, {
    initialEntries,
    initialIndex: 0,
  });

  return () => {
    return (
      <Providers environment={environment}>
        <ErrorBoundary>
          <Suspense fallback={'Loading fallback...'}>
            <RouterProvider router={router} />
          </Suspense>
        </ErrorBoundary>
      </Providers>
    );
  };
};
`;

export const testingProject = () => ({
  ...relayProject({ withToken: true }),
  'Providers.tsx': providers,
  'Root.tsx': root,
  'relay/index.tsx': relayIndex,
  'routes.tsx': routes,
  'App.tsx': app,
  'Feed.tsx': feed,
  'components/feed/post/Post.tsx': post,
  'components/feed/post/PostDetail.tsx': postDetail,
  'components/feed/like/PostLikeButton.tsx': postLikeButton,
  'components/feed/like/PostLikeMutation.tsx': postLikeMutation,
  'components/feed/like/PostUnLikeMutation.tsx': postUnLikeMutation,
  'test/withProviders.tsx': withProviders,
});

export const TESTING_HIDDEN = [...BASE_HIDDEN, 'relay/index.tsx', 'components/feed/like/PostLikeMutation.tsx', 'components/feed/like/PostUnLikeMutation.tsx'];

// ---- helpers for checks of the testing exercises
export const allTestsPass = ({ tests, assert }: CheckContext) => {
  assert(tests.length > 0, 'No tests were found. Write your tests with it("...", async () => { ... })');
  const failed = tests.filter(t => t.status === 'failed');
  assert(failed.length === 0, `${failed.length} test(s) failing:\n${failed.map(t => `• ${t.name}: ${t.error ?? ''}`).join('\n')}`);
};

export const testingNotes = `# Testing components with Relay

We are going to test our components using [Testing Library](https://testing-library.com/).
Testing Library lets us test our code similar to how the user interacts with it.
We are going to focus on unit testing and integration testing.
Unit testing is when you test a single component.
Integration testing is when you test a group of components.

## How to test

We should render our components,
assert the native nodes (DOM on web),
interact with native nodes
and assert the final native nodes state is correct.

## Why not use a real GraphQL server

- A real server would make your tests slow (they are async)
- A real server would cause your tests to be flaky
- A real server would make it hard to test all different scenarios
- A real server would make it hard to make tests run in parallel

## Testing components that use Relay

Relay provides the \`relay-test-utils\` package that helps us mock Relay data in tests.
It provides \`createMockEnvironment\`, \`MockPayloadGenerator\` and the \`@relay_test_operation\` directive.

### createMockEnvironment

\`createMockEnvironment\` creates a test Environment that resolves GraphQL operations in a sync way.
After rendering a component that needs a GraphQL operation you can mock the operation like this:

\`\`\`jsx
environment.mock.resolveMostRecentOperation(operation =>
  MockPayloadGenerator.generate(operation, customMockResolvers),
);
\`\`\`

\`resolveMostRecentOperation\` will resolve the most recent GraphQL operation.
The component will be rendered using the data returned from it.

### MockPayloadGenerator

\`MockPayloadGenerator\` generates a mock payload based on some mock resolvers.
A mock resolver only needs to mock what is needed for the test scenario.
For instance, if you need a specific \`Post\` content, you can mock like this:

\`\`\`jsx
const mockResolvers = {
  Post: () => ({
    content: 'Welcome to Relay Workshop',
  }),
};
\`\`\`

### @relay_test_operation directive

\`@relay_test_operation\` is used to generate queries only used for tests.
This is useful when testing components that do not have a query themselves,
like fragment components (\`useFragment\`, \`usePaginationFragment\` and \`useRefetchableFragment\`).

\`\`\`graphql
query PostLikeButtonSpecQuery($id: ID!) @relay_test_operation {
  post: node(id: $id) {
    ...PostLikeButton_post
  }
}
\`\`\`

## Basic test flow

\`\`\`jsx
// render component
const { getByText } = render(<Post />);

const customMockResolvers = {
  Post: () => ({
    content: 'Welcome to',
  }),
};
// resolve the component query (ComponentQuery) using a mock generator
environment.mock.resolveMostRecentOperation(operation =>
  MockPayloadGenerator.generate(operation, customMockResolvers),
);

// assert DOM contains the component content
expect(getByText('Welcome to')).toBeTruthy();
\`\`\`

### Testing preloadQuery code

When testing \`loadQuery\` (preloadQuery) code you need to mock and resolve an operation **before** calling \`loadQuery\`:

\`\`\`jsx
// queue a pending operation to be resolved
environment.mock.queuePendingOperation(PostDetailQuery, variables);

// resolve the queued operation from above
environment.mock.queueOperationResolver(operation =>
  MockPayloadGenerator.generate(operation, customMockResolvers),
);

// call loadQuery (here it happens inside the route loader)
loadQuery(environment, PostDetailQuery, variables, {
  fetchPolicy: 'store-or-network',
});

// render component
const { findByText } = render(<Root />);

// assert DOM contains the component content
expect(await findByText('Welcome to')).toBeTruthy();
\`\`\`

As you can see, you mock and resolve the operation before calling \`loadQuery\`.

> Running inside the browser: the in-browser Relay compiler does not emit the type metadata of \`@relay_test_operation\`, so \`MockPayloadGenerator\` generates strings like \`<mock-value-for-field-"likesCount">\` for fields you don't mock. Always mock the fields your assertions depend on.

## References

- https://testing-library.com/docs/react-testing-library/intro
- https://relay.dev/docs/guides/testing-relay-components/`;

// ---- exercise 10

const SPEC = 'components/feed/post/__tests__/PostDetail.spec.tsx';

const spec = `import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { createMockEnvironment, MockPayloadGenerator } from 'relay-test-utils';
import { loadQuery } from 'react-relay';
import type { RouteObject } from 'react-router-dom';

import PostDetail from '../PostDetail';
import PostDetailQuery from '../__generated__/PostDetailQuery.graphql';
import { withProviders } from '../../../../test/withProviders';

it('should render post detail', async () => {
  const environment = createMockEnvironment();
  const postId = 'postId';

  const variables = {
    id: postId,
  };

  const routes: RouteObject[] = [
    {
      element: <PostDetail />,
      path: '/post/:id',
      loader: () => {
        return {
          postDetailQuery: loadQuery(environment, PostDetailQuery, variables, {
            fetchPolicy: 'store-or-network',
          }),
        };
      },
    },
  ];
  const loaderSpy = vi.spyOn(routes[0], 'loader');

  const initialEntries = [\`/post/\${postId}\`];

  /**
   * TODO
   * mock content of Post
   */
  const expectedPostContent = 'Welcome to Relay Workshop';
  const customMockResolvers = {};

  /**
   * TODO
   * queue a pending operation, this would be the loadQuery call of the route loader
   */

  /**
   * TODO
   * queue a resolver to mock the queued operation
   */

  const Root = withProviders({
    routes,
    initialEntries,
    environment,
  });

  const { getByText, debug, findByText } = render(<Root />);

  /**
   * TODO
   * assert the loader was called and the post content is rendered
   */

  debug();
});

it('should render post not found', async () => {
  /**
   * TODO
   * build the test to render a mock result where the post was not found
   */
});
`;

const specSolution = `import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { createMockEnvironment, MockPayloadGenerator } from 'relay-test-utils';
import { loadQuery } from 'react-relay';
import type { RouteObject } from 'react-router-dom';

import PostDetail from '../PostDetail';
import PostDetailQuery from '../__generated__/PostDetailQuery.graphql';
import { withProviders } from '../../../../test/withProviders';

it('should render post detail', async () => {
  const environment = createMockEnvironment();
  const postId = 'postId';

  const variables = {
    id: postId,
  };

  const routes: RouteObject[] = [
    {
      element: <PostDetail />,
      path: '/post/:id',
      loader: () => {
        return {
          postDetailQuery: loadQuery(environment, PostDetailQuery, variables, {
            fetchPolicy: 'store-or-network',
          }),
        };
      },
    },
  ];
  const loaderSpy = vi.spyOn(routes[0], 'loader');

  const initialEntries = [\`/post/\${postId}\`];

  const expectedPostContent = 'Welcome to Relay Workshop';
  const customMockResolvers = {
    Post: () => ({
      id: postId,
      content: expectedPostContent,
      likesCount: 3,
      meHasLiked: false,
    }),
    User: () => ({
      name: 'Relay',
    }),
  };

  // queue a pending operation, this is the loadQuery call of the route loader
  environment.mock.queuePendingOperation(PostDetailQuery, variables);

  // resolve PostDetailQuery using the mock resolvers
  environment.mock.queueOperationResolver(operation =>
    MockPayloadGenerator.generate(operation, customMockResolvers),
  );

  const Root = withProviders({
    routes,
    initialEntries,
    environment,
  });

  const { getByText, findByText } = render(<Root />);

  expect(await findByText(expectedPostContent)).toBeInTheDocument();

  expect(loaderSpy).toHaveBeenCalledTimes(1);
  expect(getByText('PostDetail')).toBeTruthy();
  expect(getByText('Relay')).toBeTruthy();
});

it('should render post not found', async () => {
  const environment = createMockEnvironment();
  const variables = {
    id: 'postId',
  };

  const routes: RouteObject[] = [
    {
      element: <PostDetail />,
      path: '/post/:id',
      loader: () => ({
        postDetailQuery: loadQuery(environment, PostDetailQuery, variables, {
          fetchPolicy: 'store-or-network',
        }),
      }),
    },
  ];

  environment.mock.queuePendingOperation(PostDetailQuery, variables);
  environment.mock.queueOperationResolver(() => ({
    data: {
      post: null,
    },
  }));

  const Root = withProviders({
    environment,
    routes,
    initialEntries: [\`/post/\${variables.id}\`],
  });

  const { findByText } = render(<Root />);

  expect(await findByText('Post not found')).toBeInTheDocument();
});
`;

export const exercise10: Exercise = {
  slug: '10-testUsePreloadQuery',
  number: '10',
  title: 'test usePreloadedQuery',
  summary: 'Test a route component that uses usePreloadedQuery with createMockEnvironment and MockPayloadGenerator.',
  tags: ['relay-test-utils', 'createMockEnvironment', 'MockPayloadGenerator', 'testing-library'],
  mode: 'test',
  activeFile: SPEC,
  instructions: `# 10 - test usePreloadedQuery

Learn how to test components using \`usePreloadedQuery\` with @testing-library.

\`PostDetail\` reads a query preloaded by the route \`loader\` (see \`routes.tsx\`). This exercise runs in **test mode**: instead of rendering the app, every \`*.spec.tsx\` file is executed (jest/vitest-like API) and the results show up in the **Tests** tab.

## Exercise

- [ ] Add the test inside \`components/feed/post/__tests__/PostDetail.spec.tsx\`
- [ ] render the \`PostDetail\` route using @testing-library
- [ ] use the \`withProviders\` helper (\`test/withProviders.tsx\`) to add all Providers the component needs
- [ ] mock the \`PostDetailQuery\` before \`loadQuery\` is called by the route loader
- [ ] assert the post content is rendered

## Extras

- [ ] add another test (\`it\`), testing a post that was not found

## Code Helpers

- \`withProviders\` adds all Providers (Relay, router, Suspense, ErrorBoundary), to make tests as close to real usage as possible

\`\`\`jsx
const Root = withProviders({
  routes,
  initialEntries,
  environment,
});
\`\`\`

- queue a pending operation, usually a query that will be used by \`loadQuery\`

\`\`\`jsx
environment.mock.queuePendingOperation(query, variables);
\`\`\`

- mock a queued pending operation using custom mock resolvers

\`\`\`jsx
environment.mock.queueOperationResolver(operation =>
  MockPayloadGenerator.generate(operation, customMockResolvers),
);
\`\`\`

- mock GraphQL data

\`\`\`jsx
const customMockResolvers = {
  User: () => ({
    name: 'Relay',
  }),
};
\`\`\``,
  notes: testingNotes,
  hints: [
    'Mock the Post content: `const customMockResolvers = { Post: () => ({ content: expectedPostContent }) }`.',
    'Before rendering: `environment.mock.queuePendingOperation(PostDetailQuery, variables)` and then `environment.mock.queueOperationResolver(operation => MockPayloadGenerator.generate(operation, customMockResolvers))`.',
    'The route loader runs asynchronously, use `expect(await findByText(expectedPostContent)).toBeInTheDocument()` (or `await waitFor(() => getByText(...))`).',
    'Post not found: resolve the operation with `() => ({ data: { post: null } })` and assert `Post not found`.',
  ],
  files: {
    ...testingProject(),
    [SPEC]: spec,
  },
  solution: {
    [SPEC]: specSolution,
  },
  hiddenFiles: TESTING_HIDDEN,
  checks: [
    {
      title: 'The test mocks PostDetailQuery with queuePendingOperation + queueOperationResolver',
      run: ({ source, assert }) => {
        const code = source(SPEC);
        assert(/\.queuePendingOperation\s*\(/.test(code), 'Queue the PostDetailQuery with environment.mock.queuePendingOperation(PostDetailQuery, variables)');
        assert(/\.queueOperationResolver\s*\(/.test(code), 'Resolve the queued operation with environment.mock.queueOperationResolver(...)');
      },
    },
    {
      title: 'The Post content is mocked with MockPayloadGenerator',
      run: ({ source, assert }) => {
        const code = source(SPEC);
        assert(/MockPayloadGenerator\.generate\s*\(/.test(code), 'Generate the payload with MockPayloadGenerator.generate(operation, customMockResolvers)');
        assert(/\bPost\s*(:|\()/.test(code) && /content\s*:/.test(code), 'Mock the Post content with a `Post: () => ({ content: ... })` resolver');
      },
    },
    {
      title: 'The test asserts the post content is rendered',
      run: ({ source, assert }) => {
        const code = source(SPEC);
        assert(/expect\s*\(/.test(code) || /waitFor\s*\(/.test(code), 'Add an assertion with expect(...)');
        assert(/\b(getByText|findByText|queryByText|getAllByText|findAllByText)\s*\(/.test(code), 'Query the rendered DOM, e.g. expect(await findByText(expectedPostContent)).toBeInTheDocument()');
      },
    },
    {
      title: 'All tests pass',
      run: ctx => allTestsPass(ctx),
    },
  ],
};
