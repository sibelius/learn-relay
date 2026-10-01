import type { CheckContext, Exercise } from './types';
import { BASE_HIDDEN, fetchGraphQL, getToken, relayProject } from './shared';
import { toGlobalId } from '@/lib/engine/server';

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

const feed = `import React, { useCallback } from 'react';
import { Button, Flex } from '@workshop/ui';
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

const post = `import React, { useCallback } from 'react';
import { useFragment, graphql } from 'react-relay';
import { Card, CardActions, IconButton, Text, FavoriteIcon, FavoriteBorderIcon, theme } from '@workshop/ui';

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
        meHasLiked
        likesCount
      }
    \`,
    props.post,
  );

  /**
   * TODO
   * useMutation from react-relay
   */

  const Icon = post.meHasLiked ? FavoriteIcon : FavoriteBorderIcon;

  const handleLike = useCallback(() => {
    const config = {
      variables: {
        input: {
          post: post.id,
        },
      },
      /**
       * TODO
       * add optimistic update to mutation config
       */
    };

    /**
     * TODO
     * call post like mutation
     */
  }, [post]);

  return (
    <Card mt='10px' p='10px'>
      <Text>id: {post.id}</Text>
      <Text>content: {post.content}</Text>
      <Text color='#6b7280'>Author: {post.author?.name}</Text>
      <CardActions>
        <IconButton data-testid='likeButton' aria-label='like' onClick={handleLike}>
          <Icon style={{ color: theme.relayOrange }} />
        </IconButton>
        {post.likesCount > 0 ? <Text>{post.likesCount}</Text> : null}
      </CardActions>
    </Card>
  );
};

export default Post;
`;

const postLikeMutation = `import { graphql } from 'react-relay';

/**
 * TODO
 * add mutation input and output here
 */

/**
 * TODO
 * add Post Like optimistic update
 */
`;

const fetchGraphQLStarter = `import { RequestParameters, Variables } from 'relay-runtime';

import config from '../config';
import { getToken } from './getToken';

export const fetchGraphQL = async (request: RequestParameters, variables: Variables) => {
  /**
   * TODO
   * send your user token (getToken()) in the Authorization header
   */
  const response = await fetch(config.GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-type': 'application/json',
    },
    body: JSON.stringify({
      query: request.text,
      variables,
    }),
  });

  const data = await response.json();

  return data;
};
`;

const postSolution = `import React, { useCallback } from 'react';
import { useFragment, graphql, useMutation } from 'react-relay';
import { Card, CardActions, IconButton, Text, FavoriteIcon, FavoriteBorderIcon, theme } from '@workshop/ui';

import { likeOptimisticResponse, PostLike } from './PostLikeMutation';
import { unlikeOptimisticResponse, PostUnLike } from './PostUnLikeMutation';

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
        meHasLiked
        likesCount
      }
    \`,
    props.post,
  );

  const [postLike] = useMutation(PostLike);
  const [postUnLike] = useMutation(PostUnLike);

  const Icon = post.meHasLiked ? FavoriteIcon : FavoriteBorderIcon;

  const handleLike = useCallback(() => {
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
  }, [post, postLike, postUnLike]);

  return (
    <Card mt='10px' p='10px'>
      <Text>id: {post.id}</Text>
      <Text>content: {post.content}</Text>
      <Text color='#6b7280'>Author: {post.author?.name}</Text>
      <CardActions>
        <IconButton data-testid='likeButton' aria-label='like' onClick={handleLike}>
          <Icon style={{ color: theme.relayOrange }} />
        </IconButton>
        {post.likesCount > 0 ? <Text>{post.likesCount}</Text> : null}
      </CardActions>
    </Card>
  );
};

export default Post;
`;

export const postLikeMutationSolution = `import { graphql } from 'react-relay';

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

export const postUnLikeMutationSolution = `import { graphql } from 'react-relay';

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

// ---- check helpers
const newestPost = (ctx: CheckContext) => [...ctx.server.db.posts].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
const cardOf = (ctx: CheckContext, content: string) => {
  const el = ctx.screen.getByText(content, { exact: false });
  const card = el.closest('.wui-card') as HTMLElement | null;
  ctx.assert(card, 'Render each post inside a <Card>');
  return card!;
};
const likeButtonOf = (ctx: CheckContext, card: HTMLElement) => {
  const button = card.querySelector("[data-testid='likeButton']") as HTMLElement | null;
  ctx.assert(button, "Keep data-testid='likeButton' on the like button");
  return button!;
};
const lastMutation = (ctx: CheckContext, name: string) => [...ctx.network].reverse().find(e => e.kind === 'mutation' && e.name === name);
const storeRecord = (ctx: CheckContext, id: string) => ctx.env()?.getStore().getSource().get(id);
const hasText = (card: HTMLElement, text: string) => [...card.querySelectorAll('*')].some(el => el.children.length === 0 && el.textContent?.trim() === text);

