import type { CheckContext, Exercise } from './types';
import { BASE_HIDDEN, operationsNamed, relayProject } from './shared';

const app = `import React, { Suspense, useState } from 'react';
import { Button, Content, Flex, Text } from '@workshop/ui';
import { graphql, useLazyLoadQuery } from 'react-relay';

import Post from './Post';
import Loading from './Loading';
import FeedErrorBoundary from './FeedErrorBoundary';

type QueryOptions = { fetchKey: number; fetchPolicy: 'store-or-network' | 'network-only' };

const Feed = ({ queryOptions }: { queryOptions: QueryOptions }) => {
  const response = useLazyLoadQuery(
    graphql\`
      query AppQuery {
        posts(first: 5) {
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
    queryOptions,
  );

  return (
    <Flex flexDirection='column'>
      {response.posts.edges.map(edge => (edge?.node ? <Post key={edge.node.id} post={edge.node} /> : null))}
    </Flex>
  );
};

const App = () => {
  const [queryOptions, setQueryOptions] = useState<QueryOptions>({ fetchKey: 0, fetchPolicy: 'store-or-network' });

  // fetch AppQuery again from the server
  const reload = () => setQueryOptions(prev => ({ fetchKey: prev.fetchKey + 1, fetchPolicy: 'network-only' }));

  return (
    <Content>
      <Flex alignItems='center' mb='8px'>
        <Text fontSize={20} fontWeight={700}>Posts</Text>
        <Button ml='16px' variant='secondary' onClick={reload}>
          Reload
        </Button>
      </Flex>
      <FeedErrorBoundary onRetry={reload}>
        <Suspense fallback={<Loading />}>
          <Feed queryOptions={queryOptions} />
        </Suspense>
      </FeedErrorBoundary>
    </Content>
  );
};

export default App;
`;

const feedErrorBoundary = `import React from 'react';
import { Button, Card, ErrorMessage } from '@workshop/ui';

type Props = { children: React.ReactNode; onRetry: () => void };
type State = { error: Error | null };

// catches errors thrown while rendering the feed, retry fetches the query again
class FeedErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  retry = () => {
    this.setState({ error: null });
    this.props.onRetry();
  };

  render() {
    if (this.state.error) {
      return (
        <Card p='10px'>
          <ErrorMessage>Error: {this.state.error.message}</ErrorMessage>
          <Button mt='10px' onClick={this.retry}>
            retry
          </Button>
        </Card>
      );
    }
    return this.props.children;
  }
}

export default FeedErrorBoundary;
`;

const postStarter = `import React from 'react';
import { Card, Text } from '@workshop/ui';
import { graphql, useFragment } from 'react-relay';

type Props = {
  post: any;
};

/**
 * TODO
 * author and content are nullable in the schema (a user can delete their account...)
 * - a post without author should not be rendered: author @required(action: LOG)
 * - a post without content is a bug: content @required(action: THROW)
 */
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
    <Card mt='10px' p='10px' data-testid='post'>
      <Text>{post.content}</Text>
      <Text color='#6b7280'>by {post.author.name}</Text>
    </Card>
  );
};

export default Post;
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
        content @required(action: THROW)
        author @required(action: LOG) {
          name
        }
      }
    \`,
    props.post,
  );

  // a missing @required(action: LOG) field makes the whole fragment null
  if (post == null) {
    return null;
  }

  return (
    <Card mt='10px' p='10px' data-testid='post'>
      <Text>{post.content}</Text>
      <Text color='#6b7280'>by {post.author.name}</Text>
    </Card>
  );
};

export default Post;
`;

const environmentSolution = `import { Environment, Network, RecordSource, Store } from 'relay-runtime';

import { fetchGraphQL } from './fetchGraphQL';

const network = Network.create(fetchGraphQL);

const env = new Environment({
  network,
  store: new Store(new RecordSource()),
  // receives @required(action: LOG) events (and other field level errors)
  relayFieldLogger: event => {
    if (event.kind === 'missing_required_field.log') {
      console.warn(\`[relay] \${event.owner}: missing required field "\${event.fieldPath}"\`);
    }
  },
});

export default env;
`;

