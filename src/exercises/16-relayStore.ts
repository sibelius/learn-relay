import type { CheckContext, Exercise } from './types';
import { BASE_HIDDEN, relayProject } from './shared';

const appHeader = `import React, { useState } from 'react';
import { Button, Content, Flex, Text } from '@workshop/ui';
import { graphql, useLazyLoadQuery, useRelayEnvironment } from 'react-relay';

import Post from './Post';

const App = () => {
  const environment = useRelayEnvironment();
  const [postsInStore, setPostsInStore] = useState<number | null>(null);

  const response = useLazyLoadQuery(
    graphql\`
      query AppQuery {
        posts(first: 5) @connection(key: "App_posts") {
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
  );
`;

const appRender = `
  return (
    <Content>
      <Flex flexDirection='column'>
        <Flex alignItems='center'>
          <Text fontSize={20} fontWeight={700}>Posts</Text>
          <Button ml='16px' variant='secondary' onClick={inspectStore}>
            Inspect store
          </Button>
          <Text ml='8px' data-testid='postsInStore'>
            Posts in the store: {postsInStore ?? '?'}
          </Text>
        </Flex>
        {response.posts.edges.map(({ node }) => (
          <Post key={node.id} post={node} />
        ))}
      </Flex>
    </Content>
  );
};

export default App;
`;

const appStarter = `${appHeader}
  /**
   * TODO
   * read the records of the Relay store with environment.getStore().getSource()
   * and count how many records are of type Post (record.__typename)
   */
  const inspectStore = () => {
    setPostsInStore(null);
  };
${appRender}`;

const appSolution = `${appHeader}
  const inspectStore = () => {
    const source = environment.getStore().getSource();
    const posts = source.getRecordIDs().filter(id => source.get(id)?.__typename === 'Post');
    setPostsInStore(posts.length);
  };
${appRender}`;

const postHeader = `import React from 'react';
import { Button, Card, CardActions, Text } from '@workshop/ui';
import { graphql, useFragment, useRelayEnvironment } from 'react-relay';
import { commitLocalUpdate, ConnectionHandler } from 'relay-runtime';

type Props = {
  post: any;
};
const Post = (props: Props) => {
  const environment = useRelayEnvironment();
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
`;

const postRender = `
  return (
    <Card mt='10px' p='10px' data-testid='post'>
      <Text>{post.content}</Text>
      <Text color='#6b7280'>{post.author?.name}</Text>
      <CardActions>
        <Button variant='secondary' onClick={shout}>
          Shout
        </Button>
        <Button ml='8px' variant='secondary' onClick={hide}>
          Hide
        </Button>
      </CardActions>
    </Card>
  );
};

export default Post;
`;

const postStarter = `${postHeader}
  /**
   * TODO
   * use commitLocalUpdate to change the content of this Post record to UPPERCASE
   * only in the Relay store (no mutation, no network request)
   */
  const shout = () => {};

  /**
   * TODO
   * use commitLocalUpdate + ConnectionHandler.getConnection(store.getRoot(), 'App_posts')
   * and ConnectionHandler.deleteNode to remove this post from the list locally
   */
  const hide = () => {};
${postRender}`;

const postSolution = `${postHeader}
  const shout = () => {
    commitLocalUpdate(environment, store => {
      const record = store.get(post.id);
      if (!record) return;
      record.setValue(String(record.getValue('content')).toUpperCase(), 'content');
    });
  };

  const hide = () => {
    commitLocalUpdate(environment, store => {
      const connection = ConnectionHandler.getConnection(store.getRoot(), 'App_posts');
      if (!connection) return;
      ConnectionHandler.deleteNode(connection, post.id);
    });
  };
${postRender}`;

