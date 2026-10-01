import type { Exercise } from './types';
import { BASE_HIDDEN, relayProject } from './shared';
import { FEED_HIDDEN, feedProject } from './07-useRefetchableFragment';

const app = `import React from 'react';
import { Content, Flex, Text } from '@workshop/ui';
import { useLazyLoadQuery, graphql } from 'react-relay';

import Feed from './Feed';
import { useNewPostSubscription } from './postSubscription/useNewPostSubscription';

const App = () => {
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

  const { me } = query;

  useNewPostSubscription(me);

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

const postNewSubscriptionStarter = `import { graphql } from 'react-relay';
import { ConnectionHandler, ROOT_ID } from 'relay-runtime';
import { connectionUpdater } from '@workshop/relay';

/**
 * TODO
 * add PostNew subscription here (subscription PostNewSubscription)
 */
export const PostNew = '';

/**
 * TODO
 * fill updater to get the new post and add to Feed_posts connection
 * avoid duplication of post
 */
export const updater = (store: any) => {};
`;

const postNewSubscriptionSolution = `import { graphql } from 'react-relay';
import { ConnectionHandler, ROOT_ID } from 'relay-runtime';
import { connectionUpdater } from '@workshop/relay';

export const PostNew = graphql\`
  subscription PostNewSubscription($input: PostNewInput!) {
    PostNew(input: $input) {
      post {
        id
        content
        author {
          id
          name
        }
        meHasLiked
        likesCount
        ...Post_post
        ...PostComments_post
      }
    }
  }
\`;

export const updater = (store: any) => {
  const postNode = store.getRootField('PostNew')?.getLinkedRecord('post');

  if (!postNode) {
    return;
  }

  const postId = postNode.getDataID();

  const postConnection = ConnectionHandler.getConnection(store.getRoot(), 'Feed_posts');

  if (!postConnection) {
    return;
  }

  // avoid duplication (mutation + subscription update)
  const edges = postConnection.getLinkedRecords('edges') ?? [];
  const alreadyInFeed = edges.some(edge => edge?.getLinkedRecord('node')?.getDataID() === postId);

  if (alreadyInFeed) {
    return;
  }

  // create post edge
  const postEdge = ConnectionHandler.createEdge(store, postConnection, postNode, 'PostEdge');

  connectionUpdater({
    store,
    parentId: ROOT_ID,
    connectionName: 'Feed_posts',
    edge: postEdge,
    before: true,
  });
};
`;

const useNewPostSubscriptionStarter = `import React, { useMemo } from 'react';
import { useSnackbar } from '@workshop/ui';
import { useSubscription } from '@workshop/relay';

import { PostNew, updater } from './PostNewSubscription';

// TODO - use @inline for me
type Me = { id: string } | null;

export const useNewPostSubscription = (me: Me) => {
  const { enqueueSnackbar } = useSnackbar();

  const postNewConfig = useMemo(
    () => ({
      subscription: PostNew,
      variables: {
        input: {},
      },
      onCompleted: (...args) => {
        console.log('onCompleted: ', args);
      },
      onError: (...args) => {
        console.log('onError: ', args);
      },
      onNext: (response: any) => {
        /**
         * TODO
         * show a snackbar info message with new post data
         */
      },
      updater,
    }),
    [],
  );

  /**
   * TODO
   * after adding the PostNew subscription, subscribe to it calling
   * useSubscription with postNewConfig
   */
};
`;

const useNewPostSubscriptionSolution = `import React, { useMemo } from 'react';
import { useSnackbar } from '@workshop/ui';
import { useSubscription } from '@workshop/relay';

import { PostNew, updater } from './PostNewSubscription';

// TODO - use @inline for me
type Me = { id: string } | null;

export const useNewPostSubscription = (me: Me) => {
  const { enqueueSnackbar } = useSnackbar();

  const postNewConfig = useMemo(
    () => ({
      subscription: PostNew,
      variables: {
        input: {},
      },
      onCompleted: (...args) => {
        console.log('onCompleted: ', args);
      },
      onError: (...args) => {
        console.log('onError: ', args);
      },
      onNext: (response: any) => {
        const post = response?.PostNew?.post;

        if (!post) {
          return;
        }

        const { author } = post;

        // new post, check if from another user
        if (author.id !== me?.id) {
          enqueueSnackbar(\`New Post from \${author.name}\`);
        }
      },
      updater,
    }),
    [],
  );

  useSubscription(postNewConfig);
};
`;