const environmentStarter = `import { Environment, Network, RecordSource, Store } from 'relay-runtime';

import { fetchGraphQL } from './fetchGraphQL';

const network = Network.create(fetchGraphQL);

/**
 * TODO
 * @required(action: LOG) reports to the relayFieldLogger of the Environment
 * add a relayFieldLogger that console.warn the 'missing_required_field.log' events
 */
const env = new Environment({
  network,
  store: new Store(new RecordSource()),
});

export default env;
`;

const newest = (ctx: CheckContext) => [...ctx.server.db.posts].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 5);
const cards = (ctx: CheckContext) => [...ctx.root.querySelectorAll('[data-testid="post"]')] as HTMLElement[];
const findButton = (ctx: CheckContext, name: string) =>
  [...ctx.root.querySelectorAll('button')].find(b => b.textContent?.trim() === name) as HTMLElement | undefined;
const errorText = (ctx: CheckContext) => ctx.root.querySelector('.wui-error')?.textContent ?? '';

// clicks Reload and waits for the new AppQuery response
const reload = async (ctx: CheckContext, buttonName = 'Reload') => {
  const before = operationsNamed(ctx.network, 'AppQuery').length;
  const button = findButton(ctx, buttonName);
  ctx.assert(button, `Keep the "${buttonName}" button`);
  await ctx.user.click(button);
  await ctx.waitFor(() =>
    ctx.assert(operationsNamed(ctx.network, 'AppQuery').length > before && (operationsNamed(ctx.network, 'AppQuery') as CheckContext['network']).at(-1)!.status !== 'pending', 'waiting for AppQuery'),
  );
  await ctx.sleep(50);
};

const ORIGINAL: Record<string, { author: string; content: string }> = {};