const cards = (ctx: CheckContext) => [...ctx.root.querySelectorAll('[data-testid="post"]')] as HTMLElement[];
const buttonIn = (el: HTMLElement, name: string) => [...el.querySelectorAll('button')].find(b => b.textContent?.trim() === name) as HTMLElement | undefined;
const newest = (ctx: CheckContext) => [...ctx.server.db.posts].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 5);
const globalId = (id: string) => btoa(`Post:${id}`);

export const exercise16: Exercise = {
  slug: '16-relayStore',
  number: '16',
  title: 'The Relay store: local updates',
  summary: 'Read and write the Relay store directly with commitLocalUpdate, ConnectionHandler and getStore().',
  tags: ['commitLocalUpdate', 'ConnectionHandler', 'RecordSource'],
  mode: 'app',
  activeFile: 'Post.tsx',
  bonus: true,
  instructions: `# 16 - The Relay store: local updates (bonus)

Relay data lives in a normalized store: a map from record id to record. Usually it is written by query and mutation responses, but you can also write to it **locally**, without talking to the server.

Open the **Relay Store** tab to follow the changes.

## Exercise

- **Shout**: change the \`content\` of the Post record to UPPERCASE using \`commitLocalUpdate\` (no mutation, no request)
- **Hide**: remove the post from the \`App_posts\` connection locally with \`ConnectionHandler.deleteNode\`
- **Inspect store** (\`App.tsx\`): count how many records of type \`Post\` exist in the store using \`environment.getStore().getSource()\`

After hiding a post, inspect the store again: is the Post record still there? Why?

## Extras

- [ ] add an "Undo" button that inserts the hidden post back (\`ConnectionHandler.createEdge\` + \`insertEdgeBefore\`)
- [ ] what happens to the local changes if the query is fetched again from the network?`,
  notes: `# The Relay store

The store is a normalized \`RecordSource\`: every object with an \`id\` becomes a record, and links between objects become references:

\`\`\`json
{
  "client:root": { "__id": "client:root", "posts(first:5)": { "__ref": "client:root:posts(first:5)" } },
  "UG9zdDpwMQ==": { "__id": "UG9zdDpwMQ==", "__typename": "Post", "content": "..." }
}
\`\`\`

Every component reading a record re-renders when it changes - no matter who changed it.

## commitLocalUpdate

\`commitLocalUpdate(environment, updater)\` runs an updater against the store without a network request:

\`\`\`js
import { commitLocalUpdate, ConnectionHandler } from 'relay-runtime';

commitLocalUpdate(environment, store => {
  const record = store.get(id);
  record.setValue('new value', 'content');

  const connection = ConnectionHandler.getConnection(store.getRoot(), 'App_posts');
  ConnectionHandler.deleteNode(connection, id);
});
\`\`\`

The \`store\` is a \`RecordSourceSelectorProxy\`: \`get\`, \`create\`, \`delete\`, \`getRoot\`, and on each record \`getValue\`, \`setValue\`, \`getLinkedRecord\`, \`setLinkedRecord\`, \`getLinkedRecords\`...

\`ConnectionHandler.deleteNode\` only removes the **edge** from the connection: the Post record stays in the store until it is garbage collected (or you call \`store.delete(id)\`).

## Reading the store

\`environment.getStore().getSource()\` gives you the raw records: \`getRecordIDs()\`, \`get(id)\`, \`toJSON()\`. It is great for debugging (that is what the Relay Store tab and the Relay DevTools do), but in components prefer fragments, so they re-render when data changes.

## Client schema extensions

In a real project you can also add client-only fields to the schema (\`extend type Post { isHidden: Boolean }\`) and store them with \`commitLocalUpdate\`. The in-browser compiler of this playground only knows the server schema, so we update server fields locally here.

## References

- https://relay.dev/docs/guided-tour/updating-data/local-data-updates/
- https://relay.dev/docs/guided-tour/updating-data/imperatively-modifying-store-data/
- https://relay.dev/docs/api-reference/store/
- https://relay.dev/docs/guided-tour/list-data/updating-connections/`,
  hints: [
    '`commitLocalUpdate(environment, store => { const record = store.get(post.id); record.setValue(String(record.getValue("content")).toUpperCase(), "content"); })`',
    '`const connection = ConnectionHandler.getConnection(store.getRoot(), "App_posts"); ConnectionHandler.deleteNode(connection, post.id);`',
    'In App: `const source = environment.getStore().getSource(); source.getRecordIDs().filter(id => source.get(id)?.__typename === "Post").length`',
  ],
  files: {
    ...relayProject(),
    'App.tsx': appStarter,
    'Post.tsx': postStarter,
  },
  solution: {
    'App.tsx': appSolution,
    'Post.tsx': postSolution,
  },
  hiddenFiles: BASE_HIDDEN,
  checks: [
    {
      title: 'Renders 5 posts',
      run: async ctx => {
        const posts = newest(ctx);
        await ctx.waitFor(() => posts.forEach(p => ctx.screen.getByText(p.content)));
        ctx.assert(cards(ctx).length === 5, `Expected 5 posts, got ${cards(ctx).length}`);
      },
    },
    {
      title: 'Shout updates the Post record in the store, without a request',
      run: async ctx => {
        const post = newest(ctx)[0];
        const requests = ctx.network.length;
        const shout = buttonIn(cards(ctx)[0], 'Shout');
        ctx.assert(shout, 'Keep the "Shout" button');
        await ctx.user.click(shout);
        await ctx.waitFor(() =>
          ctx.assert(cards(ctx)[0].textContent?.includes(post.content.toUpperCase()), 'The content of the first post should be rendered in UPPERCASE after clicking Shout'),
        );
        ctx.assert(ctx.network.length === requests, 'Shout sent a network request. Use commitLocalUpdate, it only touches the local store');
        const record = ctx.env().getStore().getSource().get(globalId(post._id));
        ctx.assert(
          record?.content === post.content.toUpperCase(),
          'The UI is uppercase, but the Post record in the Relay store is not. Update the record with commitLocalUpdate + setValue instead of React state',
        );
        ctx.assert(ctx.server.db.posts.find(p => p._id === post._id)?.content === post.content, 'The server data should not change');
      },
    },
    {
      title: 'Hide removes the post from the App_posts connection locally',
      run: async ctx => {
        const [, second, third] = newest(ctx);
        const requests = ctx.network.length;
        const hide = buttonIn(cards(ctx)[1], 'Hide');
        ctx.assert(hide, 'Keep the "Hide" button');
        await ctx.user.click(hide);
        await ctx.waitFor(() => ctx.assert(!ctx.root.textContent?.includes(second.content), 'The second post is still rendered after clicking Hide'));
        ctx.assert(cards(ctx).length === 4, `Expected 4 posts after hiding one, got ${cards(ctx).length}`);
        ctx.screen.getByText(third.content);
        ctx.assert(ctx.network.length === requests, 'Hide sent a network request. Use commitLocalUpdate + ConnectionHandler.deleteNode');
        ctx.assert(ctx.server.db.posts.some(p => p._id === second._id), 'The post should still exist on the server');
      },
    },
    {
      title: 'Inspect store counts the Post records (hidden ones included)',
      run: async ctx => {
        const inspect = [...ctx.root.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Inspect store') as HTMLElement;
        ctx.assert(inspect, 'Keep the "Inspect store" button');
        await ctx.user.click(inspect);
        const source = ctx.env().getStore().getSource();
        const expected = source.getRecordIDs().filter((id: string) => source.get(id)?.__typename === 'Post').length;
        await ctx.waitFor(() =>
          ctx.assert(
            ctx.root.querySelector('[data-testid="postsInStore"]')?.textContent?.includes(`: ${expected}`),
            `Expected "Posts in the store: ${expected}" - read environment.getStore().getSource() and count the records with __typename "Post"`,
          ),
        );
      },
    },
  ],
};
