import type { Exercise } from './types';
import { BASE_HIDDEN, relayProject } from './shared';
import { FEED_HIDDEN, feedProject } from './07-useRefetchableFragment';

const root = `import React, { Suspense } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import { routes } from './routes';
import Providers from './Providers';
import Loading from './Loading';
import ErrorBoundaryRetry from './ErrorBoundaryRetry';

// the preview has no address bar, so we use an in memory router
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

const relayIndex = `export { default as Environment } from './Environment';
`;

const routesStarter = `import React from 'react';
import { loadQuery } from 'react-relay';
import type { RouteObject } from 'react-router-dom';

import App from './App';
import PostDetail from './PostDetail';
import { Environment } from './relay';

import AppQuery from './__generated__/AppQuery.graphql';
import PostDetailQuery from './__generated__/PostDetailQuery.graphql';

export const routes: RouteObject[] = [
  {
    element: <App />,
    path: '/',
    loader: () => {
      /**
       * TODO
       * add loadQuery (preloadQuery) to start fetching before component has mounted
       * return it as { appQuery }
       */
      return {};
    },
  },
  {
    path: '/post/:id',
    element: <PostDetail />,
    loader: ({ params }) => {
      /**
       * TODO
       * add loadQuery (preloadQuery) to start fetching before component has mounted
       * use params as query variables
       * return it as { postDetailQuery }
       */
      return {};
    },
  },
];
`;

const routesSolution = `import React from 'react';
import { loadQuery } from 'react-relay';
import type { RouteObject } from 'react-router-dom';

import App from './App';
import PostDetail from './PostDetail';
import { Environment } from './relay';

import AppQuery from './__generated__/AppQuery.graphql';
import PostDetailQuery from './__generated__/PostDetailQuery.graphql';

export const routes: RouteObject[] = [
  {
    element: <App />,
    path: '/',
    loader: () => {
      return {
        appQuery: loadQuery(
          Environment,
          AppQuery,
          {},
          {
            fetchPolicy: 'network-only',
          },
        ),
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
          {
            id: params.id,
          },
          {
            fetchPolicy: 'store-or-network',
          },
        ),
      };
    },
  },
];
`;

const appStarter = `import React from 'react';
import { Content, Flex, Text } from '@workshop/ui';
import { graphql, useLazyLoadQuery } from 'react-relay';
import { useLoaderData } from 'react-router-dom';

import Feed from './Feed';