const waitMutation = async (ctx: CheckContext, name: string, sinceId: number) => {
  await ctx.waitFor(() =>
    ctx.assert(
      ctx.network.some(e => e.name === name && e.id > sinceId && e.status !== 'pending'),
      `Clicking the like button should send ${name}. Use useMutation and call it inside handleLike`,
    ),
  );
  const entry = lastMutation(ctx, name)!;
  const errors = (entry.response as any)?.errors;
  ctx.assert(!errors, `${name} failed: ${errors?.[0]?.message}`);
  return entry;
};

export const exercise05: Exercise = {
  slug: '05-useMutation',
  number: '05',
  title: 'useMutation',
  summary: 'Like a post: authenticate the network layer and modify data with useMutation and optimistic responses.',
  tags: ['useMutation', 'optimisticResponse', 'network layer'],
  mode: 'app',
  activeFile: 'Post.tsx',
  instructions: `# 05 - useMutation

Learn how to use \`useMutation\` to modify GraphQL data.

## Exercise

- get your user token (see **Your user token** below, this replaces \`pnpm get-token\`) and put the token on the \`Authorization\` header on the Network Layer (\`relay/fetchGraphQL.tsx\`, use \`getToken\` from \`relay/getToken.tsx\`)
- create a \`PostLike\` mutation in \`PostLikeMutation.tsx\` and use it with \`useMutation\` to like a Post when clicking the like button

## Extras

- [ ] implement the \`PostUnLike\` mutation (clicking the button of a liked post should unlike it)
- [ ] add an \`optimisticResponse\` to provide a fast feedback to the user

## Code Helpers

PostLikeMutation

\`\`\`graphql
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
\`\`\``,
  notes: `# Modifying data using Mutations

GraphQL mutations let you modify data in your GraphQL server.
A GraphQL mutation is a write followed by a read.

## GraphQL Mutation best practices

Your GraphQL mutation should return all data that you need to update your client.

- if you added a new post, you should return the new post
- if you edited a post, you should return the edited post
- if you removed a post, you should return the id of the deleted post

## GraphQL Relay Mutation pattern

Usually GraphQL mutations in Relay have an input object and an output (payload) object, like below.
This is not required anymore, feel free to use any mutation format you want.

\`\`\`graphql
PostLike(input: PostLikeInput!): PostLikePayload

type PostLikePayload {
  post: Post
  error: String
  success: String
  clientMutationId: String
}

input PostLikeInput {
  post: ID!
  clientMutationId: String
}
\`\`\`

## Doing mutations in Relay

Relay provides the \`useMutation\` hook to perform mutations.
\`useMutation\` ensures that you won't do the same mutation twice, and it will also cancel the mutation if the component is unmounted.

\`\`\`ts
type UseMutationConfig<TMutation extends MutationParameters> = {
  configs?: Array<DeclarativeMutationConfig>;
  onError?: (error: Error) => void | null;
  onCompleted?: (response: TMutation['response'], errors: Array<PayloadError> | null) => void | null;
  onUnsubscribe?: () => void | null;
  optimisticResponse?: any;
  optimisticUpdater?: SelectorStoreUpdater | null;
  updater?: SelectorStoreUpdater | null;
  uploadables?: UploadableMap;
  variables: TMutation['variables'];
};

const useMutation = <TMutation extends MutationParameters>(
  mutation: GraphQLTaggedNode,
): [(config: UseMutationConfig<TMutation>) => Disposable, boolean];
\`\`\`

\`useMutation\` receives a \`graphql\` tag with the GraphQL mutation. Example of a simple mutation in Relay:

\`\`\`jsx
const [postLike, isPending] = useMutation(PostLike);

const onPostLike = () => {
  const config = {
    variables: {
      input: {
        post: post.id,
      },
    },
  };

  postLike(config);
};
\`\`\`

Since the mutation returns the \`post\` with its \`id\`, Relay updates the \`Post\` record in the store automatically,
and every component that reads \`likesCount\` or \`meHasLiked\` re-renders. No refetch needed!

## Optimistic updates

Mutations can have an optimistic response or an optimistic updater to provide fast feedback for the user.
An optimistic response is the "happy path", what the server will answer when everything goes well.
Relay applies it to the store right away and rolls it back when the real response arrives (or the mutation fails).

\`\`\`js
optimisticResponse: {
  PostLike: {
    success: '',
    error: null,
    post: {
      id: post.id,
      meHasLiked: true,
      likesCount: post.likesCount + 1,
    },
  },
},
\`\`\`

Increase the latency in the preview toolbar to see the difference.

## References

- https://relay.dev/docs/guided-tour/updating-data/graphql-mutations/
- https://github.com/graphql/graphql-relay-js`,
  hints: [
    'In `relay/fetchGraphQL.tsx` add `Authorization: getToken()` to the `headers` object.',
    'In `PostLikeMutation.tsx`: `export const PostLike = graphql`mutation PostLikeMutation($input: PostLikeInput!) { PostLike(input: $input) { success error post { meHasLiked likesCount } } }`;`',
    'In `Post.tsx`: `const [postLike] = useMutation(PostLike);` and call `postLike(config)` inside `handleLike`.',
    'Unlike: create `PostUnLikeMutation.tsx` with `PostUnLike` and pick the mutation based on `post.meHasLiked`.',
    'Optimistic: `optimisticResponse: { PostLike: { success: "", error: null, post: { id: post.id, meHasLiked: true, likesCount: post.likesCount + 1 } } }`.',
  ],
  files: {
    ...relayProject({ withToken: false }),
    'relay/getToken.tsx': getToken,
    'relay/fetchGraphQL.tsx': fetchGraphQLStarter,
    'App.tsx': app,
    'Feed.tsx': feed,
    'Post.tsx': post,
    'PostLikeMutation.tsx': postLikeMutation,
  },
  solution: {
    'relay/fetchGraphQL.tsx': fetchGraphQL({ withToken: true }),
    'Post.tsx': postSolution,
    'PostLikeMutation.tsx': postLikeMutationSolution,
    'PostUnLikeMutation.tsx': postUnLikeMutationSolution,
  },
  hiddenFiles: BASE_HIDDEN.filter(f => f !== 'relay/fetchGraphQL.tsx' && f !== 'relay/getToken.tsx'),
  checks: [
    {
      title: 'The network layer sends the Authorization header',
      run: async ctx => {
        await ctx.waitFor(() => ctx.assert(ctx.network.some(e => e.name === 'AppQuery' && e.status !== 'pending'), 'AppQuery was not sent'));
        const entry = ctx.network.find(e => e.name === 'AppQuery')!;
        ctx.assert(entry.authorized, 'AppQuery was sent without the Authorization header. Add `Authorization: getToken()` to the headers in relay/fetchGraphQL.tsx');
      },
    },
    {
      title: 'Clicking the like button sends PostLikeMutation',
      run: async ctx => {
        const target = newestPost(ctx);
        await ctx.waitFor(() => ctx.screen.getByText(target.content, { exact: false }));
        const card = cardOf(ctx, target.content);
        const sinceId = ctx.network.length ? ctx.network[ctx.network.length - 1].id : 0;
        await ctx.user.click(likeButtonOf(ctx, card));
        const entry = await waitMutation(ctx, 'PostLikeMutation', sinceId);
        ctx.assert(entry.authorized, 'PostLikeMutation was sent without the Authorization header');
        ctx.assert(
          (entry.variables as any)?.input?.post === toGlobalId('Post', target._id),
          'Send the post id as variables: { input: { post: post.id } }',
        );
        ctx.assert(target.likedBy.includes('u1'), 'The post was not liked on the server');
      },
    },
    {
      title: 'The like count and meHasLiked are updated in the store and UI',
      run: async ctx => {
        const target = newestPost(ctx);
        const id = toGlobalId('Post', target._id);
        const expected = target.likedBy.length;
        await ctx.waitFor(() => {
          const record = storeRecord(ctx, id);
          ctx.assert(record?.meHasLiked === true, 'meHasLiked is not true in the Relay store, select `post { meHasLiked likesCount }` in the mutation');
          ctx.assert(record?.likesCount === expected, `likesCount should be ${expected} in the Relay store`);
        });
        await ctx.waitFor(() => ctx.assert(hasText(cardOf(ctx, target.content), String(expected)), `The post should show ${expected} likes`));
      },
    },
    {
      title: '(extra) Clicking a liked post sends PostUnLikeMutation',
      run: async ctx => {
        const target = newestPost(ctx);
        const card = cardOf(ctx, target.content);
        const sinceId = ctx.network[ctx.network.length - 1].id;
        await ctx.user.click(likeButtonOf(ctx, card));
        await waitMutation(ctx, 'PostUnLikeMutation', sinceId);
        ctx.assert(!target.likedBy.includes('u1'), 'The post was not unliked on the server');
        const expected = target.likedBy.length;
        await ctx.waitFor(() => ctx.assert(storeRecord(ctx, toGlobalId('Post', target._id))?.meHasLiked === false, 'meHasLiked should be false after PostUnLike'));
        await ctx.waitFor(() => ctx.assert(hasText(cardOf(ctx, target.content), String(expected)), `The post should show ${expected} likes after unliking`));
      },
    },
    {
      title: '(extra) Optimistic response updates the UI before the server answers',
      run: async ctx => {
        const posts = [...ctx.server.db.posts].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        const target = posts[1];
        const card = cardOf(ctx, target.content);
        const id = toGlobalId('Post', target._id);
        const expected = target.likedBy.length + 1;
        const sinceId = ctx.network[ctx.network.length - 1].id;
        await ctx.user.click(likeButtonOf(ctx, card));
        await ctx.waitFor(
          () => ctx.assert(storeRecord(ctx, id)?.likesCount === expected || hasText(card, String(expected)), 'waiting optimistic update'),
          { timeout: 2000 },
        );
        const entry = [...ctx.network].reverse().find(e => e.kind === 'mutation' && e.id > sinceId);
        ctx.assert(entry, 'No mutation was sent');
        ctx.assert(
          entry!.status === 'pending',
          'The UI only updated after the server response. Add an optimisticResponse to the mutation config',
        );
        await waitMutation(ctx, entry!.name, sinceId);
      },
    },
  ],
};
