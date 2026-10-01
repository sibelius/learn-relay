import type { CheckContext, Exercise } from './types';
import { BASE_HIDDEN, operationsNamed, relayProject } from './shared';

const app = `import React from 'react';
import { Content, Flex, Text } from '@workshop/ui';
import { useLazyLoadQuery, graphql } from 'react-relay';

import Post from './Post';

const App = () => {
  const response = useLazyLoadQuery(
    graphql\`
      query AppQuery {
        posts(first: 3) {
          edges {
            node {
              id
              ...Post_post
            }
          }
        }
      }
    \`,
    {},
    { fetchPolicy: 'network-only' },
  );

  return (
    <Content>
      <Flex flexDirection='column'>
        <Text fontSize={20} fontWeight={700}>Posts</Text>
        <Text color='#6b7280'>Tip: increase the latency in the Network tab to feel the difference</Text>
        {response.posts.edges.map(({ node }) => (
          <Post key={node.id} post={node} />
        ))}
      </Flex>
    </Content>
  );
};

export default App;
`;

const postLikeMutation = `import { graphql } from 'react-relay';

export const PostLike = graphql\`
  mutation PostLikeMutation($input: PostLikeInput!) {
    PostLike(input: $input) {
      success
      error
      post {
        id
        likesCount
        meHasLiked
      }
    }
  }
\`;

export const PostUnLike = graphql\`
  mutation PostUnLikeMutation($input: PostUnLikeInput!) {
    PostUnLike(input: $input) {
      success
      error
      post {
        id
        likesCount
        meHasLiked
      }
    }
  }
\`;
`;

const postCommentCreateMutation = `import { graphql } from 'react-relay';

export const PostCommentCreate = graphql\`
  mutation PostCommentCreateMutation($input: PostCommentCreateInput!, $connections: [ID!]!) {
    PostCommentCreate(input: $input) {
      success
      error
      commentEdge @appendEdge(connections: $connections) {
        node {
          id
          body
        }
      }
      post {
        id
        commentsCount
      }
    }
  }
\`;
`;

const postHeader = `import React, { useState } from 'react';
import { Button, Card, CardActions, Flex, IconButton, Text, TextField, FavoriteIcon, FavoriteBorderIcon } from '@workshop/ui';
import { graphql, useFragment, useMutation } from 'react-relay';
import { ConnectionHandler } from 'relay-runtime';

import { PostLike, PostUnLike } from './PostLikeMutation';
import { PostCommentCreate } from './PostCommentCreateMutation';

type Props = {
  post: any;
};
const Post = (props: Props) => {
  const post = useFragment(
    graphql\`
      fragment Post_post on Post {
        id
        content
        likesCount
        meHasLiked
        commentsCount
        comments(first: 10) @connection(key: "Post_comments") {
          edges {
            node {
              id
              body
            }
          }
        }
      }
    \`,
    props.post,
  );
  const [body, setBody] = useState('');
  const [commitLike] = useMutation(PostLike);
  const [commitUnLike] = useMutation(PostUnLike);
  const [commitComment] = useMutation(PostCommentCreate);
`;

const postRender = `
  return (
    <Card mt='10px' p='10px' data-testid='post'>
      <Text>{post.content}</Text>
      <CardActions>
        <IconButton data-testid='likeButton' aria-label={post.meHasLiked ? 'Unlike' : 'Like'} onClick={handleLike}>
          {post.meHasLiked ? <FavoriteIcon color='#e11d48' /> : <FavoriteBorderIcon />}
        </IconButton>
        <Text data-testid='likesCount'>{post.likesCount} likes</Text>
        <Text ml='16px' data-testid='commentsCount'>{post.commentsCount} comments</Text>
      </CardActions>
      <Flex flexDirection='column' ml='8px'>
        {post.comments.edges.map(({ node }) => (
          <Text key={node.id} color='#4b5563'>
            💬 {node.body}
          </Text>
        ))}
      </Flex>
      <Flex mt='8px'>
        <TextField placeholder='Add a comment' value={body} onChange={e => setBody(e.target.value)} />
        <Button ml='8px' onClick={handleComment} disabled={!body.trim()}>
          Comment
        </Button>
      </Flex>
    </Card>
  );
};

export default Post;
`;

