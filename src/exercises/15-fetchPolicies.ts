import type { CheckContext, Exercise } from './types';
import { BASE_HIDDEN, operationsNamed, relayProject } from './shared';

const app = `import React, { useState } from 'react';
import { Button, Content, Flex, Text } from '@workshop/ui';

import Feed from './Feed';

// a tiny "router": switching tabs unmounts and remounts the Feed
const App = () => {
  const [tab, setTab] = useState<'feed' | 'about'>('feed');

  return (
    <Content>
      <Flex mb='16px'>
        <Button variant={tab === 'feed' ? 'primary' : 'secondary'} onClick={() => setTab('feed')}>
          Feed
        </Button>
        <Button ml='8px' variant={tab === 'about' ? 'primary' : 'secondary'} onClick={() => setTab('about')}>
          About
        </Button>
      </Flex>
      {tab === 'feed' ? (
        <Feed />
      ) : (
        <Text>About this app: a Relay workshop playground for fetch policies.</Text>
      )}
    </Content>
  );
};

export default App;
`;

const feedQuery = `graphql\`
      query FeedQuery {
        posts(first: 5) {
          edges {
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
    \``;

const feedList = `
  return (
    <Flex flexDirection='column'>
      <Flex alignItems='center'>
        <Text fontSize={20} fontWeight={700}>Posts</Text>
        <Button ml='16px' variant='secondary' onClick={refresh}>
          Refresh
        </Button>
        {isPending ? <Text ml='8px' color='#6b7280'>refreshing…</Text> : null}
      </Flex>
      {data.posts.edges.map(({ node }) => (
        <Card mt='10px' p='10px' key={node.id}>
          <Text>{node.content}</Text>
          <Text color='#6b7280'>{node.author?.name}</Text>
        </Card>
      ))}
    </Flex>
  );
};

export default Feed;
`;

const feedStarter = `import React, { useState, useTransition } from 'react';
import { Button, Card, Flex, Text } from '@workshop/ui';
import { graphql, useLazyLoadQuery } from 'react-relay';

/**
 * TODO
 * 1. going to "About" and back to "Feed" fetches the posts again (see the Network tab)
 *    choose a fetchPolicy that renders from the Relay store when the data is already there
 * 2. make the Refresh button fetch the posts from the server again,
 *    using fetchKey + fetchPolicy 'network-only', without hiding the current posts (useTransition)
 */
const Feed = () => {
  const [isPending, startTransition] = useTransition();

  const data = useLazyLoadQuery(
    ${feedQuery},
    {},
    { fetchPolicy: 'network-only' },
  );

  const refresh = () => {
    // TODO
  };
${feedList}`;

const feedSolution = `import React, { useState, useTransition } from 'react';
import { Button, Card, Flex, Text } from '@workshop/ui';
import { graphql, useLazyLoadQuery } from 'react-relay';

const Feed = () => {
  const [isPending, startTransition] = useTransition();
  const [queryOptions, setQueryOptions] = useState<{ fetchKey: number; fetchPolicy: 'store-or-network' | 'network-only' }>({
    fetchKey: 0,
    fetchPolicy: 'store-or-network',
  });

  const data = useLazyLoadQuery(
    ${feedQuery},
    {},
    queryOptions,
  );

  const refresh = () => {
    // a transition keeps showing the current posts while the query suspends
    startTransition(() => {
      setQueryOptions(prev => ({
        fetchKey: prev.fetchKey + 1,
        fetchPolicy: 'network-only',
      }));
    });
  };
${feedList}`;

const feedRequests = (ctx: CheckContext) => operationsNamed(ctx.network, 'FeedQuery') as CheckContext['network'];
const button = (ctx: CheckContext, name: string) =>
  [...ctx.root.querySelectorAll('button')].find(b => b.textContent?.trim() === name) as HTMLElement | undefined;
const newestPost = (ctx: CheckContext) => [...ctx.server.db.posts].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];