export const exercise17: Exercise = {
  slug: '17-required',
  number: '17',
  title: '@required & error boundaries',
  summary: 'Handle nullable fields declaratively with @required(action: LOG | THROW) and recover with an error boundary.',
  tags: ['@required', 'ErrorBoundary', 'nullability'],
  mode: 'app',
  activeFile: 'Post.tsx',
  bonus: true,
  instructions: `# 17 - @required & error boundaries (bonus)

In GraphQL most fields are nullable: \`Post.author\` is \`User\` (not \`User!\`) because the author may have deleted their account, and \`Post.content\` may be null too.
Instead of sprinkling \`?.\` and \`if\`s everywhere, Relay lets you declare what should happen when a field is null with the \`@required\` directive.

## Exercise

- A post without an author should simply **not be rendered**: add \`@required(action: LOG)\` to \`author\` and return \`null\` from \`Post\` when the fragment data is \`null\`
- \`@required(action: LOG)\` reports to the Environment: add a \`relayFieldLogger\` to \`relay/Environment.tsx\` that \`console.warn\`s the \`missing_required_field.log\` events (open the **Console** tab)
- A post without content is a bug: add \`@required(action: THROW)\` to \`content\`. The error is caught by \`FeedErrorBoundary\`, and its **retry** button fetches the query again

The checks change the server data (they "delete" an author and a content) and click **Reload**.
Today a post without author crashes the whole feed with \`Cannot read properties of null\`.

## Extras

- [ ] try \`@required(action: NONE)\` on \`author { name }\` - what happens to \`post.author\`?
- [ ] move the error boundary around each \`Post\`, so a broken post does not hide the whole feed`,
  notes: `# @required

\`@required\` turns a nullable field into a non-nullable one in the generated types, and declares what to do if the value is null:

\`\`\`graphql
fragment Post_post on Post {
  content @required(action: THROW)
  author @required(action: LOG) {
    name
  }
}
\`\`\`

| action | what happens when the field is null |
| --- | --- |
| \`NONE\` | the null "bubbles up": the parent field (or the whole fragment) becomes null |
| \`LOG\` | like \`NONE\`, and the event is reported to the \`relayFieldLogger\` of the Environment |
| \`THROW\` | reading the fragment throws an error - catch it with an error boundary |

The null bubbles up to the closest **nullable** parent. If there is none in the fragment, \`useFragment\` returns \`null\`, so the component can bail out:

\`\`\`js
const post = useFragment(fragment, props.post);
if (post == null) return null;
\`\`\`

## Error boundaries

React error boundaries catch errors thrown while rendering their children - including network errors and \`@required(action: THROW)\` from Relay hooks.
To retry, reset the boundary **and** fetch the data again (otherwise Relay renders the same data from the store and throws again):

\`\`\`js
retry = () => {
  this.setState({ error: null });
  this.props.onRetry(); // e.g. a new fetchKey with fetchPolicy 'network-only'
};
\`\`\`

## relayFieldLogger

\`\`\`js
new Environment({
  network,
  store,
  relayFieldLogger: event => {
    if (event.kind === 'missing_required_field.log') {
      console.warn(\`\${event.owner}: missing \${event.fieldPath}\`);
    }
  },
});
\`\`\`

## References

- https://relay.dev/docs/guides/required-directive/
- https://relay.dev/docs/guided-tour/rendering/error-states/
- https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary`,
  hints: [
    'The directive goes right after the field: `author @required(action: LOG) { name }` and `content @required(action: THROW)`.',
    'With LOG, a null author makes the whole `Post_post` fragment `null`: add `if (post == null) return null;` before rendering.',
    'The THROW error is caught by `FeedErrorBoundary`: its retry calls `onRetry`, which reloads AppQuery with a new fetchKey.',
  ],
  files: {
    ...relayProject(),
    'App.tsx': app,
    'Post.tsx': postStarter,
    'FeedErrorBoundary.tsx': feedErrorBoundary,
    'relay/Environment.tsx': environmentStarter,
  },
  solution: {
    'Post.tsx': postSolution,
    'relay/Environment.tsx': environmentSolution,
  },
  hiddenFiles: BASE_HIDDEN.filter(f => f !== 'relay/Environment.tsx'),
  checks: [
    {
      title: 'Renders the 5 posts',
      run: async ctx => {
        const posts = newest(ctx);
        await ctx.waitFor(() => posts.forEach(p => ctx.screen.getByText(p.content)));
        posts.forEach(p => (ORIGINAL[p._id] = { author: p.author, content: p.content }));
      },
    },
    {
      title: 'A post without author is not rendered, and the rest of the feed still works (@required LOG)',
      run: async ctx => {
        const [orphan, ...others] = newest(ctx);
        orphan.author = 'deleted-user';
        await reload(ctx);
        await ctx.waitFor(() => {
          const error = errorText(ctx);
          ctx.assert(
            !/relayFieldLogger/.test(error),
            'The feed crashed: @required(action: LOG) needs a relayFieldLogger in the Environment config (relay/Environment.tsx)',
          );
          ctx.assert(!error, `The feed crashed: "${error}". Add @required(action: LOG) to author and return null when the fragment data is null`);
          ctx.assert(cards(ctx).length > 0, 'waiting for the posts');
        });
        ctx.assert(
          !ctx.root.textContent?.includes(orphan.content),
          'The post without author is still rendered. Add @required(action: LOG) to author and return null when the fragment is null',
        );
        others.forEach(p => ctx.screen.getByText(p.content));
        orphan.author = ORIGINAL[orphan._id]?.author ?? 'u1';
      },
    },
    {
      title: 'A post without content throws and the error boundary shows the error (@required THROW)',
      run: async ctx => {
        const broken = newest(ctx)[1];
        (broken as any).content = null;
        await reload(ctx);
        await ctx.waitFor(() =>
          ctx.assert(
            /Missing @required value/.test(errorText(ctx)),
            errorText(ctx)
              ? `Expected the @required error, got "${errorText(ctx)}"`
              : 'A post with content: null was rendered. Add @required(action: THROW) to content so the error boundary catches it',
          ),
        );
        broken.content = ORIGINAL[broken._id]?.content ?? 'restored';
      },
    },
    {
      title: 'retry fetches the posts again and recovers',
      run: async ctx => {
        await reload(ctx, 'retry');
        await ctx.waitFor(() => {
          ctx.assert(!errorText(ctx), `Still showing an error: "${errorText(ctx)}"`);
          ctx.assert(cards(ctx).length === 5, `Expected the 5 posts after retry, got ${cards(ctx).length}`);
        });
      },
    },
  ],
};
