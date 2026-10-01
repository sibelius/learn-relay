import type { CheckContext, Exercise } from './types';
import { BASE_HIDDEN, relayProject } from './shared';
import { postLikeMutationSolution, postUnLikeMutationSolution } from './05-useMutation';
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
        me {
          ...Post_me
        }
      }
    \`,
    props.query,
  );

  const { posts, me } = data;

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
        <Post key={node.id} post={node} me={me} />
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

const post = `import React from 'react';
import { useFragment, graphql } from 'react-relay';
import { Card, CardActions, Text } from '@workshop/ui';

import PostCommentComposer from './comment/PostCommentComposer';
import PostComments from './comment/PostComments';
import PostLikeButton from './like/PostLikeButton';

type Props = {
  post: any;
  me: any;
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

  return (
    <Card mt='10px' p='10px'>
      <Text>id: {post.id}</Text>
      <Text>content: {post.content}</Text>
      <Text color='#6b7280'>Author: {post.author?.name}</Text>
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

const postLikeButton = `import React from 'react';
import { useFragment, graphql, useMutation } from 'react-relay';
import { FavoriteIcon, FavoriteBorderIcon, IconButton, Text, theme } from '@workshop/ui';

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
        <Icon style={{ color: theme.relayOrange }} />
      </IconButton>
      {post.likesCount > 0 ? <Text>{post.likesCount}</Text> : null}
    </>
  );
};

export default PostLikeButton;
`;

const userAvatar = `import React from 'react';
import { useFragment, graphql } from 'react-relay';
import { Avatar, Flex, Text, theme } from '@workshop/ui';

export const getInitials = (name: string) => {
  return name
    ? name
        .split(' ')
        .slice(0, 2)
        .map(namePart => namePart.charAt(0))
        .join('')
    : 'AN';
};

type Props = {
  showName?: boolean;
  user: any;
};
const UserAvatar = (props: Props) => {
  const { showName = true } = props;

  const user = useFragment(
    graphql\`
      fragment UserAvatar_user on User {
        id
        name
      }
    \`,
    props.user,
  );

  const initials = getInitials(user.name);

  return (
    <Flex alignItems='center'>
      <Avatar>{initials}</Avatar>
      {showName && (
        <Text ml='10px' fontWeight='600' color={theme.relayDark}>
          {user.name}
        </Text>
      )}
    </Flex>
  );
};

export default UserAvatar;
`;

const postComments = `import React from 'react';
import { graphql, useFragment } from 'react-relay';
import { Flex, Text, theme } from '@workshop/ui';

import UserAvatar from './UserAvatar';

type Props = {
  post: any;
};
const PostComments = (props: Props) => {
  const post = useFragment(
    graphql\`
      fragment PostComments_post on Post
      @argumentDefinitions(first: { type: Int, defaultValue: 3 }, after: { type: String }) {
        id
        comments(first: $first, after: $after) @connection(key: "PostComments_comments", filters: []) {
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
            cursor
            node {
              id
              body
              user {
                id
                name
                ...UserAvatar_user
              }
            }
          }
        }
      }
    \`,
    props.post,
  );

  const { comments } = post;
  const { edges } = comments;

  if (edges.length === 0) {
    return null;
  }

  return (
    <Flex flex={1} p='0 16px 16px' flexDirection='column'>
      {edges.map(({ node }) => {
        return (
          <Flex mt='10px' key={node.id} alignItems='center'>
            <UserAvatar showName={false} user={node.user} />
            <Flex backgroundColor='#F2F3F5' borderRadius={10} p='10px' ml='10px' data-testid='comment'>
              <Text fontWeight={600} color={theme.relayDark}>
                {node.user?.name}
              </Text>
              <Text ml='10px'>{node.body}</Text>
            </Flex>
          </Flex>
        );
      })}
    </Flex>
  );
};

export default PostComments;
`;

const postCommentComposer = `import React, { useState } from 'react';
import { useFragment, graphql, useMutation } from 'react-relay';
import { Divider, Flex, IconButton, SendIcon, TextField } from '@workshop/ui';

import UserAvatar from './UserAvatar';
import { PostCommentCreate, updater, optimisticUpdater } from './PostCommentCreateMutation';

type Props = {
  post: any;
  me: any;
};
const PostCommentComposer = (props: Props) => {
  const post = useFragment(
    graphql\`
      fragment PostCommentComposer_post on Post {
        id
        author {
          ...UserAvatar_user
        }
      }
    \`,
    props.post,
  );

  const me = useFragment(
    graphql\`
      fragment PostCommentComposer_me on User {
        id
        name
      }
    \`,
    props.me,
  );

  const [body, setBody] = useState<string>('');

  const [postCommentCreate, isPending] = useMutation(PostCommentCreate);

  const handleNewComment = () => {
    const input = {
      post: post.id,
      body,
    };

    const config = {
      variables: {
        input,
      },
      updater: updater(post.id),
      optimisticUpdater: optimisticUpdater(input, me),
      onCompleted: () => {
        setBody('');
      },
    };

    postCommentCreate(config);
  };

  const isDisabled = body.length < 1 || isPending;

  return (
    <>
      <Divider />
      <Flex flex={1} p='16px' alignItems='center'>
        <UserAvatar showName={false} user={post.author} />
        <TextField
          ml='10px'
          placeholder='Write a comment...'
          aria-label='comment'
          value={body}
          onChange={e => setBody(e.target.value)}
        />
        <IconButton aria-label='send comment' onClick={handleNewComment} disabled={isDisabled}>
          <SendIcon />
        </IconButton>
      </Flex>
    </>
  );
};

export default PostCommentComposer;
`;

const mutationStarter = `import { graphql } from 'react-relay';
import { ConnectionHandler, ROOT_ID, RecordSourceSelectorProxy, SelectorStoreUpdater } from 'relay-runtime';

export const PostCommentCreate = graphql\`
  mutation PostCommentCreateMutation($input: PostCommentCreateInput!) {
    PostCommentCreate(input: $input) {
      success
      error
      post {
        commentsCount
      }
      commentEdge {
        cursor
        node {
          id
          body
          user {
            id
            name
          }
        }
      }
    }
  }
\`;

/**
 * TODO
 * finish Post Comment updater
 * the updater should add the new comment edge to the PostComments connection
 */
export const updater =
  (parentId: string): SelectorStoreUpdater =>
  (store: RecordSourceSelectorProxy) => {};

let tempID = 0;

/**
 * TODO (extra)
 * Create an optimistic updater to PostComment mutation
 * the optimistic updater should create a new comment with the correct text and author
 */
export const optimisticUpdater =
  (input: { post: string; body: string }, me: { id: string; name: string }) =>
  (store: RecordSourceSelectorProxy) => {
    const id = 'client:newComment:' + tempID++;
  };
`;

const mutationSolution = `import { graphql } from 'react-relay';
import { ConnectionHandler, RecordSourceSelectorProxy, SelectorStoreUpdater } from 'relay-runtime';

export const PostCommentCreate = graphql\`
  mutation PostCommentCreateMutation($input: PostCommentCreateInput!) {
    PostCommentCreate(input: $input) {
      success
      error
      post {
        commentsCount
      }
      commentEdge {
        cursor
        node {
          id
          body
          user {
            id
            name
          }
        }
      }
    }
  }
\`;

export const updater =
  (parentId: string): SelectorStoreUpdater =>
  (store: RecordSourceSelectorProxy) => {
    const newEdge = store.getRootField('PostCommentCreate')?.getLinkedRecord('commentEdge');
    if (!newEdge) {
      return;
    }

    const parentProxy = store.get(parentId);
    if (!parentProxy) {
      return;
    }

    const connection = ConnectionHandler.getConnection(parentProxy, 'PostComments_comments');
    if (!connection) {
      return;
    }

    // comments are sorted oldest first, so the new comment goes to the end
    ConnectionHandler.insertEdgeAfter(connection, newEdge);
  };

let tempID = 0;

export const optimisticUpdater =
  (input: { post: string; body: string }, me: { id: string; name: string }) =>
  (store: RecordSourceSelectorProxy) => {
    const id = 'client:newComment:' + tempID++;

    const node = store.create(id, 'Comment');

    const meProxy = store.get(me.id);

    node.setValue(id, 'id');
    node.setValue(input.body, 'body');
    node.setLinkedRecord(meProxy, 'user');

    const newEdge = store.create('client:newEdge:' + tempID++, 'CommentEdge');
    newEdge.setValue(id, 'cursor');
    newEdge.setLinkedRecord(node, 'node');

    const parentProxy = store.get(input.post);
    if (!parentProxy) {
      return;
    }

    const connection = ConnectionHandler.getConnection(parentProxy, 'PostComments_comments');
    if (!connection) {
      return;
    }

    ConnectionHandler.insertEdgeAfter(connection, newEdge);
  };
`;

// ---- check helpers
const newestPost = (ctx: CheckContext) => [...ctx.server.db.posts].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
const cardOf = (ctx: CheckContext, content: string) => {
  const el = ctx.screen.getByText(content, { exact: false });
  const card = el.closest('.wui-card') as HTMLElement | null;
  ctx.assert(card, 'Render each post inside a <Card>');
  return card!;
};
const lastId = (ctx: CheckContext) => (ctx.network.length ? ctx.network[ctx.network.length - 1].id : 0);
const hasText = (el: HTMLElement, text: string) =>
  [...el.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent?.trim() === text).length;

// types a comment in the composer of the newest post and sends it
const sendComment = async (ctx: CheckContext, body: string) => {
  const target = newestPost(ctx);
  await ctx.waitFor(() => ctx.screen.getByText(target.content, { exact: false }));
  const card = cardOf(ctx, target.content);
  const input = card.querySelector('input') as HTMLInputElement | null;
  ctx.assert(input, 'Render the comment composer input inside the post card');
  await ctx.user.click(input!);
  await ctx.user.type(input!, body);
  const button = card.querySelector("button[aria-label='send comment']") as HTMLButtonElement | null;
  ctx.assert(button, "Keep the send button (aria-label='send comment') in PostCommentComposer");
  const sinceId = lastId(ctx);
  await ctx.user.click(button!);
  return { target, card, sinceId };
};

const waitCommentMutation = async (ctx: CheckContext, sinceId: number) => {
  await ctx.waitFor(() =>
    ctx.assert(
      ctx.network.some(e => e.name === 'PostCommentCreateMutation' && e.id > sinceId && e.status !== 'pending'),
      'PostCommentCreateMutation was not sent when clicking the send button',
    ),
  );
  const entry = [...ctx.network].reverse().find(e => e.name === 'PostCommentCreateMutation')!;
  const errors = (entry.response as any)?.errors;
  ctx.assert(!errors, `PostCommentCreateMutation failed: ${errors?.[0]?.message}`);
  return entry;
};

const commentBody1 = 'Relay updaters are awesome';
const commentBody2 = 'Optimistic comments feel instant';

export const exercise06: Exercise = {
  slug: '06-mutationUpdater',
  number: '06',
  title: 'Mutation updater',
  summary: 'Insert a new comment into a connection with an updater, no refetch needed.',
  tags: ['updater', 'ConnectionHandler', 'optimisticUpdater', 'Relay store'],
  mode: 'app',
  activeFile: 'comment/PostCommentCreateMutation.tsx',
  instructions: `# 06 - mutation updater

Learn how to use \`updater\` to update your Relay Store without using a refetch query after a mutation.

## Exercise

- add an \`updater\` to the \`PostCommentCreate\` mutation (\`comment/PostCommentCreateMutation.tsx\`) to update the Relay Store properly: the new comment edge should be added to the \`PostComments_comments\` connection of the post

Write a comment in the first post and send it: it should show up in the comment list without a refetch.

## Extras

- [ ] use an \`optimisticUpdater\` to provide a fast feedback to the user
- [ ] show the comments count and update it (the mutation already returns \`post { commentsCount }\`)

## Code Helpers

- Get a record from the Relay store using a global id

\`\`\`js
const recordProxy = store.get(globalId);
\`\`\`

- Get the root field of the mutation payload

\`\`\`js
const newEdge = store.getRootField('PostCommentCreate').getLinkedRecord('commentEdge');
\`\`\`

- Query Type root id

\`\`\`js
import { ROOT_ID } from 'relay-runtime';
\`\`\`

- Get connection from name

\`\`\`js
const connection = ConnectionHandler.getConnection(parentProxy, connectionName);
\`\`\`

- Insert new edge to connection

\`\`\`js
ConnectionHandler.insertEdgeBefore(connection, edge);
ConnectionHandler.insertEdgeAfter(connection, edge);
\`\`\`

- Create new node in Relay store

\`\`\`js
const node = store.create(id, typename);
\`\`\`

- Set value of a node/record proxy

\`\`\`js
node.setValue(value, propertyName);
\`\`\`

- Set value that is an object or another record proxy of a node/record proxy

\`\`\`js
node.setLinkedRecord(recordProxy, propertyName);
\`\`\``,
  notes: `# Updating Relay Store

To learn how to update Relay Store, we first need to understand how Relay store is structured.

## Relay Store

Relay needs each record to have a Global ID.
A global id is an id that uniquely identifies the record even across different types.
Relay Store keeps all your GraphQL data as normalized records. Here is a \`json\` of a Relay Store:

\`\`\`json
{
  "client:root": {
    "__id": "client:root",
    "__typename": "__Root",
    "me": { "__ref": "VXNlcjp1MQ==" },
    "__Feed_posts_connection": { "__ref": "client:root:__Feed_posts_connection" }
  },
  "VXNlcjp1MQ==": {
    "__id": "VXNlcjp1MQ==",
    "__typename": "User",
    "id": "VXNlcjp1MQ==",
    "name": "Sibelius Seraphini"
  },
  "client:root:__Feed_posts_connection": {
    "__id": "client:root:__Feed_posts_connection",
    "__typename": "PostConnection",
    "pageInfo": { "__ref": "client:root:__Feed_posts_connection:pageInfo" },
    "edges": {
      "__refs": [
        "client:root:__Feed_posts_connection:edges:0",
        "client:root:__Feed_posts_connection:edges:1"
      ]
    }
  },
  "client:root:__Feed_posts_connection:edges:0": {
    "__typename": "PostEdge",
    "node": { "__ref": "UG9zdDpwMzA=" },
    "cursor": "bW9uZ286MA=="
  },
  "UG9zdDpwMzA=": {
    "__id": "UG9zdDpwMzA=",
    "__typename": "Post",
    "id": "UG9zdDpwMzA=",
    "content": "Welcome to the Relay workshop!",
    "author": { "__ref": "VXNlcjp1Mg==" },
    "meHasLiked": false,
    "likesCount": 1,
    "__PostComments_comments_connection": {
      "__ref": "client:UG9zdDpwMzA=:__PostComments_comments_connection"
    }
  }
}
\`\`\`

\`client:root\` is the id Relay uses to identify the Query type (\`ROOT_ID\`).
For global ids of this workshop we are using \`base64(typename:id)\`: if you decode \`VXNlcjp1MQ==\` you get \`User:u1\`.
Each record references another using \`__ref\`, similar to Redux \`normalizr\`.

Open the **Store** tab to explore the store of your app.

## Connection at Relay Store

A connection is a "group" of edges, so Relay provides a special way to find and update connections to provide a better DX.
You can use the \`@connection\` directive to give a name to a given connection, so you can easily add and remove edges from it.

## ConnectionHandler

\`ConnectionHandler\` is a helper that lets you add and remove edges from a connection.

- Get connection from name

\`\`\`js
const connection = ConnectionHandler.getConnection(parentProxy, connectionName);
\`\`\`

- Insert new edge to connection

\`\`\`js
ConnectionHandler.insertEdgeBefore(connection, edge);
ConnectionHandler.insertEdgeAfter(connection, edge);
\`\`\`

## When do we need to use \`updater\`?

If you just edited a node and returned it in your GraphQL mutation output field, Relay will update the store automatically.
However, when you create a new node or remove a node from a connection you need to provide an updater.
Relay cannot know which connection you want to add the node to, as you can have many connections of the same type.

## References

- https://relay.dev/docs/guided-tour/updating-data/graphql-mutations/
- https://relay.dev/docs/guided-tour/list-data/updating-connections/
- https://medium.com/@sibelius/relay-modern-the-relay-store-8984cd148798
- https://github.com/paularmstrong/normalizr`,
  hints: [
    'Get the new edge from the mutation payload: `store.getRootField("PostCommentCreate").getLinkedRecord("commentEdge")`.',
    'The parent of the connection is the post: `const parentProxy = store.get(parentId)`.',
    '`const connection = ConnectionHandler.getConnection(parentProxy, "PostComments_comments")` then `ConnectionHandler.insertEdgeAfter(connection, newEdge)` (comments are sorted oldest first).',
    'Optimistic updater: `store.create(id, "Comment")`, set `id` and `body` with `setValue`, link `user` to `store.get(me.id)`, wrap it in a `CommentEdge` created with `store.create` and insert it in the connection.',
  ],
  files: {
    ...relayProject({ withToken: true }),
    'App.tsx': app,
    'Feed.tsx': feed,
    'Post.tsx': post,
    'like/PostLikeButton.tsx': postLikeButton,
    'like/PostLikeMutation.tsx': postLikeMutationSolution,
    'like/PostUnLikeMutation.tsx': postUnLikeMutationSolution,
    'comment/PostCommentCreateMutation.tsx': mutationStarter,
    'comment/PostComments.tsx': postComments,
    'comment/PostCommentComposer.tsx': postCommentComposer,
    'comment/UserAvatar.tsx': userAvatar,
  },
  solution: {
    'comment/PostCommentCreateMutation.tsx': mutationSolution,
  },
  hiddenFiles: BASE_HIDDEN,
  checks: [
    {
      title: 'Sending a comment runs PostCommentCreateMutation',
      run: async ctx => {
        const { target, sinceId } = await sendComment(ctx, commentBody1);
        const entry = await waitCommentMutation(ctx, sinceId);
        ctx.assert((entry.variables as any)?.input?.post === toGlobalId('Post', target._id), 'Send the post id in the mutation input');
        ctx.assert(ctx.server.db.comments.some(c => c.body === commentBody1), 'The comment was not created on the server');
      },
    },
    {
      title: 'The new comment shows up without a refetch query',
      run: async ctx => {
        const target = newestPost(ctx);
        const mutation = [...ctx.network].reverse().find(e => e.name === 'PostCommentCreateMutation')!;
        await ctx.waitFor(() =>
          ctx.assert(
            hasText(cardOf(ctx, target.content), commentBody1) > 0,
            'The new comment is not rendered. Add an updater that inserts the commentEdge into the PostComments_comments connection',
          ),
        );
        const refetches = ctx.network.filter(e => e.kind === 'query' && e.id > mutation.id);
        ctx.assert(refetches.length === 0, `Do not refetch after the mutation (${refetches.map(e => e.name).join(', ')} was sent), use an updater instead`);
      },
    },
    {
      title: 'The comment edge is added to the end of the PostComments_comments connection',
      run: ctx => {
        const target = newestPost(ctx);
        const source = ctx.env().getStore().getSource();
        const post = source.get(toGlobalId('Post', target._id));
        const key = Object.keys(post ?? {}).find(k => k.startsWith('__PostComments_comments_connection'));
        ctx.assert(key, 'The PostComments_comments connection was not found in the store');
        const connection = source.get(post[key!].__ref);
        const edges: string[] = connection?.edges?.__refs ?? [];
        ctx.assert(edges.length > 0, 'The connection has no edges');
        const lastEdge = source.get(edges[edges.length - 1]);
        const node = lastEdge?.node?.__ref ? source.get(lastEdge.node.__ref) : null;
        ctx.assert(node?.body === commentBody1, 'The new comment should be the last edge of the connection (comments are sorted oldest first): use ConnectionHandler.insertEdgeAfter');
        ctx.assert(edges.filter(e => source.get(e)?.node?.__ref === lastEdge.node.__ref).length === 1, 'The comment was inserted more than once');
      },
    },
    {
      title: '(extra) Optimistic updater shows the comment before the server answers',
      run: async ctx => {
        const { target, sinceId } = await sendComment(ctx, commentBody2);
        await ctx.waitFor(
          () => ctx.assert(hasText(cardOf(ctx, target.content), commentBody2) > 0, 'waiting optimistic comment'),
          { timeout: 2000 },
        );
        const entry = ctx.network.find(e => e.name === 'PostCommentCreateMutation' && e.id > sinceId);
        ctx.assert(entry, 'PostCommentCreateMutation was not sent');
        ctx.assert(
          entry!.status === 'pending',
          'The comment only appeared after the server response. Create the comment in the store with an optimisticUpdater',
        );
        await waitCommentMutation(ctx, sinceId);
        await ctx.sleep(100);
        ctx.assert(hasText(cardOf(ctx, target.content), commentBody2) === 1, 'After the server response the comment should be rendered exactly once');
      },
    },
  ],
};