const postStarter = `${postHeader}
  /**
   * TODO
   * the like count only changes after the server responds (try a latency of 2000ms)
   * add an optimisticResponse so the UI updates instantly
   */
  const handleLike = () => {
    const config = {
      variables: {
        input: { post: post.id },
      },
    };

    if (post.meHasLiked) {
      commitUnLike(config);
      return;
    }

    commitLike(config);
  };

  /**
   * TODO
   * add an optimisticUpdater that
   * - increments post.commentsCount
   * - creates a new Comment record and inserts an edge in the Post_comments connection
   */
  const handleComment = () => {
    const connectionID = ConnectionHandler.getConnectionID(post.id, 'Post_comments');

    commitComment({
      variables: {
        input: { post: post.id, body },
        connections: [connectionID],
      },
    });
    setBody('');
  };
${postRender}`;

const postSolution = `${postHeader}
  const handleLike = () => {
    const meHasLiked = !post.meHasLiked;
    const config = {
      variables: {
        input: { post: post.id },
      },
      // the shape of the optimisticResponse must match the mutation selection
      optimisticResponse: {
        [meHasLiked ? 'PostLike' : 'PostUnLike']: {
          success: '',
          error: null,
          post: {
            id: post.id,
            meHasLiked,
            likesCount: meHasLiked ? post.likesCount + 1 : post.likesCount - 1,
          },
        },
      },
    };

    if (post.meHasLiked) {
      commitUnLike(config);
      return;
    }

    commitLike(config);
  };

  const handleComment = () => {
    const connectionID = ConnectionHandler.getConnectionID(post.id, 'Post_comments');
    const text = body;

    commitComment({
      variables: {
        input: { post: post.id, body: text },
        connections: [connectionID],
      },
      // runs right away, and it is rolled back when the server responds
      optimisticUpdater: store => {
        const postProxy = store.get(post.id);
        if (!postProxy) return;
        postProxy.setValue((postProxy.getValue('commentsCount') as number) + 1, 'commentsCount');

        const id = \`client:newComment:\${Date.now()}\`;
        const comment = store.create(id, 'Comment');
        comment.setValue(id, 'id');
        comment.setValue(text, 'body');

        const connection = store.get(connectionID);
        if (!connection) return;
        const edge = ConnectionHandler.createEdge(store, connection, comment, 'CommentEdge');
        ConnectionHandler.insertEdgeAfter(connection, edge);
      },
    });
    setBody('');
  };
${postRender}`;

// ---- check helpers
const cards = (ctx: CheckContext) => [...ctx.root.querySelectorAll('[data-testid="post"]')] as HTMLElement[];
const numberIn = (card: HTMLElement, testId: string) => {
  const text = card.querySelector(`[data-testid="${testId}"]`)?.textContent ?? '';
  const m = text.match(/-?\d+/);
  return m ? Number(m[0]) : NaN;
};
const lastEntry = (ctx: CheckContext, name: string) => operationsNamed(ctx.network, name).at(-1) as (typeof ctx.network)[number] | undefined;
const LATENCY_TIP = '(keep the latency in the Network tab above 0ms, the default is 300ms)';

const instantLikeCheck = async (ctx: CheckContext, index: number, mutation: string, delta: number) => {
  const card = cards(ctx)[index];
  ctx.assert(card, `Post #${index + 1} was not rendered`);
  const before = numberIn(card, 'likesCount');
  const button = card.querySelector('[data-testid="likeButton"]') as HTMLElement;
  ctx.assert(button, 'Keep the like button with data-testid="likeButton"');
  const requestsBefore = operationsNamed(ctx.network, mutation).length;
  ctx.fireEvent.click(button);
  await ctx.waitFor(() =>
    ctx.assert(numberIn(cards(ctx)[index], 'likesCount') === before + delta, `Expected ${before + delta} likes after clicking the like button, got ${numberIn(cards(ctx)[index], 'likesCount')}`),
  );
  const entry = lastEntry(ctx, mutation);
  ctx.assert(entry && operationsNamed(ctx.network, mutation).length > requestsBefore, `Clicking the like button should send ${mutation}`);
  ctx.assert(
    entry!.status === 'pending',
    `The likes count only changed after the server responded. Add an optimisticResponse to the ${mutation.replace('Mutation', '')} mutation so the UI updates before the response ${LATENCY_TIP}`,
  );
  await ctx.waitFor(() => ctx.assert(lastEntry(ctx, mutation)!.status !== 'pending', `waiting for ${mutation} to finish`));
  ctx.assert(lastEntry(ctx, mutation)!.status === 'done', `${mutation} failed: ${JSON.stringify((lastEntry(ctx, mutation)!.response as any)?.errors?.[0]?.message)}`);
  await ctx.waitFor(() => ctx.assert(numberIn(cards(ctx)[index], 'likesCount') === before + delta, 'After the server response the likes count should stay updated'));
};

