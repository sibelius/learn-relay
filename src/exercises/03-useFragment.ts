import type { Exercise } from './types';
import { BASE_HIDDEN, relayProject } from './shared';

const app = `import React from 'react';
import { Content, Card, Flex, Text } from '@workshop/ui';
import { useLazyLoadQuery, graphql } from 'react-relay';

import Post from './Post';

/**
 * TODO
 * move the Post selections to a fragment inside Post.tsx
 * and spread it here using ...Post_post
 */
const App = () => {
  const response = useLazyLoadQuery(
    graphql\`
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
    \`,
    {},
    {
      fetchPolicy: 'network-only',
    },
  );

  const { posts } = response;

  return (
    <Content>
      <Flex flexDirection='column'>
        <Text fontSize={20} fontWeight={700}>Posts</Text>
        <Flex flexDirection='column'>
          {posts.edges.map(({ node }) => (
            <Card mt='10px' p='10px' key={node.id}>
              <Text>id: {node.id}</Text>
              <Text>content: {node.content}</Text>
            </Card>
          ))}
        </Flex>
      </Flex>
    </Content>
  );
};

export default App;
`;

const post = `import React from 'react';
import { Card, Text } from '@workshop/ui';
import { graphql, useFragment } from 'react-relay';

/**
 * TODO
 * useFragment to let Post declare its data requirement
 * name the fragment Post_post (ModuleName_propName)
 */
const Post = props => {
  const post = props.post;

  return (
    <Card mt='10px' p='10px'>
      <Text>id: {post.id}</Text>
      <Text>content: {post.content}</Text>
    </Card>
  );
};

export default Post;
`;

const appSolution = `import React from 'react';
import { Content, Flex, Text } from '@workshop/ui';
import { useLazyLoadQuery, graphql } from 'react-relay';

import Post from './Post';

const App = () => {
  const response = useLazyLoadQuery(
    graphql\`
      query AppQuery {
        posts(first: 10) {
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
    {
      fetchPolicy: 'network-only',
    },
  );

  const { posts } = response;

  return (
    <Content>
      <Flex flexDirection='column'>
        <Text fontSize={20} fontWeight={700}>Posts</Text>
        <Flex flexDirection='column'>
          {posts.edges.map(({ node }) => (
            <Post key={node.id} post={node} />
          ))}
        </Flex>
      </Flex>
    </Content>
  );
};

export default App;
`;

const postSolution = `import React from 'react';
import { Card, Text } from '@workshop/ui';
import { graphql, useFragment } from 'react-relay';

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
      }
    \`,
    props.post,
  );

  return (
    <Card mt='10px' p='10px'>
      <Text>id: {post.id}</Text>
      <Text>content: {post.content}</Text>
      <Text color='#6b7280'>author: {post.author?.name}</Text>
    </Card>
  );
};

export default Post;
`;

export const exercise03: Exercise = {
  slug: '03-useFragment',
  number: '03',
  title: 'useFragment',
  summary: 'Colocate data requirements: each component declares its own fragment with useFragment.',
  tags: ['useFragment', 'data masking'],
  mode: 'app',
  activeFile: 'Post.tsx',
  instructions: `# 03 - useFragment

Learn how to use \`useFragment\` to let each component declare its own data dependencies.

## Exercise

- Refactor \`App\` to render the \`<Post />\` component for each post
- Move the \`Post\` type selections (\`content\`) inside \`Post.tsx\` as a \`Post_post\` fragment
- Consume the fragment with \`useFragment\` and spread it in \`AppQuery\` with \`...Post_post\`

## Extras

- [ ] render the post author name (\`author { name }\`)`,
  notes: `# Composing Data Components with useFragment

As your app gets more complex you have more components consuming data from your GraphQL server. There are 3 approaches to handle this:

## Multiple \`useLazyLoadQuery\`

Many \`useLazyLoadQuery\` in your component tree generate many requests to your server, making your app slow and causing a heavy load on your server.

## A single \`useLazyLoadQuery\` + prop drilling

A single request per route, but all components are tightly coupled. If you change a data requirement of a component down in the tree, you need to modify every component in between.

\`\`\`jsx
<Posts>
  <Post>
    <PostAuthor />
    <PostBody />
    <PostComments />
  </Post>
</Posts>
\`\`\`

## A single \`useLazyLoadQuery\` + \`useFragment\`

\`useFragment\` lets you declare the component data requirements. If you change \`PostBody_post\`, the Relay compiler recompiles the queries that spread it.

\`\`\`jsx
const post = useFragment(
  graphql\`
    fragment PostBody_post on Post {
      content
    }
  \`,
  props.post,
);
\`\`\`

\`useFragment\` receives the fragment definition and a **fragment reference** (the object where the fragment was spread).

## Data Masking

The data returned from \`useFragment\` only contains what *this* fragment asked for. Even if another component asks for the \`author\` of the Post, \`PostBody\` only sees \`content\`. Try to read \`node.content\` in \`App\` after spreading \`...Post_post\` — it is not there!

## References

- https://relay.dev/docs/guided-tour/rendering/fragments/
- https://relay.dev/docs/principles-and-architecture/thinking-in-relay/#data-masking`,
  hints: [
    'In `Post.tsx`: `const post = useFragment(graphql`fragment Post_post on Post { id content }`, props.post);`',
    'In `AppQuery` replace `content` with `...Post_post` inside `node`.',
    'Render `<Post key={node.id} post={node} />` - `node` is the fragment reference.',
  ],
  files: {
    ...relayProject(),
    'App.tsx': app,
    'Post.tsx': post,
  },
  solution: {
    'App.tsx': appSolution,
    'Post.tsx': postSolution,
  },
  hiddenFiles: BASE_HIDDEN,
  checks: [
    {
      title: 'Post.tsx declares a Post_post fragment with useFragment',
      run: ({ source, assert }) => {
        const code = source('Post.tsx');
        assert(/fragment\s+Post_post\s+on\s+Post/.test(code), 'Declare `fragment Post_post on Post` inside Post.tsx');
        assert(/useFragment\s*(<[^>]*>)?\s*\(/.test(code), 'Use useFragment inside Post');
      },
    },
    {
      title: 'AppQuery spreads ...Post_post',
      run: ({ source, assert }) => {
        assert(/\.\.\.\s*Post_post/.test(source('App.tsx')), 'Spread `...Post_post` inside the post node of AppQuery');
      },
    },
    {
      title: 'App renders the <Post /> component',
      run: ({ source, assert }) => {
        assert(/<Post\b/.test(source('App.tsx')), 'Render <Post post={node} /> for each edge');
      },
    },
    {
      title: 'Posts content is rendered',
      run: async ({ screen, server, waitFor }) => {
        const posts = [...server.db.posts].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 10);
        await waitFor(() => {
          for (const p of posts) screen.getByText(p.content, { exact: false });
        });
      },
    },
  ],
};
