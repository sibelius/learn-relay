import type { Exercise } from './types';
import { config, index } from './shared';

const app = `import React, { useEffect, useState } from 'react';
import { Content, Card, Text, Loading } from '@workshop/ui';

import config from './config';

/**
 * TODO
 * fetch the posts query from config.GRAPHQL_URL using only React (useState + useEffect)
 * the GraphQL server expects a POST request with a JSON body: { query, variables }
 */
const App = () => {
  return (
    <Content>
      <Text fontSize={20} fontWeight={700}>Posts</Text>
      <Text mt='8px'>Fetch the posts here</Text>
    </Content>
  );
};

export default App;
`;

const solution = `import React, { useCallback, useEffect, useState } from 'react';
import { Button, Content, Card, ErrorMessage, Text, Loading } from '@workshop/ui';

import config from './config';

const PostsQuery = \`
  query PostsQuery {
    posts(first: 10) {
      edges {
        node {
          id
          content
        }
      }
    }
  }
\`;

type Post = { id: string; content: string };

const App = () => {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setPosts(null);
    try {
      const response = await fetch(config.GRAPHQL_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-type': 'application/json',
        },
        body: JSON.stringify({ query: PostsQuery, variables: {} }),
      });

      const { data, errors } = await response.json();

      if (errors) {
        setError(errors[0].message);
        return;
      }

      setPosts(data.posts.edges.map(edge => edge.node));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <Content>
        <ErrorMessage>{error}</ErrorMessage>
        <Button mt='10px' onClick={load}>retry</Button>
      </Content>
    );
  }

  if (!posts) {
    return <Loading />;
  }

  return (
    <Content>
      <Text fontSize={20} fontWeight={700}>Posts</Text>
      {posts.map(post => (
        <Card key={post.id} mt='10px' p='12px'>
          <Text>{post.content}</Text>
        </Card>
      ))}
    </Content>
  );
};

export default App;
`;

const root = `import React from 'react';

import App from './App';

const Root = () => {
  return <App />;
};

export default Root;
`;

export const exercise01: Exercise = {
  slug: '01-fetchGraphql',
  number: '01',
  title: 'Fetch GraphQL',
  summary: 'Fetch GraphQL data with plain React: fetch, useState and useEffect. No Relay yet.',
  tags: ['fetch', 'useEffect'],
  mode: 'app',
  activeFile: 'App.tsx',
  instructions: `# 01 - Fetch GraphQL

Learn how to fetch GraphQL data **without Relay**.

## Exercise

Fetch the following query inside your \`App\` component using only React (\`fetch\`, \`useState\`, \`useEffect\`), then render the content of each post.

\`\`\`graphql
query {
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

The GraphQL server runs (in your browser!) at \`config.GRAPHQL_URL\`. It expects a \`POST\` request with a JSON body:

\`\`\`js
fetch(config.GRAPHQL_URL, {
  method: 'POST',
  headers: { 'Content-type': 'application/json' },
  body: JSON.stringify({ query, variables: {} }),
});
\`\`\`

Open the **Network** tab to see your requests reach the server.

## Extras

- [ ] handle error
- [ ] handle retry using a button to retry the network request
- [ ] handle pagination`,
  notes: `# Fetching GraphQL Data

You can fetch GraphQL data the same way you fetch REST data, but doing this you won't get all the benefits of GraphQL.

## Data Fetching

In React you have 3 approaches to fetch data:

1. **Fetch-on-render** (for example, fetch in \`useEffect\`)
2. **Fetch-then-render** (for example, Relay without Suspense)
3. **Render-as-you-fetch** (for example, Relay with Suspense)

### Fetch-on-render

\`\`\`jsx
const ProfilePage = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser().then(u => setUser(u));
  }, []);

  if (user === null) {
    return <p>Loading profile...</p>;
  }

  return (
    <>
      <h1>{user.name}</h1>
      <ProfileTimeline />
    </>
  );
};
\`\`\`

Each component starts fetching only after it renders, which creates **waterfalls**: \`ProfileTimeline\` only starts fetching after \`ProfilePage\` finished.

### Render-as-you-fetch

\`\`\`jsx
const resource = fetchProfileData();

function ProfilePage() {
  return (
    <Suspense fallback={<h1>Loading profile...</h1>}>
      <ProfileDetails />
      <Suspense fallback={<h1>Loading posts...</h1>}>
        <ProfileTimeline />
      </Suspense>
    </Suspense>
  );
}
\`\`\`

Data starts loading **before** rendering, and Suspense declares the loading states. This is what Relay gives you.

## References

- https://react.dev/reference/react/Suspense
- https://graphql.org/learn/serving-over-http/`,
  hints: [
    'Create the query as a plain string and send it in the body: `JSON.stringify({ query })`.',
    'Use `useState` to keep the posts and `useEffect(() => { ... }, [])` to fetch once on mount.',
    'The response has the shape `{ data: { posts: { edges: [{ node: { id, content } }] } } }`.',
  ],
  files: {
    'index.tsx': index,
    'Root.tsx': root,
    'App.tsx': app,
    'config.tsx': config,
  },
  solution: {
    'App.tsx': solution,
  },
  hiddenFiles: ['index.tsx', 'Root.tsx', 'config.tsx'],
  checks: [
    {
      title: 'App sends a POST request to the GraphQL server',
      run: async ({ network, waitFor, assert }) => {
        await waitFor(() => assert(network.length > 0, 'No request reached the GraphQL server. Use fetch(config.GRAPHQL_URL, ...)'));
      },
    },
    {
      title: 'Query fetches posts(first: 10) with id and content',
      run: async ({ network, waitFor, assert }) => {
        await waitFor(() => assert(network.some(e => e.status !== 'pending'), 'waiting for the response'));
        const entry = network.find(e => /posts\s*\(\s*first\s*:\s*10\s*\)/.test(e.query));
        assert(entry, 'Your query should ask for posts(first: 10)');
        assert(/\bid\b/.test(entry!.query) && /\bcontent\b/.test(entry!.query), 'Select both id and content of each post node');
        assert(entry!.status === 'done', `The server responded with an error: ${JSON.stringify((entry!.response as any)?.errors?.[0]?.message)}`);
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
