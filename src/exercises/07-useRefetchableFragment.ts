import type { Exercise } from './types';
import { BASE_HIDDEN, relayProject } from './shared';

// ---- files shared by the feed exercises (07, 08, 09)

export const appFeed = `import React from 'react';
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

export const feed = (postImport = './Post') => `import React, { useCallback } from 'react';
import { Button, Flex } from '@workshop/ui';
import { graphql, usePaginationFragment } from 'react-relay';

import Post from '${postImport}';

type Props = {
  query: any;
};
const Feed = (props: Props) => {
  const { data, loadNext, isLoadingNext } = usePaginationFragment(
    graphql\`
      fragment Feed_query on Query
      @argumentDefinitions(first: { type: Int, defaultValue: 3 }, after: { type: String })
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
    loadNext(1);
  }, [isLoadingNext, loadNext]);

  return (
    <Flex flexDirection='column'>
      {posts.edges.map(({ node }) => (
        <Post key={node.id} post={node} me={me} />
      ))}
      <Button mt='10px' onClick={loadMore} disabled={!posts.pageInfo.hasNextPage}>
        Load More
      </Button>
    </Flex>
  );
};

export default Feed;
`;

export const post = `import React from 'react';
import { useFragment, graphql } from 'react-relay';
import { Card, CardActions, Text } from '@workshop/ui';

import PostCommentComposer from './comment/PostCommentComposer';
import PostLikeButton from './like/PostLikeButton';
import PostComments from './comment/PostComments';

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
        meHasLiked
        likesCount
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
    <Card mt='10px' p='10px' data-testid='post'>
      <Text>{post.content}</Text>
      <Text mt='4px' color='#6b7280'>Author: {post.author?.name}</Text>
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

export const userAvatar = `import React from 'react';
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
        <Text ml='10px' fontWeight={600} color={theme.relayDark}>
          {user.name}
        </Text>
      )}
    </Flex>
  );
};

export default UserAvatar;
`;

export const postCommentComposer = `import React, { useState } from 'react';
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

    postCommentCreate({
      variables: {
        input,
      },
      updater: updater(post.id),
      optimisticUpdater: optimisticUpdater(input, me),
      onCompleted: () => {
        setBody('');
      },
    });
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

export const postCommentCreateMutation = `import { graphql } from 'react-relay';
import { ConnectionHandler } from 'relay-runtime';
import { connectionUpdater } from '@workshop/relay';

export const PostCommentCreate = graphql\`
  mutation PostCommentCreateMutation($input: PostCommentCreateInput!) {
    PostCommentCreate(input: $input) {
      success
      error
      post {
        commentsCount
      }
      commentEdge {
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

export const updater = (parentId: string) => (store: any) => {
  const newEdge = store.getRootField('PostCommentCreate').getLinkedRecord('commentEdge');

  connectionUpdater({
    store,
    parentId,
    connectionName: 'PostComments_comments',
    edge: newEdge,
    before: true,
  });
};

let tempID = 0;

export const optimisticUpdater = (input: any, me: any) => (store: any) => {
  const id = 'client:newComment:' + tempID++;

  const node = store.create(id, 'Comment');

  const meProxy = store.get(me.id);

  node.setValue(id, 'id');
  node.setValue(input.body, 'body');
  node.setLinkedRecord(meProxy, 'user');

  const newEdge = store.create('client:newEdge:' + tempID++, 'CommentEdge');
  newEdge.setLinkedRecord(node, 'node');

  const parentProxy = store.get(input.post);
  const conn = ConnectionHandler.getConnection(parentProxy, 'PostComments_comments');
  if (conn) ConnectionHandler.insertEdgeBefore(conn, newEdge);
};
`;

export const postLikeButton = `import React from 'react';
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
      <IconButton data-testid='likeButton' onClick={handleLike}>
        <Icon style={{ color: theme.relayOrange }} />
      </IconButton>
      {post.likesCount > 0 ? <Text>{post.likesCount}</Text> : null}
    </>
  );
};

export default PostLikeButton;
`;