const NEW_POST = 'Hello from the subscription check';

export const exercise08: Exercise = {
  slug: '08-useSubscription',
  number: '08',
  title: 'useSubscription',
  summary: 'Listen to new posts in realtime with useSubscription and update the feed connection.',
  tags: ['useSubscription', 'updater', 'connections'],
  mode: 'app',
  activeFile: 'postSubscription/PostNewSubscription.tsx',
  instructions: `# 08 - useSubscription

Learn how to use \`useSubscription\` to listen for changes in your GraphQL server.

## Exercise

- add the \`PostNewSubscription\` subscription in \`postSubscription/PostNewSubscription.tsx\`
- complete the \`useNewPostSubscription\` hook to subscribe to new Posts calling \`useSubscription\`
- show a snackbar (toast) with the new post author using \`enqueueSnackbar\` from \`useSnackbar\`
- add an \`updater\` to add the new post to the top of the feed (\`Feed_posts\` connection), avoiding duplicated posts

Use the **+ simulate new post** button (above the preview) to make another user create a post.

## Extras

- [ ] add "See" and "Dismiss" actions to the snackbar
- [ ] do not show the snackbar when the new post was created by \`me\`

## Code Helpers

- PostNewSubscription

\`\`\`graphql
subscription PostNewSubscription($input: PostNewInput!) {
  PostNew(input: $input) {
    post {
      id
      content
      author {
        id
        name
      }
      meHasLiked
      likesCount
      ...Post_post
      ...PostComments_post
    }
  }
}
\`\`\`

- using \`@workshop/relay\` \`connectionUpdater\` helper to add an edge to a connection

\`\`\`jsx
connectionUpdater({
  store,
  parentId: ROOT_ID,
  connectionName: 'Feed_posts',
  edge: postEdge,
  before: true,
});
\`\`\``,
  notes: `# Listening to GraphQL event changes

\`useSubscription\` lets you listen to a GraphQL subscription,
provide feedback to the user and update the store in realtime.

\`\`\`ts
export interface GraphQLSubscriptionConfig<TSubscription> {
  configs?: ReadonlyArray<DeclarativeMutationConfig>;
  subscription: GraphQLTaggedNode;
  variables: Variables;
  onCompleted?: () => void;
  onError?: (error: Error) => void;
  onNext?: (response: TSubscription['response'] | null | undefined) => void;
  updater?: SelectorStoreUpdater<TSubscription['response']>;
}

export function useSubscription<TSubscription>(
  config: GraphQLSubscriptionConfig<TSubscription>,
  requestSubscriptionFn?: typeof requestSubscription,
): void;
\`\`\`

The subscription config lets you pass a GraphQL subscription and variables.
\`onNext\` is called when the subscription gets a new event, so you can provide feedback to the user.
\`updater\` is called for every event and it is used to update the store in realtime.

> Memoize the config with \`useMemo\`, otherwise \`useSubscription\` will unsubscribe and subscribe again on every render.

## The network layer

Subscriptions need a different transport than queries and mutations, usually WebSockets.
The second argument of \`Network.create\` is a \`subscribe\` function (see \`relay/setupSubscription.tsx\`), here implemented with \`graphql-ws\`:

\`\`\`ts
const network = Network.create(fetchGraphQL, setupSubscription());
\`\`\`

## Updating connections

Records are updated automatically by id, but Relay does not know *where* a new post should go.
In the \`updater\` you read the new post from the payload (\`store.getRootField('PostNew')\`),
create an edge with \`ConnectionHandler.createEdge\` and insert it in the \`Feed_posts\` connection.

When the current user creates a post with a mutation, the post can arrive twice (mutation + subscription), so check the connection before inserting it.

## References

- https://relay.dev/docs/guided-tour/updating-data/graphql-subscriptions/
- https://relay.dev/docs/api-reference/use-subscription/
- https://github.com/enisdenjo/graphql-ws`,
  hints: [
    'In `PostNewSubscription.tsx` replace `PostNew = \'\'` with the graphql subscription from the Code Helpers.',
    'In `useNewPostSubscription`, call `useSubscription(postNewConfig)` at the end of the hook.',
    'In `onNext`: `enqueueSnackbar(`New Post from ${response.PostNew.post.author.name}`)`.',
    "In the updater: `const postNode = store.getRootField('PostNew').getLinkedRecord('post')`, then `ConnectionHandler.getConnection(store.getRoot(), 'Feed_posts')` and `ConnectionHandler.createEdge(store, conn, postNode, 'PostEdge')`.",
    'To avoid duplicates, check if `conn.getLinkedRecords(\'edges\')` already has an edge whose node has the same id.',
  ],
  files: {
    ...relayProject({ withSubscription: true, withSnackbar: true }),
    ...feedProject,
    'App.tsx': app,
    'postSubscription/PostNewSubscription.tsx': postNewSubscriptionStarter,
    'postSubscription/useNewPostSubscription.tsx': useNewPostSubscriptionStarter,
  },
  solution: {
    'postSubscription/PostNewSubscription.tsx': postNewSubscriptionSolution,
    'postSubscription/useNewPostSubscription.tsx': useNewPostSubscriptionSolution,
  },
  hiddenFiles: [...BASE_HIDDEN, ...FEED_HIDDEN, 'comment/PostComments.tsx'],
  checks: [
    {
      title: 'PostNewSubscription.tsx declares the PostNewSubscription subscription',
      run: ({ source, assert }) => {
        const code = source('postSubscription/PostNewSubscription.tsx');
        assert(/subscription\s+PostNewSubscription\b/.test(code), 'Declare `subscription PostNewSubscription($input: PostNewInput!) { PostNew(input: $input) { ... } }` with graphql');
      },
    },
    {
      title: 'The app subscribes to PostNewSubscription',
      run: async ({ network, waitFor }) => {
        await waitFor(() => {
          if (!network.some(e => e.kind === 'subscription' && e.name === 'PostNewSubscription')) {
            throw new Error('PostNewSubscription was not requested, call useSubscription(postNewConfig) inside useNewPostSubscription');
          }
        });
      },
    },
    {
      title: 'A toast is shown when someone creates a new post',
      run: async ({ root, server, waitFor, screen }) => {
        // wait for the feed to be rendered
        await waitFor(() => screen.getAllByTestId('post'));
        server.simulateNewPost(NEW_POST);
        await waitFor(() => {
          const toast = root.ownerDocument.querySelector('.wui-toast');
          if (!toast) throw new Error('No toast was shown, call enqueueSnackbar inside onNext');
        });
      },
    },
    {
      title: 'The new post is added to the top of the feed',
      run: async ({ screen, waitFor, server, assert }) => {
        const posts = await waitFor(() => {
          const cards = screen.getAllByTestId('post') as HTMLElement[];
          if (!cards[0]?.textContent?.includes(NEW_POST)) {
            const anywhere = cards.some(c => c.textContent?.includes(NEW_POST));
            throw new Error(
              anywhere
                ? 'The new post was added to the feed, but not at the top. Use before: true in connectionUpdater'
                : 'The new post is not in the feed. Use an updater to add the post edge to the Feed_posts connection',
            );
          }
          return cards;
        });
        assert(posts.filter(c => c.textContent?.includes(NEW_POST)).length === 1, 'The new post should be rendered only once');
        // a second event
        const second = 'Another realtime post';
        server.simulateNewPost(second);
        await waitFor(() => {
          const cards = screen.getAllByTestId('post') as HTMLElement[];
          if (!cards[0]?.textContent?.includes(second)) throw new Error('Each new post should be added to the top of the feed');
        });
      },
    },
  ],
};