export const exercise14: Exercise = {
  slug: '14-optimisticUpdates',
  number: '14',
  title: 'Optimistic updates',
  summary: 'Make mutations feel instant with optimisticResponse and optimisticUpdater, and see them rolled back.',
  tags: ['optimisticResponse', 'optimisticUpdater', 'useMutation'],
  mode: 'app',
  activeFile: 'Post.tsx',
  bonus: true,
  instructions: `# 14 - Optimistic updates (bonus)

Mutations are a round trip to the server. With a slow network the user clicks "like" and nothing happens for a while.
Relay can apply an **optimistic update** to the store right away, and replace it with the real server response when it arrives.

Set the latency in the **Network** tab to \`2000ms\` and click the like button to feel the problem.

## Exercise

- Add an \`optimisticResponse\` to the like/unlike mutations in \`Post.tsx\`, so the likes count and the heart change instantly
- Add an \`optimisticUpdater\` to the \`PostCommentCreate\` mutation that
  - increments \`commentsCount\` of the post
  - creates a new \`Comment\` record (\`store.create\`) and inserts an edge in the \`Post_comments\` connection (\`ConnectionHandler.createEdge\` + \`ConnectionHandler.insertEdgeAfter\`)

The checks also verify that an optimistic update is **rolled back** when the server does not confirm it.

## Extras

- [ ] use an \`optimisticResponse\` + \`@appendEdge\` for the comment instead of an \`optimisticUpdater\`
- [ ] watch the **Relay Store** tab while a mutation is in flight
- [ ] show the comment in a lighter color while it is still optimistic (hint: the id starts with \`client:\`)`,
  notes: `# Optimistic updates

When you commit a mutation, Relay can update the store **before** the server responds. There are two ways to do it.

## optimisticResponse

A fake server response with the same shape as the mutation selection. Relay normalizes it into the store like a real response:

\`\`\`js
commitLike({
  variables: { input: { post: post.id } },
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
});
\`\`\`

Every record is identified by its \`id\`, so the Post record is updated and every component reading it re-renders.

## optimisticUpdater

When the change is not easy to express as a response, write imperative code against the store:

\`\`\`js
commitComment({
  variables,
  optimisticUpdater: store => {
    const post = store.get(postId);
    post.setValue(post.getValue('commentsCount') + 1, 'commentsCount');

    const comment = store.create(\`client:newComment:\${Date.now()}\`, 'Comment');
    comment.setValue(body, 'body');

    const connection = ConnectionHandler.getConnection(post, 'Post_comments');
    const edge = ConnectionHandler.createEdge(store, connection, comment, 'CommentEdge');
    ConnectionHandler.insertEdgeAfter(connection, edge);
  },
});
\`\`\`

## Rollback

Optimistic updates live in a separate layer on top of the store. When the mutation completes (or fails) Relay **rolls back** the optimistic layer and applies the real response.
If the server does not confirm the change (an error, or a payload without the post), the UI goes back to the server state automatically - you don't have to undo anything.

## References

- https://relay.dev/docs/guided-tour/updating-data/graphql-mutations/#optimistic-updates
- https://relay.dev/docs/guided-tour/updating-data/imperatively-modifying-store-data/
- https://relay.dev/docs/api-reference/use-mutation/`,
  hints: [
    'The optimisticResponse is keyed by the mutation field: `{ PostLike: { success: "", error: null, post: { id, likesCount, meHasLiked } } }`.',
    'Compute the next state from the current fragment data: `likesCount: post.meHasLiked ? post.likesCount - 1 : post.likesCount + 1`.',
    'Inside optimisticUpdater use `store.get(post.id)`, `setValue(value, "commentsCount")`, `store.create(id, "Comment")` and `ConnectionHandler.createEdge(store, store.get(connectionID), comment, "CommentEdge")`.',
  ],
  files: {
    ...relayProject({ withToken: true }),
    'App.tsx': app,
    'Post.tsx': postStarter,
    'PostLikeMutation.tsx': postLikeMutation,
    'PostCommentCreateMutation.tsx': postCommentCreateMutation,
  },
  solution: {
    'Post.tsx': postSolution,
  },
  hiddenFiles: BASE_HIDDEN,
  checks: [
    {
      title: 'Posts are rendered',
      run: async ctx => {
        await ctx.waitFor(() => ctx.assert(cards(ctx).length === 3, 'Render the 3 posts with data-testid="post"'));
      },
    },
    {
      title: 'Like updates the UI before the server responds (optimisticResponse)',
      run: ctx => instantLikeCheck(ctx, 0, 'PostLikeMutation', 1),
    },
    {
      title: 'Unlike updates the UI before the server responds',
      run: ctx => instantLikeCheck(ctx, 0, 'PostUnLikeMutation', -1),
    },
    {
      title: 'A new comment shows up before the server responds (optimisticUpdater)',
      run: async ctx => {
        const card = cards(ctx)[0];
        const body = `Optimistic comment ${Date.now()}`;
        const before = numberIn(card, 'commentsCount');
        const input = card.querySelector('input') as HTMLInputElement;
        ctx.assert(input, 'Keep the comment input');
        await ctx.user.type(input, body);
        const button = [...card.querySelectorAll('button')].find(b => /comment/i.test(b.textContent ?? '')) as HTMLElement;
        ctx.assert(button, 'Keep the "Comment" button');
        ctx.fireEvent.click(button);
        await ctx.waitFor(() => ctx.assert(cards(ctx)[0].textContent?.includes(body), 'The new comment was never rendered'));
        const entry = lastEntry(ctx, 'PostCommentCreateMutation');
        ctx.assert(entry, 'Clicking "Comment" should send PostCommentCreateMutation');
        ctx.assert(
          entry!.status === 'pending',
          `The comment only showed up after the server responded. Add an optimisticUpdater that inserts the comment edge in the Post_comments connection ${LATENCY_TIP}`,
        );
        ctx.assert(
          numberIn(cards(ctx)[0], 'commentsCount') === before + 1,
          `The comment is there, but commentsCount is still ${before}. Increment it in the optimisticUpdater with setValue`,
        );
        await ctx.waitFor(() => ctx.assert(lastEntry(ctx, 'PostCommentCreateMutation')!.status !== 'pending', 'waiting for the mutation'));
        await ctx.sleep(100);
        const occurrences = cards(ctx)[0].textContent!.split(body).length - 1;
        ctx.assert(occurrences === 1, `After the server responded the comment is rendered ${occurrences} times, expected exactly once`);
        ctx.assert(numberIn(cards(ctx)[0], 'commentsCount') === before + 1, 'After the server response commentsCount should be the server value');
      },
    },
    {
      title: 'The optimistic update is rolled back when the server does not confirm it',
      run: async ctx => {
        const card = cards(ctx)[1];
        ctx.assert(card, 'Post #2 was not rendered');
        const before = numberIn(card, 'likesCount');
        // the post is deleted on the server: PostLike returns post: null
        const id = ctx.server.db.posts.find(p => card.textContent?.includes(p.content))?._id;
        ctx.server.db.posts = ctx.server.db.posts.filter(p => p._id !== id);
        ctx.fireEvent.click(card.querySelector('[data-testid="likeButton"]') as HTMLElement);
        await ctx.waitFor(() => ctx.assert(numberIn(cards(ctx)[1], 'likesCount') === before + 1, 'The optimistic like was not applied to the second post'));
        await ctx.waitFor(() => ctx.assert(lastEntry(ctx, 'PostLikeMutation')!.status !== 'pending', 'waiting for the mutation'));
        await ctx.waitFor(() =>
          ctx.assert(
            numberIn(cards(ctx)[1], 'likesCount') === before,
            `The server did not like the post, the likes count should go back to ${before}. Don't update the store manually, let Relay roll back the optimistic update`,
          ),
        );
      },
    },
  ],
};