export const postLikeMutation = `import { graphql } from 'react-relay';

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

export const likeOptimisticResponse = (post: any) => ({
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

export const postUnLikeMutation = `import { graphql } from 'react-relay';

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

export const unlikeOptimisticResponse = (post: any) => ({
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

// PostComments rendering (shared by the starter and the solution)
const commentsList = `  return (
    <Flex flex={1} p='16px' flexDirection='column' data-testid='postComments'>
      {post.comments.edges.map(({ node }) => {
        return (
          <Flex mt='10px' key={node.id} alignItems='center'>
            <UserAvatar showName={false} user={node.user} />
            <Flex backgroundColor='#F2F3F5' borderRadius={10} p='10px' ml='10px'>
              <Text fontWeight={600} color={theme.relayDark}>
                {node.user.name}
              </Text>
              <Text ml='10px' data-testid='commentBody'>{node.body}</Text>
            </Flex>
          </Flex>
        );
      })}
      {isPending && <Loading />}
      <Flex flex={1} justifyContent='flex-end' mt='10px'>
        <Button onClick={loadMore} disabled={isDisabled}>
          Show older
        </Button>
      </Flex>
    </Flex>
  );
};

export default PostComments;
`;

export const postCommentsStarter = `import React from 'react';
import { graphql, useFragment } from 'react-relay';
import { Button, Flex, Loading, Text, theme } from '@workshop/ui';

import UserAvatar from './UserAvatar';

type Props = {
  post: any;
};
const PostComments = (props: Props) => {
  /**
   * TODO
   * use useTransition hook to "suspend" if refetch took too long
   */
  const isPending = false;

  /**
   * TODO
   * use useRefetchableFragment to be able to fetch newer/older comments of this post
   */
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
  const { edges, pageInfo } = comments;

  if (edges.length === 0) {
    return null;
  }

  /**
   * TODO
   * complete loadMore to use startTransition and refetch to fetch more comments
   */
  const loadMore = () => {};

  const isDisabled = !pageInfo.hasNextPage;

${commentsList}`;

export const postCommentsSolution = `import React, { useTransition } from 'react';
import { graphql, useRefetchableFragment } from 'react-relay';
import { Button, Flex, Loading, Text, theme } from '@workshop/ui';

import UserAvatar from './UserAvatar';

type Props = {
  post: any;
};
const PostComments = (props: Props) => {
  const [isPending, startTransition] = useTransition();

  const [post, refetch] = useRefetchableFragment(
    graphql\`
      fragment PostComments_post on Post
      @argumentDefinitions(first: { type: Int, defaultValue: 1 }, after: { type: String })
      @refetchable(queryName: "PostCommentsRefetchQuery") {
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
  const { edges, pageInfo } = comments;

  if (edges.length === 0) {
    return null;
  }

  const loadMore = () => {
    startTransition(() => {
      const after = pageInfo.endCursor;

      const variables = {
        id: post.id,
        first: 1,
        after,
      };

      refetch(variables, { fetchPolicy: 'store-or-network' });
    });
  };

  const isDisabled = !pageInfo.hasNextPage;

${commentsList}`;

// the feed project with likes and comments (exercise 07 onwards)
export const feedProject = {
  'App.tsx': appFeed,
  'Feed.tsx': feed(),
  'Post.tsx': post,
  'comment/PostComments.tsx': postCommentsSolution,
  'comment/PostCommentComposer.tsx': postCommentComposer,
  'comment/PostCommentCreateMutation.tsx': postCommentCreateMutation,
  'comment/UserAvatar.tsx': userAvatar,
  'like/PostLikeButton.tsx': postLikeButton,
  'like/PostLikeMutation.tsx': postLikeMutation,
  'like/PostUnLikeMutation.tsx': postUnLikeMutation,
};

export const FEED_HIDDEN = [
  'comment/PostCommentComposer.tsx',
  'comment/PostCommentCreateMutation.tsx',
  'comment/UserAvatar.tsx',
  'like/PostLikeButton.tsx',
  'like/PostLikeMutation.tsx',
  'like/PostUnLikeMutation.tsx',
];

// ---- checks helpers
const refetchQueryName = (code: string) => code.match(/@refetchable\s*\(\s*queryName\s*:\s*"([_A-Za-z][_0-9A-Za-z]*)"/)?.[1];

// number of comments of a post rendered inside its card
const renderedComments = (card: HTMLElement, bodies: string[]) => {
  const texts = [...card.querySelectorAll('*')].filter(el => el.children.length === 0).map(el => el.textContent?.trim());
  return texts.filter(t => t && bodies.includes(t)).length;
};

export const exercise07: Exercise = {
  slug: '07-useRefetchableFragment',
  number: '07',
  title: 'useRefetchableFragment',
  summary: 'Refetch a fragment with new variables using useRefetchableFragment and useTransition.',
  tags: ['useRefetchableFragment', '@refetchable', 'useTransition'],
  mode: 'app',
  activeFile: 'comment/PostComments.tsx',
  instructions: `# 07 - useRefetchableFragment

Learn how to refetch any fragment using \`useRefetchableFragment\`.

## Exercise

- modify \`comment/PostComments.tsx\` to use \`useRefetchableFragment\` and make the **Show older** button refetch older comments
- add \`@refetchable(queryName: "PostCommentsRefetchQuery")\` to the \`PostComments_post\` fragment, so the Relay compiler generates the refetch query for you
- use the \`useTransition\` hook to show a loading indicator if the network is slow (try increasing the latency of the server)

## Extras

- [ ] add a button to refetch new comments

## Code Helpers

- useTransition

\`useTransition\` hook let you "suspend" based on an action, usually a data fetch

\`\`\`jsx
const [isPending, startTransition] = useTransition();
\`\`\`

- refetch

\`\`\`jsx
refetch({ id: post.id, first: 1, after: pageInfo.endCursor }, { fetchPolicy: 'store-or-network' });
\`\`\``,
  notes: `# Refetching Data

\`useRefetchableFragment\` can be seen as a generalization of \`usePaginationFragment\`.
Instead of fetching only based on pagination, you can do arbitrary refetches.

\`\`\`ts
export function useRefetchableFragment<TQuery extends OperationType, TKey extends KeyType>(
  fragmentInput: GraphQLTaggedNode,
  fragmentRef: TKey,
): [data: KeyTypeData<TKey>, refetch: RefetchFnDynamic<TQuery, TKey>];
\`\`\`

\`useRefetchableFragment\` receives the fragment definition and also the \`fragmentRef\`.
The \`fragmentRef\` contains the data to be extracted by \`useRefetchableFragment\`.

Usage example:

\`\`\`jsx
const [post, refetch] = useRefetchableFragment(
  graphql\`
    fragment PostComments_post on Post
    @argumentDefinitions(first: { type: Int, defaultValue: 1 }, after: { type: String })
    @refetchable(queryName: "PostCommentsRefetchQuery") {
      id
      comments(first: $first, after: $after) { ... }
    }
  \`,
  props.post,
);
\`\`\`

\`useRefetchableFragment\` returns the fragment data and also a \`refetch\` function.
The \`refetch\` function will refetch new data when you change GraphQL variables.

## @refetchable

The \`@refetchable\` directive makes the Relay compiler generate a new query (\`PostCommentsRefetchQuery\`) that fetches only this fragment.
As \`Post\` implements the \`Node\` interface, the generated query uses \`node(id: $id)\` to refetch the fragment for this specific post:

\`\`\`graphql
query PostCommentsRefetchQuery($first: Int = 1, $after: String, $id: ID!) {
  node(id: $id) {
    ...PostComments_post @arguments(first: $first, after: $after)
  }
}
\`\`\`

## useTransition

\`refetch\` will suspend the component while the new data is loading. Wrapping it with \`startTransition\` tells React to keep showing the old UI (the current comments) while the new data loads, and \`isPending\` lets you show an inline loading indicator instead of a Suspense fallback.

## References

- https://relay.dev/docs/guided-tour/refetching/refetching-fragments-with-different-data/
- https://relay.dev/docs/api-reference/use-refetchable-fragment/
- https://react.dev/reference/react/useTransition
- https://medium.com/@sibelius/relay-modern-the-relay-store-8984cd148798`,
  hints: [
    'Replace `useFragment` with `const [post, refetch] = useRefetchableFragment(...)`.',
    'Add `@refetchable(queryName: "PostCommentsRefetchQuery")` after the `@argumentDefinitions(...)` of the fragment.',
    '`const [isPending, startTransition] = useTransition();` (import it from react).',
    "In `loadMore`: `startTransition(() => refetch({ id: post.id, first: 1, after: pageInfo.endCursor }, { fetchPolicy: 'store-or-network' }))`.",
  ],
  files: {
    ...relayProject({ withToken: true }),
    ...feedProject,
    'comment/PostComments.tsx': postCommentsStarter,
  },
  solution: {
    'comment/PostComments.tsx': postCommentsSolution,
  },
  hiddenFiles: [...BASE_HIDDEN, ...FEED_HIDDEN],
  checks: [
    {
      title: 'PostComments uses useRefetchableFragment',
      run: ({ source, assert }) => {
        const code = source('comment/PostComments.tsx');
        assert(/useRefetchableFragment\s*(<[^>]*>)?\s*\(/.test(code), 'Use useRefetchableFragment inside PostComments instead of useFragment');
      },
    },
    {
      title: 'PostComments_post fragment is @refetchable',
      run: ({ source, assert }) => {
        const code = source('comment/PostComments.tsx');
        assert(refetchQueryName(code), 'Add `@refetchable(queryName: "PostCommentsRefetchQuery")` to the PostComments_post fragment');
      },
    },
    {
      title: 'useTransition is used to refetch',
      run: ({ source, assert }) => {
        const code = source('comment/PostComments.tsx');
        assert(/useTransition\s*\(/.test(code), 'Call `const [isPending, startTransition] = useTransition()`');
        assert(/startTransition\s*\(/.test(code), 'Wrap the refetch call with startTransition(() => { ... })');
      },
    },
    {
      title: 'Clicking "Show older" refetches the fragment and renders more comments',
      run: async ({ screen, server, source, waitFor, network, user, assert }) => {
        const queryName = refetchQueryName(source('comment/PostComments.tsx'))!;
        const buttons = await waitFor(() => {
          const found = screen.getAllByRole('button', { name: /older|more comments/i });
          if (!found.length) throw new Error('no buttons');
          return found;
        });
        // find a post that has more comments to load
        let button: HTMLElement | null = null;
        let card: HTMLElement | null = null;
        for (const b of buttons) {
          if ((b as HTMLButtonElement).disabled) continue;
          button = b;
          card = (b.closest('[data-testid="post"]') ?? b.closest('.wui-card')) as HTMLElement | null;
          break;
        }
        assert(button && card, 'Could not find an enabled "Show older" button inside a post card');
        const bodies = [...new Set(server.db.comments.map(c => c.body))];
        const before = renderedComments(card!, bodies);
        assert(before > 0, 'The post comments should be rendered before refetching');
        await user.click(button!);
        await waitFor(() => {
          const entry = network.find(e => e.name === queryName);
          if (!entry) throw new Error(`Clicking "Show older" should send the ${queryName} refetch query (see the Network tab)`);
          if (entry.status === 'pending') throw new Error(`${queryName} is still loading`);
        });
        const entry = network.find(e => e.name === queryName)!;
        assert(entry.variables?.id, `${queryName} should be called with the post id: refetch({ id: post.id, ... })`);
        assert(entry.variables?.after, `${queryName} should be called with the cursor of the last comment: refetch({ after: pageInfo.endCursor, ... })`);
        await waitFor(() => {
          const after = renderedComments(card!, bodies);
          if (after <= before) throw new Error(`Expected more than ${before} comments after clicking "Show older", but found ${after}`);
        });
      },
    },
  ],
};
