import type { CheckContext, Exercise } from './types';
import { BASE_HIDDEN, relayProject } from './shared';

const app = `import React from 'react';
import { Content, Flex, Text } from '@workshop/ui';
import { useLazyLoadQuery, graphql } from 'react-relay';

import Feed from './Feed';

const App = () => {
  const query = useLazyLoadQuery(
    graphql\`
      query AppQuery {
        ...Feed_query
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

const post = `import React from 'react';
import { useFragment, graphql } from 'react-relay';
import { Card, Text } from '@workshop/ui';

type Props = {
  post: any;
};
const Post = (props: Props) => {
  const post = useFragment(
    graphql\`
      fragment Post_post on Post {
        id
        content
        author {
          name
        }
      }
    \`,
    props.post,
  );

  return (
    <Card mt='10px' p='10px'>
      <Text>id: {post.id}</Text>
      <Text>content: {post.content}</Text>
      <Text color='#6b7280'>Author: {post.author?.name}</Text>
    </Card>
  );
};

export default Post;
`;

const feed = `import React, { useCallback } from 'react';
import { Button, Flex } from '@workshop/ui';
import { graphql, useFragment, usePaginationFragment } from 'react-relay';

import Post from './Post';

type Props = {
  query: any;
};
const Feed = (props: Props) => {
  /**
   * TODO
   * usePaginationFragment to fetch posts and paginate
   * - add @argumentDefinitions (first, after) to the fragment
   * - add @refetchable(queryName: "FeedPaginationQuery")
   * - add @connection(key: "Feed_posts", filters: []) to posts and select pageInfo
   */
  const data = useFragment(
    graphql\`
      fragment Feed_query on Query {
        posts(first: 10) {
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

  const { posts } = data;

  /**
   * TODO
   * fix loadMore callback to loadMore posts
   */
  const loadMore = useCallback(() => {}, []);

  return (
    <Flex flexDirection='column'>
      {posts.edges.map(({ node }) => (
        <Post key={node.id} post={node} />
      ))}
      <Button mt='10px' onClick={loadMore}>
        Load More
      </Button>
    </Flex>
  );
};

export default Feed;
`;

const feedSolution = `import React, { useCallback } from 'react';
import { Button, Flex, Loading } from '@workshop/ui';
import { graphql, usePaginationFragment } from 'react-relay';

import Post from './Post';

type Props = {
  query: any;
};
const Feed = (props: Props) => {
  const { data, loadNext, hasNext, isLoadingNext } = usePaginationFragment(
    graphql\`
      fragment Feed_query on Query
      @argumentDefinitions(first: { type: Int, defaultValue: 10 }, after: { type: String })
      @refetchable(queryName: "FeedPaginationQuery") {
        posts(first: $first, after: $after) @connection(key: "Feed_posts", filters: []) {
          endCursorOffset
          startCursorOffset
          count
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
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

  const { posts } = data;

  const loadMore = useCallback(() => {
    // Don't fetch again if we're already loading the next page
    if (isLoadingNext) {
      return;
    }
    loadNext(10);
  }, [isLoadingNext, loadNext]);

  return (
    <Flex flexDirection='column'>
      {posts.edges.map(({ node }) => (
        <Post key={node.id} post={node} />
      ))}
      {isLoadingNext ? <Loading /> : null}
      {hasNext ? (
        <Button mt='10px' onClick={loadMore} disabled={isLoadingNext}>
          Load More
        </Button>
      ) : null}
    </Flex>
  );
};

export default Feed;
`;

// posts of the server, newest first (the order of the feed)
const feedPosts = (ctx: CheckContext) => [...ctx.server.db.posts].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
const visiblePosts = (ctx: CheckContext) =>
  feedPosts(ctx).filter(p => ctx.screen.queryAllByText(p.content, { exact: false }).length > 0);
const loadMoreButton = (ctx: CheckContext) => ctx.screen.queryByRole('button', { name: /load more/i });

export const exercise04: Exercise = {
  slug: '04-usePaginationFragment',
  number: '04',
  title: 'usePaginationFragment',
  summary: 'Paginate a list of posts using connections, @refetchable and usePaginationFragment.',
  tags: ['usePaginationFragment', '@connection', '@refetchable', '@argumentDefinitions'],
  mode: 'app',
  activeFile: 'Feed.tsx',
  instructions: `# 04 - usePaginationFragment

Learn how to use \`usePaginationFragment\` to paginate a list of posts.

## Exercise

- use \`usePaginationFragment\` on \`Feed.tsx\` component to fetch a list of posts and later on paginate it
- implement pagination on \`loadMore\` callback (load 10 more posts each time)

## Extras

- [ ] hide the **Load More** button when there are no more posts (\`hasNext\`)
- [ ] show a loading indicator while the next page is loading (\`isLoadingNext\`)

## Code Helpers

- usePagination fragment

\`\`\`graphql
fragment Feed_query on Query {
  posts(first: $first, after: $after) @connection(key: "Feed_posts", filters: []) {
    endCursorOffset
    startCursorOffset
    count
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    edges {
      node {
        id
        ...Post_post
      }
    }
  }
}
\`\`\`

- \`@argumentDefinitions\`: declare "local" arguments to your fragments

\`\`\`graphql
@argumentDefinitions(
  first: { type: Int, defaultValue: 10 }
  after: { type: String }
)
\`\`\`

- \`@refetchable\`: let Relay generate a refetch query for your pagination or refetch fragments

\`\`\`graphql
@refetchable(queryName: "FeedPaginationQuery")
\`\`\`

- loading the next page

\`\`\`jsx
const { data, loadNext, hasNext, isLoadingNext } = usePaginationFragment(fragment, props.query);

loadNext(10);
\`\`\``,
  notes: `# Pagination using connections

Most apps have lists. A social network has a list of posts called newsfeed. An ecommerce has a list of products.
These lists can be very big, so usually we don't fetch all the records at once.
We "paginate" over the list of records to get more from where we are.
There are 2 common types of paginations: offset based and connection based.

## Offset Based

Offset pagination uses 2 parameters to ask more items from a list, \`skip\` and \`limit\`.
Skip tells how many records to skip before selecting records. Limit tells how many records to return.

A problem happens when a new record is added or removed from the list: the pagination will "lose" a record.
You can only paginate from the begin or end of a page.

## Connection Based

\`\`\`ts
type PageInfo = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | undefined;
  endCursor: string | undefined;
};

type Edge<T> = {
  cursor: string;
  node: T;
};

type Connection<T> = {
  pageInfo: PageInfo;
  edges: Edge<T>[];
};
\`\`\`

In a connection based pagination each record is represented by 2 values: \`node\` and \`cursor\`.
\`node\` contains the value of the record, and the \`cursor\` contains the position of the record in the list.
A simple cursor implementation would have the \`skip\` value inside the cursor.

To check if you can paginate forward or backward you check \`pageInfo.hasNextPage\` and \`pageInfo.hasPreviousPage\`.
You can paginate backward and forward from any node.

## Pagination in Relay

You are going to need to define variables to be able to paginate (\`first\`, \`after\`, \`before\`, \`last\`).
You also need a pagination query to be fetched when you want to load more items.
To paginate using connections in Relay you are going to use \`usePaginationFragment\`.

## Arguments in Fragments

Relay lets you declare arguments per fragment definition using the \`@argumentDefinitions\` directive:

\`\`\`graphql
@argumentDefinitions(
  first: { type: Int, defaultValue: 1 }
  after: { type: String }
)
\`\`\`

The Relay compiler converts these local arguments into global GraphQL variables,
as GraphQL does not support arguments at the fragment level.

## Pagination and Refetch Queries

To get more data after the first fetch, you need to define another query with the right arguments.
When using Relay hooks we can use the \`@refetchable\` directive to let the Relay compiler generate this query for us.

\`\`\`graphql
@refetchable(queryName: "FeedPaginationQuery")
\`\`\`

\`\`\`ts
function usePaginationFragment<TQuery extends OperationType, TKey extends KeyType>(
  fragmentInput: GraphQLTaggedNode,
  fragmentRef: TKey | null,
): {
  data: TFragmentData;
  loadNext: LoadMoreFn;
  loadPrevious: LoadMoreFn;
  hasNext: boolean;
  hasPrevious: boolean;
  isLoadingNext: boolean;
  isLoadingPrevious: boolean;
  refetch: RefetchFnDynamic<TQuery, TKey>;
};
\`\`\`

\`usePaginationFragment\` receives the fragment definition and also the \`fragmentRef\`.
The \`fragmentRef\` contains the data to be extracted by \`usePaginationFragment\`. This hook returns:

- \`data\`: fragment data
- \`loadNext\` and \`loadPrevious\` to paginate forward and backward
- \`hasNext\` and \`hasPrevious\` to check whether you can paginate or not
- \`isLoadingNext\` and \`isLoadingPrevious\` to show loading information
- \`refetch\` to refetch the whole connection

Open the **Network** tab after clicking *Load More*: Relay sends \`FeedPaginationQuery\` with the \`after\` cursor,
and merges the new edges into the \`Feed_posts\` connection in the store.

## References

- https://relay.dev/graphql/connections.htm
- https://relay.dev/docs/guided-tour/list-data/pagination/
- https://dev.to/zth/connection-based-pagination-in-graphql-2588`,
  hints: [
    'Replace `useFragment` with `usePaginationFragment`: it returns `{ data, loadNext, hasNext, isLoadingNext }`.',
    'The fragment needs `@argumentDefinitions(first: { type: Int, defaultValue: 10 }, after: { type: String })` and `@refetchable(queryName: "FeedPaginationQuery")` right after `on Query`.',
    'Use the variables in the connection field: `posts(first: $first, after: $after) @connection(key: "Feed_posts", filters: [])`. A connection must select `pageInfo { hasNextPage endCursor }` and `edges { node { ... } }`.',
    'In `loadMore`: `if (isLoadingNext) return; loadNext(10);`',
  ],
  files: {
    ...relayProject(),
    'App.tsx': app,
    'Feed.tsx': feed,
    'Post.tsx': post,
  },
  solution: {
    'Feed.tsx': feedSolution,
  },
  hiddenFiles: BASE_HIDDEN,
  checks: [
    {
      title: 'Feed uses usePaginationFragment with a @refetchable fragment',
      run: ({ source, assert }) => {
        const code = source('Feed.tsx');
        assert(/usePaginationFragment\s*(<[^>]*>)?\s*\(/.test(code), 'Call usePaginationFragment inside Feed');
        assert(
          /@refetchable\s*\(\s*queryName\s*:\s*"FeedPaginationQuery"\s*\)/.test(code),
          'Add @refetchable(queryName: "FeedPaginationQuery") to the Feed_query fragment',
        );
        assert(/@connection\s*\(\s*key\s*:\s*"Feed_posts"/.test(code), 'Add @connection(key: "Feed_posts", filters: []) to the posts field');
      },
    },
    {
      title: 'Renders the first page of posts',
      run: async ctx => {
        const first = feedPosts(ctx)[0];
        await ctx.waitFor(() => ctx.screen.getByText(first.content, { exact: false }));
        const count = visiblePosts(ctx).length;
        ctx.assert(count < 30, `All the ${count} posts were rendered at once, fetch only the first page (first: 10)`);
      },
    },
    {
      title: 'Load More fetches the next page with FeedPaginationQuery',
      run: async ctx => {
        const before = visiblePosts(ctx).length;
        const button = loadMoreButton(ctx);
        ctx.assert(button, 'Render a "Load More" button');
        await ctx.user.click(button);
        await ctx.waitFor(() =>
          ctx.assert(
            ctx.network.some(e => e.name === 'FeedPaginationQuery' && e.status !== 'pending'),
            'Clicking "Load More" should send FeedPaginationQuery. Call loadNext(10) inside loadMore',
          ),
        );
        const request = ctx.network.find(e => e.name === 'FeedPaginationQuery')!;
        ctx.assert(request.status === 'done', `FeedPaginationQuery failed: ${JSON.stringify((request.response as any)?.errors ?? '')}`);
        ctx.assert((request.variables as any)?.after, 'FeedPaginationQuery should be sent with the `after` cursor of the last post');
        await ctx.waitFor(() =>
          ctx.assert(visiblePosts(ctx).length > before, `Expected more than ${before} posts after "Load More", the new posts are not rendered`),
        );
        // the first page should still be rendered (edges are appended to the connection)
        ctx.assert(
          ctx.screen.queryAllByText(feedPosts(ctx)[0].content, { exact: false }).length > 0,
          'The first page disappeared, new edges should be appended to the connection',
        );
      },
    },
    {
      title: 'Paginates until all the 30 posts are loaded',
      run: async ctx => {
        const total = feedPosts(ctx).length;
        for (let i = 0; i < 40 && visiblePosts(ctx).length < total; i++) {
          const before = visiblePosts(ctx).length;
          const button = loadMoreButton(ctx);
          ctx.assert(button, `Only ${before} of ${total} posts are rendered and there is no "Load More" button`);
          if (button.disabled) {
            await ctx.sleep(100);
            continue;
          }
          await ctx.user.click(button);
          await ctx.waitFor(() => ctx.assert(visiblePosts(ctx).length > before, `"Load More" did not load more posts (${before} of ${total})`));
        }
        ctx.assert(visiblePosts(ctx).length === total, `Expected all the ${total} posts to be rendered`);
      },
    },
  ],
};