export const exercise15: Exercise = {
  slug: '15-fetchPolicies',
  number: '15',
  title: 'Fetch policies & refreshing',
  summary: 'Decide when to read from the store or the network with fetchPolicy, and refresh a query with fetchKey.',
  tags: ['fetchPolicy', 'fetchKey', 'useTransition'],
  mode: 'app',
  activeFile: 'Feed.tsx',
  bonus: true,
  instructions: `# 15 - Fetch policies & refreshing (bonus)

Relay keeps every record it has fetched in its normalized store. The \`fetchPolicy\` decides if a query should be read from the store, from the network, or both.

Open the **Network** tab and switch between the **Feed** and **About** tabs: every time the Feed mounts, \`FeedQuery\` is sent again, even though the posts are already in the store.

## Exercise

- Change the \`fetchPolicy\` of \`FeedQuery\` so going back to the Feed renders from the store **without a network request**
- Implement the **Refresh** button: it should send \`FeedQuery\` to the server again and render new posts
  - use a \`fetchKey\` that changes on every refresh, together with \`fetchPolicy: 'network-only'\`
  - keep the current posts on the screen while refreshing (wrap the update in \`startTransition\`)

## Extras

- [ ] try \`store-and-network\`: what do you see on the Network tab when you go back to the Feed?
- [ ] try \`store-only\` and reload the app
- [ ] show the \`isPending\` state of the transition`,
  notes: `# Fetch policies

\`useLazyLoadQuery(query, variables, { fetchPolicy, fetchKey })\`

| fetchPolicy | reads from the store | sends a request |
| --- | --- | --- |
| \`store-or-network\` (default) | yes, if all the data is there | only if data is missing |
| \`store-and-network\` | yes, if all the data is there | always (revalidates in the background) |
| \`network-only\` | no, suspends until the response | always |
| \`store-only\` | yes | never |

When a component that used a query unmounts, Relay **releases** it, but keeps the data around for a while (\`gcReleaseBufferSize\`, 10 queries by default), so the next mount can be rendered instantly from the store.

## Refreshing with fetchKey

\`fetchKey\` is a value that, when changed, forces \`useLazyLoadQuery\` to evaluate the fetch policy again - even if the variables are the same:

\`\`\`js
const [queryOptions, setQueryOptions] = useState({ fetchKey: 0, fetchPolicy: 'store-or-network' });

const data = useLazyLoadQuery(query, {}, queryOptions);

const refresh = () => {
  startTransition(() => {
    setQueryOptions(prev => ({ fetchKey: prev.fetchKey + 1, fetchPolicy: 'network-only' }));
  });
};
\`\`\`

## Avoid the loading spinner

With \`network-only\` the component **suspends**. If the update happens inside a React transition (\`useTransition\`), React keeps showing the current UI until the new data arrives, and \`isPending\` tells you a refresh is in flight.

## References

- https://relay.dev/docs/guided-tour/reusing-cached-data/fetch-policies/
- https://relay.dev/docs/guided-tour/refetching/refreshing-queries/
- https://relay.dev/docs/guided-tour/reusing-cached-data/availability-of-data/
- https://react.dev/reference/react/useTransition`,
  hints: [
    '`store-or-network` only goes to the network when the data is missing from the store.',
    'Keep `{ fetchKey, fetchPolicy }` in a `useState` and pass it as the third argument of `useLazyLoadQuery`.',
    'In `refresh`: `startTransition(() => setQueryOptions(prev => ({ fetchKey: prev.fetchKey + 1, fetchPolicy: "network-only" })))`.',
  ],
  files: {
    ...relayProject(),
    'App.tsx': app,
    'Feed.tsx': feedStarter,
  },
  solution: {
    'Feed.tsx': feedSolution,
  },
  hiddenFiles: BASE_HIDDEN,
  checks: [
    {
      title: 'The Feed renders the posts',
      run: async ctx => {
        const first = newestPost(ctx);
        await ctx.waitFor(() => ctx.screen.getByText(first.content));
        ctx.assert(feedRequests(ctx).length >= 1, 'FeedQuery was not sent');
      },
    },
    {
      title: 'Going back to the Feed renders from the store, without a new request',
      run: async ctx => {
        const about = button(ctx, 'About');
        ctx.assert(about, 'Keep the "About" button in App.tsx');
        await ctx.user.click(about);
        await ctx.waitFor(() => ctx.screen.getByText(/About this app/));
        const before = feedRequests(ctx).length;
        await ctx.user.click(button(ctx, 'Feed')!);
        await ctx.waitFor(() => ctx.screen.getByText(newestPost(ctx).content));
        await ctx.sleep(100);
        const sent = feedRequests(ctx).length - before;
        ctx.assert(
          sent === 0,
          `Going back to the Feed sent FeedQuery again. With 'network-only' (or 'store-and-network') Relay always goes to the network, use 'store-or-network' to render from the store when the data is there`,
        );
      },
    },
    {
      title: 'Refresh sends FeedQuery again and keeps the posts visible while loading',
      run: async ctx => {
        const current = newestPost(ctx).content;
        const fresh = ctx.server.simulateNewPost('A fresh post from the server 🔄');
        const before = feedRequests(ctx).length;
        const refresh = button(ctx, 'Refresh');
        ctx.assert(refresh, 'Keep the "Refresh" button in Feed.tsx');
        await ctx.user.click(refresh);
        await ctx.waitFor(
          () => ctx.assert(feedRequests(ctx).length > before, 'Clicking Refresh did not send FeedQuery. Change the fetchKey and use fetchPolicy "network-only"'),
          { timeout: 1500 },
        );
        await ctx.sleep(30);
        if (feedRequests(ctx).at(-1)!.status === 'pending') {
          // React hides (display: none) the suspended tree and shows the Suspense fallback
          const hidden = [...ctx.root.querySelectorAll('*')].some(el => (el as HTMLElement).style?.display === 'none');
          const spinner = ctx.root.querySelector('[role="progressbar"]');
          ctx.assert(
            ctx.root.textContent?.includes(current) && !hidden && !spinner,
            'The posts disappeared while refreshing (the Suspense fallback was shown). Wrap the state update in startTransition',
          );
        }
        await ctx.waitFor(() => ctx.screen.getByText(fresh.content));
      },
    },
  ],
};