const App = () => {
  /**
   * TODO
   * get data preloaded in the router loader using useLoaderData()
   */
  const loadedData = {} as any;

  /**
   * TODO
   * use usePreloadedQuery instead of useLazyLoadQuery
   */
  const query = useLazyLoadQuery(
    graphql\`
      query AppQuery {
        ...Feed_query
        me {
          id
        }
      }
    \`,
    {},
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

const appSolution = `import React from 'react';
import { Content, Flex, Text } from '@workshop/ui';
import { graphql, usePreloadedQuery } from 'react-relay';
import { useLoaderData } from 'react-router-dom';

import Feed from './Feed';

const App = () => {
  // get data preloaded in the router loader
  const loadedData = useLoaderData() as any;

  const query = usePreloadedQuery(
    graphql\`
      query AppQuery {
        ...Feed_query
        me {
          id
        }
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

const postDetail = `import React from 'react';
import { usePreloadedQuery, graphql } from 'react-relay';
import { Link, useLoaderData } from 'react-router-dom';
import { Card, Content, Text } from '@workshop/ui';

import Post from './Post';

const PostDetail = () => {
  // get data preloaded in router
  const loadedData = useLoaderData() as any;

  const data = usePreloadedQuery(
    graphql\`
      query PostDetailQuery($id: ID!) {
        post: node(id: $id) {
          ...Post_post
        }
        me {
          ...Post_me
        }
      }
    \`,
    loadedData.postDetailQuery,
  );

  const { post, me } = data;

  if (!post) {
    return (
      <Content>
        <Card p='20px' flex={1} alignItems='center' justifyContent='center'>
          <Text>Post not found</Text>
        </Card>
      </Content>
    );
  }

  return (
    <Content>
      <Link to='/'>← Back</Link>
      <Post post={post} me={me} isDetail={true} />
    </Content>
  );
};

export default PostDetail;
`;

const post = `import React from 'react';
import { useFragment, graphql } from 'react-relay';
import { Link } from 'react-router-dom';
import { Card, CardActions, Text } from '@workshop/ui';

import PostCommentComposer from './comment/PostCommentComposer';
import PostLikeButton from './like/PostLikeButton';
import PostComments from './comment/PostComments';

type Props = {
  post: any;
  me: any;
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
          name
        }
        ...PostLikeButton_post
        ...PostCommentComposer_post
        ...PostComments_post
      }
    \`,
    props.post,
  );

  const me = useFragment(
    graphql\`
      fragment Post_me on User {
        ...PostCommentComposer_me
      }
    \`,
    props.me,
  );

  const content = (
    <>
      <Text>{post.content}</Text>
      <Text mt='4px' color='#6b7280'>Author: {post.author?.name}</Text>
    </>
  );

  return (
    <Card mt='10px' p='10px' data-testid='post'>
      {isDetail ? (
        content
      ) : (
        <Link to={\`/post/\${encodeURIComponent(post.id)}\`} style={{ color: 'inherit', textDecoration: 'none' }}>
          {content}
        </Link>
      )}
      <CardActions>
        <PostLikeButton post={post} />
      </CardActions>
      <PostCommentComposer post={post} me={me} />
      <PostComments post={post} />
    </Card>
  );
};

export default Post;
`;

export const exercise09: Exercise = {
  slug: '09-usePreloadedQuery',
  number: '09',
  title: 'usePreloadedQuery',
  summary: 'Render-as-you-fetch: start loading data in the router with loadQuery and read it with usePreloadedQuery.',
  tags: ['usePreloadedQuery', 'loadQuery', 'react-router'],
  mode: 'app',
  activeFile: 'routes.tsx',
  instructions: `# 09 - usePreloadedQuery

Learn how to use \`loadQuery\` (preloadQuery) + \`usePreloadedQuery\` to fetch data at the same time as code.

## Exercise

- add \`loadQuery\` inside the \`loader\` of path \`/\` in \`routes.tsx\` and return it as \`{ appQuery }\`
- modify \`App.tsx\` to use \`usePreloadedQuery\` instead of \`useLazyLoadQuery\`, reading the preloaded query with \`useLoaderData()\`
- add \`loadQuery\` inside the \`loader\` of path \`/post/:id\`, using \`params.id\` as the query variable, and return it as \`{ postDetailQuery }\`

Click on a post content to open its detail page (\`PostDetail.tsx\`).

## Extras

- [ ] dispose the preloaded queries when they are not needed anymore
- [ ] preload the post detail query when the user hovers a post

## Code Helpers

- import a compiled query artifact

\`\`\`jsx
import AppQuery from './__generated__/AppQuery.graphql';

loadQuery(Environment, AppQuery, {}, { fetchPolicy: 'network-only' });
\`\`\``,
  notes: `# Preloading your Data Fetching

Fetching on render can have many edge cases, and even more with React concurrent rendering,
as React could render your components more than once.
Fetching on render also does not provide the best user experience,
as you only start loading data after you loaded (and rendered) the code.
To be able to move to the \`render-as-you-fetch\` pattern we need to start fetching early.

## loadQuery (preloadQuery)

\`\`\`ts
export function loadQuery<TQuery extends OperationType>(
  environment: IEnvironment,
  preloadableRequest: GraphQLTaggedNode | PreloadableConcreteRequest<TQuery>,
  variables: TQuery['variables'],
  options?: LoadQueryOptions,
): PreloadedQuery<TQuery>;
\`\`\`

\`loadQuery\` should not be called inside render.
It starts fetching a query before rendering the component.
It is usually called when a route changes, for example in a react-router \`loader\`.

## usePreloadedQuery

\`\`\`ts
export function usePreloadedQuery<TQuery extends OperationType>(
  gqlQuery: GraphQLTaggedNode,
  preloadedQuery: PreloadedQuery<TQuery>,
): TQuery['response'];
\`\`\`

\`usePreloadedQuery\` should be called in render.
It receives a graphql query and also the return of a \`loadQuery\` call.
If the data is not ready yet, it suspends until the request started by \`loadQuery\` finishes.

## react-router loaders

\`\`\`jsx
const routes = [
  {
    path: '/',
    element: <App />,
    loader: () => ({ appQuery: loadQuery(Environment, AppQuery, {}) }),
  },
];

const App = () => {
  const { appQuery } = useLoaderData();
  const data = usePreloadedQuery(graphql\`query AppQuery { ... }\`, appQuery);
};
\`\`\`

The router calls the \`loader\` as soon as the navigation starts, so code and data load in parallel.

> There is also \`useQueryLoader\` that returns a \`[queryRef, loadQuery, disposeQuery]\` tuple, handy when the preload is triggered by a component (e.g. on hover or on click).

## References

- https://relay.dev/docs/guided-tour/rendering/queries/
- https://relay.dev/docs/api-reference/use-preloaded-query/
- https://relay.dev/docs/api-reference/load-query/
- https://reactrouter.com/start/data/data-loading`,
  hints: [
    "In routes.tsx: `loader: () => ({ appQuery: loadQuery(Environment, AppQuery, {}, { fetchPolicy: 'network-only' }) })`.",
    'In App.tsx: `const loadedData = useLoaderData();` and `const query = usePreloadedQuery(graphql`...`, loadedData.appQuery);`.',
    'For the detail route: `loader: ({ params }) => ({ postDetailQuery: loadQuery(Environment, PostDetailQuery, { id: params.id }) })`.',
  ],
  files: {
    ...relayProject({ withToken: true }),
    ...feedProject,
    'Root.tsx': root,
    'relay/index.tsx': relayIndex,
    'routes.tsx': routesStarter,
    'App.tsx': appStarter,
    'Post.tsx': post,
    'PostDetail.tsx': postDetail,
  },
  solution: {
    'routes.tsx': routesSolution,
    'App.tsx': appSolution,
  },
  hiddenFiles: [...BASE_HIDDEN.filter(f => f !== 'Root.tsx'), ...FEED_HIDDEN, 'comment/PostComments.tsx', 'relay/index.tsx'],
  checks: [
    {
      title: 'routes.tsx preloads AppQuery with loadQuery',
      run: ({ source, assert }) => {
        const code = source('routes.tsx');
        assert(/(loadQuery|preloadQuery)\s*(<[^>]*>)?\s*\(/.test(code), 'Call loadQuery(Environment, AppQuery, {}) inside the loader of path "/"');
        assert(/appQuery/.test(code), 'Return the preloaded query from the loader as { appQuery: loadQuery(...) }');
      },
    },
    {
      title: 'App uses usePreloadedQuery instead of useLazyLoadQuery',
      run: ({ source, assert }) => {
        const code = source('App.tsx');
        assert(/usePreloadedQuery\s*(<[^>]*>)?\s*\(/.test(code), 'Use usePreloadedQuery in App.tsx');
        assert(!/useLazyLoadQuery\s*(<[^>]*>)?\s*\(/.test(code), 'Remove useLazyLoadQuery from App.tsx');
        assert(/useLoaderData\s*\(/.test(code), 'Read the preloaded query with useLoaderData()');
      },
    },
    {
      title: 'AppQuery is fetched and the feed is rendered',
      run: async ({ network, screen, server, waitFor, assert }) => {
        await waitFor(() => {
          if (!network.some(e => e.name === 'AppQuery')) throw new Error('AppQuery was not requested');
        });
        assert(network.filter(e => e.name === 'AppQuery').length === 1, 'AppQuery should be fetched only once');
        const newest = [...server.db.posts].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
        await waitFor(() => screen.getByText(newest.content));
      },
    },
    {
      title: 'Opening a post preloads PostDetailQuery with the post id',
      run: async ({ network, screen, server, waitFor, user, assert }) => {
        const newest = [...server.db.posts].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
        const link = (await waitFor(() => screen.getByText(newest.content))).closest('a');
        assert(link, 'The post content should be a link to /post/:id');
        await user.click(link);
        await waitFor(() => {
          if (!network.some(e => e.name === 'PostDetailQuery')) {
            throw new Error('PostDetailQuery was not requested, call loadQuery(Environment, PostDetailQuery, { id: params.id }) in the "/post/:id" loader');
          }
        });
        const entry = network.find(e => e.name === 'PostDetailQuery')!;
        const expectedId = btoa(`Post:${newest._id}`);
        assert(entry.variables?.id === expectedId, `PostDetailQuery should be called with { id: params.id } (expected "${expectedId}", got ${JSON.stringify(entry.variables?.id)})`);
        await waitFor(() => {
          screen.getByText(/back/i);
          screen.getByText(newest.content);
        });
      },
    },
  ],
};
