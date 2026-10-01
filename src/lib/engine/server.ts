// In-browser GraphQL server that mimics the relay-workshop server (apps/server)
// Data lives in memory, so every run starts from the same seed.
import { buildSchema, execute, parse, validate, type ExecutionResult, type GraphQLSchema } from 'graphql';
import { schemaSDL } from './schema';

export const toGlobalId = (type: string, id: string) => btoa(`${type}:${id}`);
export const fromGlobalId = (globalId: string) => {
  try {
    const [type, id] = atob(globalId).split(':');
    return { type, id };
  } catch {
    return { type: null, id: null };
  }
};

export const USER_TOKEN = 'JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InUxIn0.relay-workshop';
const tokenFor = (userId: string) => (userId === 'u1' ? USER_TOKEN : `JWT ${btoa(JSON.stringify({ id: userId }))}`);

type User = { _id: string; name: string; email: string; password: string; createdAt: string };
type Post = { _id: string; content: string; author: string; likedBy: string[]; createdAt: string };
type Comment = { _id: string; body: string; user: string; post: string; likedBy: string[]; createdAt: string };

const SEED_POSTS = [
  'Relay is a JavaScript framework for fetching and managing GraphQL data in React apps',
  'Colocate your data requirements with your components using fragments',
  'useLazyLoadQuery fetches a query during render',
  'The Relay compiler validates and optimizes your GraphQL at build time',
  'Data masking means a component only sees the data it asked for',
  'Connections make cursor based pagination easy',
  'Every record in the Relay store is normalized by its global id',
  'Mutations are a write followed by a read',
  'Optimistic updates make your UI feel instant',
  'Use @refetchable to let Relay generate refetch queries for you',
  'Subscriptions keep your app in realtime',
  'Render-as-you-fetch: start loading data before rendering',
  'preloadQuery + usePreloadedQuery avoid request waterfalls',
  'relay-test-utils makes testing Relay components a breeze',
  'MockPayloadGenerator generates data based on your query shape',
  '@appendEdge and @prependEdge update connections declaratively',
  'Suspense lets you declare loading states',
  'Error boundaries handle errors in your component tree',
  'Global Object Identification: the Node interface',
  'GraphQL fragments are the unit of composition in Relay',
  'Relay garbage collects records no longer referenced',
  'Fetch policies decide whether to read from the store or the network',
  'useTransition keeps the old UI while new data is loading',
  'useFragment subscribes only to the data your component reads',
  'The @connection directive gives a stable key to a list',
  'Relay batches updates from the store to avoid extra renders',
  'Use @argumentDefinitions to declare fragment local arguments',
  'useMutation prevents firing the same mutation twice in flight',
  'Relay was open sourced by Facebook in 2015',
  'Welcome to the Relay workshop!',
];

const SEED_COMMENTS = [
  'This is so cool',
  'Relay makes this easy',
  'I love fragments',
  'Great post!',
  'Thanks for sharing',
  'Mind blown 🤯',
];

const createDb = () => {
  const now = Date.UTC(2026, 0, 1);
  const users: User[] = [
    { _id: 'u1', name: 'Sibelius Seraphini', email: 'sibelius@relay.dev', password: '123456', createdAt: '' },
    { _id: 'u2', name: 'Ada Lovelace', email: 'ada@relay.dev', password: '123456', createdAt: '' },
    { _id: 'u3', name: 'Alan Turing', email: 'alan@relay.dev', password: '123456', createdAt: '' },
    { _id: 'u4', name: 'Grace Hopper', email: 'grace@relay.dev', password: '123456', createdAt: '' },
  ];
  // posts are stored oldest first, the feed shows newest first
  const posts: Post[] = SEED_POSTS.map((content, i) => ({
    _id: `p${i + 1}`,
    content,
    author: users[i % users.length]._id,
    likedBy: users.slice(1, 1 + (i % 4)).map(u => u._id),
    createdAt: new Date(now + i * 3600_000).toISOString(),
  }));
  const comments: Comment[] = [];
  let commentId = 1;
  posts.forEach((post, i) => {
    const count = i % 5;
    for (let c = 0; c < count; c++) {
      comments.push({
        _id: `c${commentId++}`,
        body: SEED_COMMENTS[(i + c) % SEED_COMMENTS.length],
        user: users[(i + c + 1) % users.length]._id,
        post: post._id,
        likedBy: [],
        createdAt: new Date(now + i * 3600_000 + c * 60_000).toISOString(),
      });
    }
  });
  return { users, posts, comments, nextPost: posts.length + 1, nextComment: commentId, nextUser: users.length + 1 };
};

