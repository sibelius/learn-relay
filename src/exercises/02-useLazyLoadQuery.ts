import type { Exercise } from './types';
import { BASE_HIDDEN, relayProject } from './shared';

const app = `import React from 'react';
import { Content, Card, Text } from '@workshop/ui';
import { graphql, useLazyLoadQuery } from 'react-relay';

/**
 * TODO
 * fetch the posts using useLazyLoadQuery and render the content of each post
 * remember: Relay operations must be named, e.g. "query AppQuery { ... }"
 */
const App = () => {
  return (
    <Content>
      <Text fontSize={20} fontWeight={700}>Posts</Text>
    </Content>
  );
};

export default App;
`;

const solution = `import React from 'react';
import { Content, Card, Text } from '@workshop/ui';
import { graphql, useLazyLoadQuery } from 'react-relay';

const App = () => {
  const data = useLazyLoadQuery(
    graphql\`
      query AppQuery($first: Int!) {
        posts(first: $first) {
          edges {
            node {
              id
              content
            }
          }
        }
      }
    \`,
    { first: 10 },
  );

  return (
    <Content>
      <Text fontSize={20} fontWeight={700}>Posts</Text>
      {data.posts.edges.map(({ node }) => (
        <Card key={node.id} mt='10px' p='12px'>
          <Text>{node.content}</Text>
        </Card>
      ))}
    </Content>
  );
};

export default App;
`;

export const exercise02: Exercise = {
  slug: '02-useLazyLoadQuery',
  number: '02',
  title: 'useLazyLoadQuery',
  summary: 'Fetch your first Relay query with useLazyLoadQuery, Suspense and an ErrorBoundary.',
  tags: ['useLazyLoadQuery', 'Environment', 'Suspense'],
  mode: 'app',
  activeFile: 'App.tsx',
  instructions: `# 02 - useLazyLoadQuery

Learn how to fetch GraphQL data with Relay.

## Exercise

Fetch the following query inside your \`App\` component using Relay \`useLazyLoadQuery\` and render the content of each post.

\`\`\`graphql
query AppQuery {
  posts(first: 10) {
    edges {
      node {
        id
        content
      }
    }
  }
}
\`\`\`

The Relay \`Environment\` is already set up in \`relay/Environment.tsx\` and provided by \`Providers.tsx\`. The loading state is handled by \`<Suspense>\` and the error state by \`<ErrorBoundaryRetry>\` in \`Root.tsx\`.

> The \`graphql\` tags are compiled **in your browser** by the real Relay compiler (Rust → WebAssembly). Compiler errors show up right away.

## Extras

- [ ] handle error (try a typo in a field name, or break the network layer)
- [ ] use variables: \`query AppQuery($first: Int!)\``,
  notes: `# Fetching GraphQL Data using Relay

Relay lets you declare which data each component needs to render. Relay fetches the data for you based on these declarations.

## Relay Architecture

Relay is composed of 3 parts:

- **Relay Compiler**: validates and optimizes your GraphQL fragments and queries, generating *artifacts*
- **Relay Runtime**: fetches and caches the data (the store)
- **React Relay**: Relay bindings to React (hooks)

## Setup

For the basic setup of Relay you need an \`Environment\`, composed of a **network layer** and a **store**.

\`\`\`jsx
const environment = new Environment({
  network: Network.create(fetchGraphQL),
  store: new Store(new RecordSource()),
});
\`\`\`

The network layer tells Relay how to fetch a GraphQL operation (Query/Mutation/Subscription). The store tells Relay how to cache the data.

## Fetching data using useLazyLoadQuery

\`\`\`ts
type FetchPolicy = 'store-only' | 'store-or-network' | 'store-and-network' | 'network-only';

function useLazyLoadQuery<TQuery extends OperationType>(
  gqlQuery: GraphQLTaggedNode,
  variables: TQuery['variables'],
  options?: {
    fetchKey?: string | number;
    fetchPolicy?: FetchPolicy;
    networkCacheConfig?: CacheConfig;
  },
): TQuery['response'];
\`\`\`

\`useLazyLoadQuery\` receives a \`gqlQuery\` (a GraphQL query), \`variables\` and \`options\`. It returns the resolved data; loading and errors are handled by **Suspense** and **ErrorBoundary**.

Check the **Store** tab after your query loads: Relay normalizes every record by its \`id\`.

## References

- https://relay.dev/docs/api-reference/use-lazy-load-query/
- https://relay.dev/docs/guided-tour/rendering/queries/`,
  hints: [
    'Call `useLazyLoadQuery(graphql`query AppQuery { ... }`, {})` at the top of `App`.',
    'By Relay convention the operation name starts with the module name: in `App.tsx` call it `AppQuery`.',
    'Render the list with `data.posts.edges.map(({ node }) => ...)`.',
  ],
  files: {
    ...relayProject(),
    'App.tsx': app,
  },
  solution: {
    'App.tsx': solution,
  },
  hiddenFiles: BASE_HIDDEN,
  checks: [
    {
      title: 'App uses useLazyLoadQuery',
      run: ({ source, assert }) => {
        assert(/useLazyLoadQuery\s*(<[^>]*>)?\s*\(/.test(source('App.tsx')), 'Call useLazyLoadQuery inside App');
      },
    },
    {
      title: 'Relay sends AppQuery to the server',
      run: async ({ network, waitFor, assert }) => {
        await waitFor(() => assert(network.some(e => e.name === 'AppQuery' && e.status !== 'pending'), 'AppQuery was not sent. Name your query "AppQuery"'));
        const entry = network.find(e => e.name === 'AppQuery')!;
        assert(/posts\s*\(/.test(entry.query), 'AppQuery should select posts');
        const first = /posts\s*\(\s*first\s*:\s*10/.test(entry.query) || (entry.variables as any)?.first === 10;
        assert(first, 'Fetch the first 10 posts');
      },
    },
    {
      title: 'Renders the content of the 10 posts',
      run: async ({ screen, server, waitFor }) => {
        const posts = [...server.db.posts].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 10);
        await waitFor(() => {
          for (const post of posts) screen.getByText(post.content, { exact: false });
        });
      },
    },
  ],
};
