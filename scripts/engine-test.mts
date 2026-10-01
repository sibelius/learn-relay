import fs from 'fs';
import { initCompiler, compile } from '../src/lib/engine/compiler';
import { createServer, USER_TOKEN } from '../src/lib/engine/server';
import { schemaSDL } from '../src/lib/engine/schema';
import { Environment, Network, RecordSource, Store, fetchQuery, createOperationDescriptor, getRequest, commitMutation, ConnectionHandler, ROOT_ID } from 'relay-runtime';

await initCompiler(fs.readFileSync('public/wasm/relay_compiler.wasm'));
const docs = [
`query AppQuery { ...Feed_query me { id name } }`,
`fragment Feed_query on Query @argumentDefinitions(first:{type:Int, defaultValue: 2}, after:{type:String}) @refetchable(queryName:"FeedPaginationQuery") { posts(first:$first, after:$after) @connection(key:"Feed_posts", filters: []) { edges { node { id content likesCount meHasLiked } } } }`,
`mutation PostCreateMutation($input: PostCreateInput! $connections: [ID!]!) { PostCreate(input:$input) { postEdge @prependEdge(connections: $connections) { node { id content } } } }`,
`mutation PostLikeMutation($input: PostLikeInput!) { PostLike(input:$input) { post { id likesCount meHasLiked } } }`,
];
const r = compile(schemaSDL, docs);
if (!r.ok) { console.log(r.errors); process.exit(1); }
console.log(Object.keys(r.artifacts));
console.log(r.artifacts.FeedPaginationQuery.params.text);
const server = createServer();
const env = new Environment({ network: Network.create(async (params, variables) => server.execute(params.text!, variables, { Authorization: USER_TOKEN })), store: new Store(new RecordSource()) });
const q = r.artifacts.AppQuery;
const res: any = await fetchQuery(env, q, {}).toPromise();
console.log(JSON.stringify(res).slice(0, 300));
// read fragment via snapshot
const op = createOperationDescriptor(getRequest(q), {});
env.retain(op);
const connId = ConnectionHandler.getConnectionID(ROOT_ID, 'Feed_posts');
console.log('connId', connId, Object.keys(env.getStore().getSource().toJSON()).slice(0, 12));
process.on("exit",()=>console.log("EXIT"));
try { await new Promise<void>((resolve, reject) => commitMutation(env, { mutation: r.artifacts.PostCreateMutation, variables: { input: { content: 'hello' }, connections: [connId] }, onCompleted: (d, e) => { console.log('created', JSON.stringify(d), e); resolve(); }, onError: (e)=>{console.log("ERR",e);reject(e)} })); } catch(e) { console.log("caught", e) }
const conn = env.getStore().getSource().get(connId) as any;
console.log('edges after create', conn.edges.__refs.length);
const page2: any = await fetchQuery(env, r.artifacts.FeedPaginationQuery, { first: 2, after: res.posts?.pageInfo?.endCursor ?? null }).toPromise();
console.log('page2', JSON.stringify(page2).slice(0, 200));