type Db = ReturnType<typeof createDb>;

const base64 = (s: string) => btoa(s);
const unbase64 = (s: string) => atob(s);
const cursorFor = (offset: number) => base64(`mongo:${offset}`);
const offsetFromCursor = (cursor?: string | null) => {
  if (!cursor) return null;
  try {
    const n = parseInt(unbase64(cursor).replace('mongo:', ''), 10);
    return Number.isNaN(n) ? null : n;
  } catch {
    return null;
  }
};

type ConnectionArgs = { first?: number | null; after?: string | null; last?: number | null; before?: string | null };

// Relay cursor connection over an in memory array (newest first)
const connectionFromArray = <T>(items: T[], args: ConnectionArgs, wrap: (item: T) => any) => {
  const total = items.length;
  const afterOffset = offsetFromCursor(args.after);
  const beforeOffset = offsetFromCursor(args.before);
  let start = afterOffset != null ? afterOffset + 1 : 0;
  let end = beforeOffset != null ? beforeOffset : total;
  if (args.first != null) end = Math.min(end, start + Math.max(0, args.first));
  if (args.last != null) start = Math.max(start, end - Math.max(0, args.last));
  start = Math.max(0, start);
  end = Math.min(total, end);
  const slice = items.slice(start, end);
  const edges = slice.map((item, i) => ({ cursor: cursorFor(start + i), node: wrap(item) }));
  return {
    count: total,
    totalCount: total,
    startCursorOffset: start,
    endCursorOffset: end,
    edges,
    pageInfo: {
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
      hasPreviousPage: start > 0,
      hasNextPage: end < total,
    },
  };
};

export type ServerEvent = { type: 'PostNew'; postId: string };
type Listener = (event: ServerEvent) => void;

export type GraphQLServer = ReturnType<typeof createServer>;

