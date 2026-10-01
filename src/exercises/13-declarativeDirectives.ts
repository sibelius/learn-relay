import type { CheckContext, Exercise } from './types';
import { BASE_HIDDEN, fetchGraphQL, getToken, relayProject } from './shared';

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

const feedFragment = `graphql\`
      fragment Feed_query on Query
      @argumentDefinitions(first: { type: Int, defaultValue: 3 }, after: { type: String })
      @refetchable(queryName: "FeedPaginationQuery") {
        posts(first: $first, after: $after) @connection(key: "Feed_posts", filters: []) {
          __id
          edges {
            node {
              id
              ...Post_post
            }
          }
        }
      }
    \``;

const feed = `import React, { useCallback, useState } from 'react';
import { Button, Card, CardActions, Flex, TextField } from '@workshop/ui';
import { graphql, usePaginationFragment, useMutation } from 'react-relay';

import Post from './Post';

type Props = {
  query: any;
};
const Feed = (props: Props) => {
  const { data, loadNext, isLoadingNext, hasNext } = usePaginationFragment(
    ${feedFragment},
    props.query,
  );

  const { posts } = data;

  const [content, setContent] = useState('');

  /*
  To have access to the connection id:
  const connectionID = posts.__id
  OR
  const connectionID = ConnectionHandler.getConnectionID(ROOT_ID, 'Feed_posts')
  */

  /**
   * TODO
   * consume your PostCreateMutation here with useMutation
   */

  const onSubmit = () => {
    /**
     * TODO
     * commit the PostCreateMutation with the content and the connections
     * to add the new post to the feed (no updater needed!)
     */
  };

  const loadMore = useCallback(() => {
    // Don't fetch again if we're already loading the next page
    if (isLoadingNext) {
      return;
    }
    loadNext(3);
  }, [isLoadingNext, loadNext]);

  return (
    <Flex flexDirection='column'>
      <Card mt='10px' p='12px'>
        <TextField placeholder="What's happening?" value={content} onChange={e => setContent(e.target.value)} />
        <CardActions mt='10px' justifyContent='flex-end'>
          <Button onClick={onSubmit} disabled={content.trim().length === 0}>
            Post
          </Button>
        </CardActions>
      </Card>
      {posts.edges.map(({ node }) => (
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

const feedSolution = `import React, { useCallback, useState } from 'react';
import { Button, Card, CardActions, Flex, TextField } from '@workshop/ui';
import { graphql, usePaginationFragment, useMutation } from 'react-relay';

import Post from './Post';
import { PostCreate } from './PostCreateMutation';

type Props = {
  query: any;
};
const Feed = (props: Props) => {
  const { data, loadNext, isLoadingNext, hasNext } = usePaginationFragment(
    ${feedFragment},
    props.query,
  );

  const { posts } = data;

  const [content, setContent] = useState('');

  const [postCreate, isPending] = useMutation(PostCreate);

  const onSubmit = () => {
    postCreate({
      variables: {
        input: {
          content,
        },
        // the connection id, same as ConnectionHandler.getConnectionID(ROOT_ID, 'Feed_posts')
        connections: [posts.__id],
      },
      onCompleted: () => {
        setContent('');
      },
    });
  };

  const loadMore = useCallback(() => {
    // Don't fetch again if we're already loading the next page
    if (isLoadingNext) {
      return;
    }
    loadNext(3);
  }, [isLoadingNext, loadNext]);

  return (
    <Flex flexDirection='column'>
      <Card mt='10px' p='12px'>
        <TextField placeholder="What's happening?" value={content} onChange={e => setContent(e.target.value)} />
        <CardActions mt='10px' justifyContent='flex-end'>
          <Button onClick={onSubmit} disabled={content.trim().length === 0 || isPending}>
            Post
          </Button>
        </CardActions>
      </Card>
      {posts.edges.map(({ node }) => (
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

const postCreateMutation = `import { graphql } from 'react-relay';

/**
 * TODO
 * add the PostCreateMutation here (input and output)
 * and use @prependEdge or @appendEdge(connections: $connections) on postEdge
 */
`;

const postCreateMutationSolution = `import { graphql } from 'react-relay';

export const PostCreate = graphql\`
  mutation PostCreateMutation($input: PostCreateInput!, $connections: [ID!]!) {
    PostCreate(input: $input) {
      success
      error
      postEdge @prependEdge(connections: $connections) {
        node {
          id
          ...Post_post
        }
      }
    }
  }
\`;
`;

const postDeleteMutationSolution = `import { graphql } from 'react-relay';

export const PostDelete = graphql\`
  mutation PostDeleteMutation($input: PostDeleteInput!, $connections: [ID!]!) {
    PostDelete(input: $input) {
      success
      error
      postId @deleteEdge(connections: $connections)
    }
  }
\`;
`;

const postFragment = `graphql\`
      fragment Post_post on Post {
        id
        content
        author {
          name
        }
        meHasLiked
        likesCount
      }
    \``;

const postBody = `  const [postLike] = useMutation(PostLike);
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
`;

const postView = `  return (
    <Card mt='10px' p='12px'>
      <Flex alignItems='center' gap='8px'>
        <Avatar>{post.author?.name?.charAt(0) ?? '?'}</Avatar>
        <Text fontWeight={600}>{post.author?.name}</Text>
      </Flex>
      <Text mt='10px'>{post.content}</Text>
      <CardActions mt='8px'>
        <IconButton aria-label='like' onClick={handleLike}>
          <Icon style={{ color: post.meHasLiked ? theme.relayOrange : theme.relayDark }} />
        </IconButton>
        {post.likesCount > 0 ? <Text>{post.likesCount}</Text> : null}
        <Flex flex={1} />
        <IconButton aria-label='delete post' title='Delete post' onClick={deletePost}>
          <DeleteIcon />
        </IconButton>
      </CardActions>
    </Card>
  );
};

export default Post;
`;

const post = `import React from 'react';
import { useFragment, graphql, useMutation } from 'react-relay';
import { Avatar, Card, CardActions, DeleteIcon, FavoriteBorderIcon, FavoriteIcon, Flex, IconButton, Text, theme } from '@workshop/ui';

import { likeOptimisticResponse, PostLike } from './PostLikeMutation';
import { PostUnLike, unlikeOptimisticResponse } from './PostUnLikeMutation';

type Props = {
  post: any;
};
const Post = (props: Props) => {
  const post = useFragment(
    ${postFragment},
    props.post,
  );

${postBody}
  /**
   * TODO (extra)
   * consume your PostDeleteMutation here
   */

  const deletePost = () => {
    /**
     * TODO (extra)
     * delete the post given its id and remove it from the Feed_posts connection using @deleteEdge
     */
  };

${postView}`;

const postSolution = `import React from 'react';
import { useFragment, graphql, useMutation } from 'react-relay';
import { ConnectionHandler, ROOT_ID } from 'relay-runtime';
import { Avatar, Card, CardActions, DeleteIcon, FavoriteBorderIcon, FavoriteIcon, Flex, IconButton, Text, theme, useSnackbar } from '@workshop/ui';

import { likeOptimisticResponse, PostLike } from './PostLikeMutation';
import { PostUnLike, unlikeOptimisticResponse } from './PostUnLikeMutation';
import { PostDelete } from './PostDeleteMutation';

type Props = {
  post: any;
};
const Post = (props: Props) => {
  const post = useFragment(
    ${postFragment},
    props.post,
  );

  const { enqueueSnackbar } = useSnackbar();

${postBody}
  const [postDelete] = useMutation(PostDelete);

  const deletePost = () => {
    const connectionID = ConnectionHandler.getConnectionID(ROOT_ID, 'Feed_posts');

    postDelete({
      variables: {
        input: {
          postId: post.id,
        },
        connections: [connectionID],
      },
      onCompleted: ({ PostDelete }) => {
        if (PostDelete?.error) {
          enqueueSnackbar(PostDelete.error);
        }
      },
    });
  };

${postView}`;

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

const newPostContent = 'Declarative directives are awesome';

const allSources = ({ files, source }: CheckContext) =>
  Object.keys(files)
    .map(f => source(f))
    .join('\n');

const createPost = async (ctx: CheckContext) => {
  const { screen, user, waitFor, network, assert } = ctx;
  await waitFor(() => assert(network.some(e => e.name === 'AppQuery' && e.status !== 'pending'), 'AppQuery was not sent'));
  const input = await waitFor(() => screen.getByPlaceholderText("What's happening?"));
  await user.clear(input);
  await user.type(input, newPostContent);
  const sinceId = network.length ? network[network.length - 1].id : 0;
  await user.click(screen.getByRole('button', { name: 'Post' }));
  return sinceId;
};

let mutationId = 0;

export const exercise13: Exercise = {
  slug: '13-declarativeDirectives',
  number: '13',
  title: 'Declarative directives',
  summary: 'Add the created post to the feed connection with @prependEdge/@appendEdge, no updater needed.',
  tags: ['@prependEdge', '@appendEdge', '@deleteEdge', 'connections'],
  mode: 'app',
  activeFile: 'PostCreateMutation.tsx',
  instructions: `# 13 - Declarative directives

Learn how to use declarative directives to modify GraphQL data and see the connection updating automatically, without the need to refetch or write an \`updater\` function.

## Exercise

- [ ] put your user token in the \`Authorization\` header on the Network Layer (\`relay/fetchGraphQL.tsx\`, \`getToken()\` from \`relay/getToken.tsx\` already returns your token, this replaces \`pnpm get-token\`)
- [ ] create a \`PostCreateMutation\` in \`PostCreateMutation.tsx\` using \`@appendEdge\` or \`@prependEdge\` (try both to see the difference)
- [ ] commit the mutation in \`Feed.tsx\` when clicking **Post**, passing the \`Feed_posts\` connection id in \`$connections\`

## Extras

- [ ] add a \`PostDeleteMutation\` using \`@deleteEdge\` and use it in the delete button of \`Post.tsx\` (you can only delete your own posts)

## Code Helpers

PostCreateMutation

\`\`\`graphql
mutation PostCreateMutation($input: PostCreateInput!, $connections: [ID!]!) {
  PostCreate(input: $input) {
    success
    error
    postEdge @appendEdge(connections: $connections) {
      node {
        id
        content
        author {
          name
        }
      }
    }
  }
}
\`\`\`

Getting the connection id

\`\`\`js
// select __id in the connection (see Feed_query)
const connectionID = posts.__id;
// OR
const connectionID = ConnectionHandler.getConnectionID(ROOT_ID, 'Feed_posts');
\`\`\``,
  notes: `# Why use Declarative Directives

GraphQL mutations let you modify data in your GraphQL server.
After a mutation, you can update your frontend without the need to refresh it using Declarative Directives.

## What are Declarative Directives

Declarative Directives are used to add newly created records to your connection (or remove deleted ones).
They can replace the usage of an \`updater\` function on your mutation: with Declarative Directives Relay does that for you.

We have \`@appendNode\`/\`@prependNode\` and \`@appendEdge\`/\`@prependEdge\` to insert new records. The difference is how your backend returns the data after the mutation.
For example, if your mutation returns something like this:

\`\`\`graphql
mutation AddTodoMutation($input: AddTodoInput!) {
  addTodo(input: $input) {
    todoEdge {
      cursor
      node {
        id
        text
        completed
      }
    }
  }
}
\`\`\`

You should use \`@appendEdge\`. So your mutation would look like this:

\`\`\`graphql
mutation AddTodoMutation($input: AddTodoInput!, $connections: [ID!]!) {
  addTodo(input: $input) {
    todoEdge @appendEdge(connections: $connections) {
      cursor
      node {
        id
        text
        completed
      }
    }
  }
}
\`\`\`

If your mutation returns only the node, use \`@appendNode(connections: $connections, edgeTypeName: "TodoEdge")\`.

As you can see, when using Declarative Directives it is necessary to pass your connection ids as well. You can get them from your fragment selecting \`__id\` in the connection field, or with \`ConnectionHandler.getConnectionID(parentID, connectionKey, filters)\`. In this exercise we already have this setup for you, take a look at \`Feed.tsx\` to see how it's done.

## Deleting records

- \`@deleteEdge(connections: $connections)\` on an \`ID\` field removes the edges of that node from the connections
- \`@deleteRecord\` on an \`ID\` field removes the record from the whole store

\`\`\`graphql
mutation PostDeleteMutation($input: PostDeleteInput!, $connections: [ID!]!) {
  PostDelete(input: $input) {
    postId @deleteEdge(connections: $connections)
  }
}
\`\`\`

## References

- https://relay.dev/docs/guided-tour/list-data/updating-connections/
- https://relay.dev/docs/guided-tour/updating-data/graphql-mutations/`,
  hints: [
    'In `relay/fetchGraphQL.tsx` add `Authorization: getToken()` to the `headers` object.',
    'Export the mutation from `PostCreateMutation.tsx`: `export const PostCreate = graphql`mutation PostCreateMutation($input: PostCreateInput!, $connections: [ID!]!) { PostCreate(input: $input) { postEdge @prependEdge(connections: $connections) { node { id ...Post_post } } } }``.',
    'In `Feed.tsx`: `const [postCreate] = useMutation(PostCreate)` and `postCreate({ variables: { input: { content }, connections: [posts.__id] } })`.',
    '`@prependEdge` puts the new post at the top of the feed, `@appendEdge` at the end of the loaded posts.',
  ],
  files: {
    ...relayProject({ withToken: false, withSnackbar: true }),
    'relay/getToken.tsx': getToken,
    'relay/fetchGraphQL.tsx': fetchGraphQLStarter,
    'App.tsx': app,
    'Feed.tsx': feed,
    'Post.tsx': post,
    'PostCreateMutation.tsx': postCreateMutation,
    'PostLikeMutation.tsx': postLikeMutation,
    'PostUnLikeMutation.tsx': postUnLikeMutation,
  },
  solution: {
    'relay/fetchGraphQL.tsx': fetchGraphQL({ withToken: true }),
    'PostCreateMutation.tsx': postCreateMutationSolution,
    'Feed.tsx': feedSolution,
    'PostDeleteMutation.tsx': postDeleteMutationSolution,
    'Post.tsx': postSolution,
  },
  hiddenFiles: [...BASE_HIDDEN.filter(f => f !== 'relay/fetchGraphQL.tsx' && f !== 'relay/getToken.tsx'), 'PostLikeMutation.tsx', 'PostUnLikeMutation.tsx'],
  checks: [
    {
      title: 'PostCreateMutation uses @prependEdge or @appendEdge(connections: $connections)',
      run: ctx => {
        const code = allSources(ctx);
        ctx.assert(/mutation\s+PostCreateMutation\b/.test(code), 'Declare a `mutation PostCreateMutation` in PostCreateMutation.tsx');
        ctx.assert(
          /@(prepend|append)(Edge|Node)\s*\(\s*connections\s*:\s*\$connections/.test(code),
          'Add @prependEdge(connections: $connections) (or @appendEdge) to the postEdge field of PostCreateMutation',
        );
        ctx.assert(/\$connections\s*:\s*\[\s*ID\s*!\s*\]\s*!/.test(code), 'Declare the `$connections: [ID!]!` variable in PostCreateMutation');
      },
    },
    {
      title: 'The network layer sends the Authorization header',
      run: async ({ network, waitFor, assert }) => {
        await waitFor(() => assert(network.some(e => e.name === 'AppQuery' && e.status !== 'pending'), 'AppQuery was not sent'));
        const entry = network.find(e => e.name === 'AppQuery')!;
        assert(entry.authorized, 'AppQuery was sent without the Authorization header. Add `Authorization: getToken()` to the headers in relay/fetchGraphQL.tsx');
      },
    },
    {
      title: 'Clicking "Post" sends PostCreateMutation with the connections',
      run: async ctx => {
        const sinceId = await createPost(ctx);
        const entry = await ctx.waitFor(() => {
          const e = ctx.network.find(n => n.name === 'PostCreateMutation' && n.id > sinceId && n.status !== 'pending');
          ctx.assert(e, 'PostCreateMutation was not sent when clicking "Post". Commit the mutation in the onSubmit of Feed.tsx');
          return e!;
        });
        mutationId = entry.id;
        ctx.assert(entry.authorized, 'PostCreateMutation was sent without the Authorization header');
        const vars = entry.variables as any;
        ctx.assert(vars?.input?.content === newPostContent, 'Send the typed content in `input.content`');
        ctx.assert(Array.isArray(vars?.connections) && vars.connections.length > 0 && vars.connections.every(Boolean), 'Pass the Feed_posts connection id in `connections: [posts.__id]`');
        ctx.assert(ctx.server.db.posts.some(p => p.content === newPostContent), 'The post was not created on the server');
      },
    },
    {
      title: 'The new post shows up in the feed without a refetch',
      run: async ctx => {
        await ctx.waitFor(() =>
          ctx.assert(
            ctx.screen.queryAllByText(newPostContent).length > 0,
            'The new post is not rendered. Use @prependEdge/@appendEdge on postEdge and pass the connection id',
          ),
        );
        const refetches = ctx.network.filter(e => e.kind === 'query' && e.id > mutationId);
        ctx.assert(refetches.length === 0, `Do not refetch after the mutation (${refetches.map(e => e.name).join(', ')} was sent), let the declarative directive update the connection`);
        ctx.assert(ctx.screen.queryAllByText(newPostContent).length === 1, 'The new post should be rendered exactly once');
      },
    },
  ],
};