export const createServer = () => {
  let db: Db = createDb();
  const listeners = new Set<Listener>();
  const schema: GraphQLSchema = buildSchema(schemaSDL);

  const userById = (id?: string | null) => db.users.find(u => u._id === id) ?? null;
  const postById = (id?: string | null) => db.posts.find(p => p._id === id) ?? null;
  const commentById = (id?: string | null) => db.comments.find(c => c._id === id) ?? null;
  const newestFirst = <T extends { createdAt: string }>(items: T[]) =>
    [...items].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));

  type Ctx = { user: User | null };

  const wrapUser = (u: User | null) =>
    u && {
      __typename: 'User',
      id: toGlobalId('User', u._id),
      _id: u._id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
      updatedAt: u.createdAt,
      posts: (args: ConnectionArgs) => connectionFromArray(newestFirst(db.posts.filter(p => p.author === u._id)), args, wrapPost),
      comments: (args: ConnectionArgs) =>
        connectionFromArray(newestFirst(db.comments.filter(c => c.user === u._id)), args, wrapComment),
    };

  const wrapPost = (p: Post | null): any =>
    p && {
      __typename: 'Post',
      id: toGlobalId('Post', p._id),
      _id: p._id,
      content: p.content,
      author: () => wrapUser(userById(p.author)),
      likesCount: () => p.likedBy.length,
      commentsCount: () => db.comments.filter(c => c.post === p._id).length,
      // comments are shown oldest first, like the workshop server
      comments: (args: ConnectionArgs) => connectionFromArray(db.comments.filter(c => c.post === p._id), args, wrapComment),
      meHasLiked: (_: unknown, ctx: Ctx) => !!ctx.user && p.likedBy.includes(ctx.user._id),
      createdAt: p.createdAt,
      updatedAt: p.createdAt,
    };

  const wrapComment = (c: Comment | null): any =>
    c && {
      __typename: 'Comment',
      id: toGlobalId('Comment', c._id),
      _id: c._id,
      body: c.body,
      user: () => wrapUser(userById(c.user)),
      post: () => wrapPost(postById(c.post)),
      likesCount: () => c.likedBy.length,
      meHasLiked: (_: unknown, ctx: Ctx) => !!ctx.user && c.likedBy.includes(ctx.user._id),
      createdAt: c.createdAt,
      updatedAt: c.createdAt,
    };

  const nodeFromGlobalId = (globalId: string) => {
    const { type, id } = fromGlobalId(globalId);
    if (type === 'User') return wrapUser(userById(id));
    if (type === 'Post') return wrapPost(postById(id));
    if (type === 'Comment') return wrapComment(commentById(id));
    return null;
  };

  const requireUser = (ctx: Ctx) => {
    if (!ctx.user) {
      throw new Error('You must be logged in. Add the Authorization header with your token to the network layer');
    }
    return ctx.user;
  };

  const emit = (event: ServerEvent) => listeners.forEach(l => l(event));

  const createPost = (content: string, author: string) => {
    const post: Post = {
      _id: `p${db.nextPost++}`,
      content,
      author,
      likedBy: [],
      createdAt: new Date(Math.max(Date.now(), Date.parse(db.posts[0]?.createdAt ?? '0') + 1000)).toISOString(),
    };
    db.posts.unshift(post);
    emit({ type: 'PostNew', postId: post._id });
    return post;
  };

  const rootValue = {
    // Query
    node: ({ id }: { id: string }) => nodeFromGlobalId(id),
    nodes: ({ ids }: { ids: string[] }) => ids.map(nodeFromGlobalId),
    me: (_: unknown, ctx: Ctx) => wrapUser(ctx.user),
    posts: (args: ConnectionArgs) => connectionFromArray(newestFirst(db.posts), args, wrapPost),
    version: '1.0.0',

    // Mutation
    UserLoginWithEmail: ({ input }: any) => {
      const user = db.users.find(u => u.email === input.email?.trim().toLowerCase());
      if (!user || user.password !== input.password) {
        return { token: null, me: null, error: 'Email or password is incorrect', success: null, clientMutationId: input.clientMutationId };
      }
      return { token: tokenFor(user._id), me: wrapUser(user), error: null, success: 'Logged with success', clientMutationId: input.clientMutationId };
    },
    UserRegisterWithEmail: ({ input }: any) => {
      if (db.users.find(u => u.email === input.email?.trim().toLowerCase())) {
        return { token: null, me: null, error: 'Email already in use', success: null, clientMutationId: input.clientMutationId };
      }
      const user: User = { _id: `u${db.nextUser++}`, name: input.name, email: input.email.trim().toLowerCase(), password: input.password, createdAt: new Date().toISOString() };
      db.users.push(user);
      return { token: tokenFor(user._id), me: wrapUser(user), error: null, success: 'User registered with success', clientMutationId: input.clientMutationId };
    },
    PostCreate: ({ input }: any, ctx: Ctx) => {
      const user = requireUser(ctx);
      if (!input.content?.trim()) {
        return { postEdge: null, error: 'Content is required', success: null, clientMutationId: input.clientMutationId };
      }
      const post = createPost(input.content, user._id);
      return {
        postEdge: { cursor: cursorFor(0), node: wrapPost(post) },
        error: null,
        success: 'Post created',
        clientMutationId: input.clientMutationId,
      };
    },
    PostDelete: ({ input }: any, ctx: Ctx) => {
      const user = requireUser(ctx);
      const { id } = fromGlobalId(input.postId);
      const post = postById(id);
      if (!post) return { postId: null, error: 'Post not found', success: null, clientMutationId: input.clientMutationId };
      if (post.author !== user._id) return { postId: null, error: 'You can only delete your own posts', success: null, clientMutationId: input.clientMutationId };
      db.posts = db.posts.filter(p => p._id !== post._id);
      db.comments = db.comments.filter(c => c.post !== post._id);
      return { postId: input.postId, error: null, success: 'Post deleted', clientMutationId: input.clientMutationId };
    },
    PostLike: ({ input }: any, ctx: Ctx) => {
      const user = requireUser(ctx);
      const post = postById(fromGlobalId(input.post).id);
      if (!post) return { post: null, error: 'Post not found', success: null, clientMutationId: input.clientMutationId };
      if (!post.likedBy.includes(user._id)) post.likedBy.push(user._id);
      return { post: wrapPost(post), error: null, success: 'Post liked', clientMutationId: input.clientMutationId };
    },
    PostUnLike: ({ input }: any, ctx: Ctx) => {
      const user = requireUser(ctx);
      const post = postById(fromGlobalId(input.post).id);
      if (!post) return { post: null, error: 'Post not found', success: null, clientMutationId: input.clientMutationId };
      post.likedBy = post.likedBy.filter(id => id !== user._id);
      return { post: wrapPost(post), error: null, success: 'Post unliked', clientMutationId: input.clientMutationId };
    },
    CommentLike: ({ input }: any, ctx: Ctx) => {
      const user = requireUser(ctx);
      const comment = commentById(fromGlobalId(input.comment).id);
      if (!comment) return { comment: null, error: 'Comment not found', success: null, clientMutationId: input.clientMutationId };
      if (!comment.likedBy.includes(user._id)) comment.likedBy.push(user._id);
      return { comment: wrapComment(comment), error: null, success: 'Comment liked', clientMutationId: input.clientMutationId };
    },
    CommentUnLike: ({ input }: any, ctx: Ctx) => {
      const user = requireUser(ctx);
      const comment = commentById(fromGlobalId(input.comment).id);
      if (!comment) return { comment: null, error: 'Comment not found', success: null, clientMutationId: input.clientMutationId };
      comment.likedBy = comment.likedBy.filter(id => id !== user._id);
      return { comment: wrapComment(comment), error: null, success: 'Comment unliked', clientMutationId: input.clientMutationId };
    },
    PostCommentCreate: ({ input }: any, ctx: Ctx) => {
      const user = requireUser(ctx);
      const post = postById(fromGlobalId(input.post).id);
      if (!post) return { commentEdge: null, post: null, error: 'Post not found', success: null, clientMutationId: input.clientMutationId };
      if (!input.body?.trim()) return { commentEdge: null, post: wrapPost(post), error: 'Comment body is required', success: null, clientMutationId: input.clientMutationId };
      const comment: Comment = { _id: `c${db.nextComment++}`, body: input.body, user: user._id, post: post._id, likedBy: [], createdAt: new Date().toISOString() };
      db.comments.push(comment);
      const index = db.comments.filter(c => c.post === post._id).length - 1;
      return {
        commentEdge: { cursor: cursorFor(index), node: wrapComment(comment) },
        post: wrapPost(post),
        error: null,
        success: 'Comment created',
        clientMutationId: input.clientMutationId,
      };
    },
  };

  const contextFromHeaders = (headers: Record<string, string> = {}): Ctx => {
    const auth = Object.entries(headers).find(([k]) => k.toLowerCase() === 'authorization')?.[1];
    if (!auth) return { user: null };
    if (auth === USER_TOKEN) return { user: userById('u1') };
    try {
      const payload = JSON.parse(atob(auth.replace(/^JWT\s+/, '')));
      return { user: userById(payload.id) };
    } catch {
      return { user: null };
    }
  };

  const run = (query: string, variables: Record<string, any> | undefined, headers?: Record<string, string>, root: any = rootValue): ExecutionResult => {
    let document;
    try {
      document = parse(query);
    } catch (e: any) {
      return { errors: [e] };
    }
    const errors = validate(schema, document);
    if (errors.length) return { errors };
    return execute({ schema, document, rootValue: root, variableValues: variables, contextValue: contextFromHeaders(headers) }) as ExecutionResult;
  };

  const toJSON = (result: ExecutionResult) => JSON.parse(JSON.stringify(result));

  return {
    schema,
    execute: (query: string, variables?: Record<string, any>, headers?: Record<string, string>) => toJSON(run(query, variables, headers)),
    // subscribe to a GraphQL subscription, returns an unsubscribe function
    subscribe: (
      query: string,
      variables: Record<string, any> | undefined,
      headers: Record<string, string> | undefined,
      onNext: (result: any) => void,
    ) => {
      const listener: Listener = event => {
        if (event.type === 'PostNew') {
          const post = postById(event.postId);
          const result = run(query, variables, headers, { PostNew: { post: wrapPost(post), clientSubscriptionId: variables?.input?.clientSubscriptionId ?? null } });
          onNext(toJSON(result));
        }
      };
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    // simulate another user creating a post (used to test subscriptions)
    simulateNewPost: (content?: string) => {
      const others = db.users.filter(u => u._id !== 'u1');
      const author = others[Math.floor(Math.random() * others.length)];
      return createPost(content ?? `New post from ${author.name} at ${new Date().toLocaleTimeString()}`, author._id);
    },
    reset: () => {
      db = createDb();
    },
    get db() {
      return db;
    },
  };
};
