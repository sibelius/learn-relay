// In-browser Relay compiler.
// Uses the official Rust Relay compiler compiled to WebAssembly (relay-compiler-playground)
// and assembles its reader/normalization ASTs into ConcreteRequest/ReaderFragment
// artifacts that relay-runtime understands.
import { parse, print, visit, type DefinitionNode, type DocumentNode, type FragmentDefinitionNode, type OperationDefinitionNode } from 'graphql';
import init, * as wasm from './wasm/relay-compiler';

export type CompileError = { message: string; line?: number; column?: number };
export type Artifacts = Record<string, any>;
export type CompileResult = { ok: true; artifacts: Artifacts } | { ok: false; errors: CompileError[] };

let ready: Promise<unknown> | null = null;

export const initCompiler = (input?: any) => {
  if (!ready) {
    ready = init(input ?? '/wasm/relay_compiler.wasm');
  }
  return ready;
};

// enable_required_transform: allows the @required directive (experimental in the 2021 compiler, stable in relay-runtime 21)
const FEATURE_FLAGS = JSON.stringify({ enable_required_transform: true });

type WasmResult = { Ok?: string; Err?: any };

const formatErrors = (err: any): CompileError[] => {
  if (!err) return [{ message: 'Unknown compiler error' }];
  if (typeof err === 'string') return [{ message: err }];
  const diagnostics = err.DocumentDiagnostics ?? err.SchemaDiagnostics ?? err.diagnostics;
  if (Array.isArray(diagnostics)) {
    return diagnostics.map((d: any) => ({
      message: String(d.message).replace(/:?<generated>:\d+:\d+\n?$/, '').trim(),
    }));
  }
  return [{ message: JSON.stringify(err) }];
};

// split the wasm printed output (several JS object literals separated by blank lines)
const splitNodes = (text: string) => text.split(/\n\n(?=\{)/).map(s => s.trim()).filter(Boolean);

// the wasm output is a JS object literal that may contain require('X.graphql')
const evalNode = (text: string, requireArtifact: (name: string) => any) => {
  const fn = new Function('require', `return (${text});`);
  return fn((path: string) => requireArtifact(path.replace(/\.graphql$/, '')));
};

const rootTypeFor = (op: string) => (op === 'mutation' ? 'Mutation' : op === 'subscription' ? 'Subscription' : 'Query');

// djb2 hash, used as cacheID
const hash = (s: string) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
};

const collectFragmentSpreads = (node: DefinitionNode) => {
  const names = new Set<string>();
  visit(node, {
    FragmentSpread(n) {
      names.add(n.name.value);
    },
  });
  return names;
};

// builds the printed text of each operation including all transitive fragments
const buildOperationTexts = (printed: string) => {
  const doc: DocumentNode = parse(printed);
  const fragments = new Map<string, FragmentDefinitionNode>();
  const operations: OperationDefinitionNode[] = [];
  for (const def of doc.definitions) {
    if (def.kind === 'FragmentDefinition') fragments.set(def.name.value, def);
    if (def.kind === 'OperationDefinition') operations.push(def);
  }
  const texts: Record<string, { text: string; operationKind: string }> = {};
  for (const op of operations) {
    const seen = new Set<string>();
    const queue = [...collectFragmentSpreads(op)];
    while (queue.length) {
      const name = queue.shift()!;
      if (seen.has(name)) continue;
      seen.add(name);
      const frag = fragments.get(name);
      if (frag) queue.push(...collectFragmentSpreads(frag));
    }
    const parts = [print(op), ...[...seen].sort().map(n => fragments.get(n)).filter(Boolean).map(f => print(f!))];
    texts[op.name!.value] = { text: parts.join('\n\n'), operationKind: op.operation };
  }
  return texts;
};

// relay-runtime >= 13 expects identifierInfo instead of identifierField
// the wasm reader AST of *operations* keeps normalization style handles (e.g. @connection on a query field):
// `{ kind: 'LinkedField', name: 'posts' }` + `{ kind: 'LinkedHandle', handle: 'connection', key: 'App_posts' }`.
// RelayReader does not understand LinkedHandle, it expects the field to read the handle key instead:
// `{ kind: 'LinkedField', alias: 'posts', name: '__App_posts_connection', args: null }` (like fragments)
const applyReaderHandles = (selections: any[] | undefined): any[] | undefined => {
  if (!Array.isArray(selections)) return selections;
  const handles = selections.filter(s => s?.kind === 'LinkedHandle' || s?.kind === 'ScalarHandle');
  const result = selections
    .filter(s => !handles.includes(s))
    .map(s => {
      // only @connection changes what the reader reads, other handles (@deleteRecord, @appendEdge...) only affect normalization
      const handle = handles.find(h => h.handle === 'connection' && (h.alias ?? h.name) === (s.alias ?? s.name) && s.kind === 'LinkedField');
      const next = s?.selections ? { ...s, selections: applyReaderHandles(s.selections) } : s;
      if (!handle) return next;
      return {
        ...next,
        alias: s.alias ?? s.name,
        name: handle.key ? `__${handle.key}_${handle.handle}` : `__${s.name}_${handle.handle}`,
        args: null,
        storageKey: null,
      };
    });
  return result;
};

const patchRefetchMetadata = (fragment: any) => {
  const refetch = fragment?.metadata?.refetch;
  if (refetch && refetch.identifierField && !refetch.identifierInfo) {
    refetch.identifierInfo = { identifierField: refetch.identifierField, identifierQueryVariableName: 'id' };
  }
};

export const compile = (schema: string, documents: string[]): CompileResult => {
  const source = documents.join('\n\n');
  if (!source.trim()) return { ok: true, artifacts: {} };

  // validate the GraphQL syntax first to give nicer errors
  try {
    parse(source);
  } catch (e: any) {
    return { ok: false, errors: [{ message: `GraphQL syntax error: ${e.message}` }] };
  }

  const reader: WasmResult = JSON.parse(wasm.parse_to_reader_ast(FEATURE_FLAGS, schema, source));
  if (reader.Err || reader.Ok == null) return { ok: false, errors: formatErrors(reader.Err) };
  const normalization: WasmResult = JSON.parse(wasm.parse_to_normalization_ast(FEATURE_FLAGS, schema, source));
  if (normalization.Err || normalization.Ok == null) return { ok: false, errors: formatErrors(normalization.Err) };
  const transformed: WasmResult = JSON.parse(wasm.transform(FEATURE_FLAGS, schema, source));
  if (transformed.Err || transformed.Ok == null) return { ok: false, errors: formatErrors(transformed.Err) };

  const texts = buildOperationTexts(transformed.Ok);

  const artifacts: Artifacts = {};
  const requireArtifact = (name: string) => {
    // lazily resolved, refetch queries are generated after the fragment
    return new Proxy(
      {},
      {
        get: (_t, prop) => artifacts[name]?.[prop as any],
        has: (_t, prop) => prop in (artifacts[name] ?? {}),
        ownKeys: () => Reflect.ownKeys(artifacts[name] ?? {}),
        getOwnPropertyDescriptor: (_t, prop) => Reflect.getOwnPropertyDescriptor(artifacts[name] ?? {}, prop),
      },
    );
  };
  const pendingRefetch: any[] = [];

  const readerNodes = splitNodes(reader.Ok).map(t => evalNode(t, name => {
    const proxy = requireArtifact(name);
    pendingRefetch.push(name);
    return proxy;
  }));
  const normalizationNodes = splitNodes(normalization.Ok).map(t => evalNode(t, requireArtifact));
  const normalizationByName = new Map<string, any>(normalizationNodes.map(n => [n.name, n]));

  for (const node of readerNodes) {
    if (node.kind === 'Fragment') {
      patchRefetchMetadata(node);
      artifacts[node.name] = node;
      continue;
    }
    // operation
    const info = texts[node.name] ?? { text: '', operationKind: 'query' };
    const operation = normalizationByName.get(node.name);
    const fragment = {
      argumentDefinitions: node.argumentDefinitions,
      kind: 'Fragment',
      metadata: null,
      name: node.name,
      selections: applyReaderHandles(node.selections),
      type: rootTypeFor(info.operationKind),
      abstractKey: null,
    };
    artifacts[node.name] = {
      fragment,
      kind: 'Request',
      operation,
      params: {
        cacheID: hash(info.text),
        id: null,
        metadata: {},
        name: node.name,
        operationKind: info.operationKind,
        text: info.text,
      },
    };
  }

  // swap refetch proxies with the real artifacts (relay compares by identity in a few places)
  for (const name of Object.keys(artifacts)) {
    const refetch = artifacts[name]?.metadata?.refetch;
    if (refetch?.operation) {
      const opName = refetch.operation.params?.name;
      if (opName && artifacts[opName]) refetch.operation = artifacts[opName];
    }
  }

  return { ok: true, artifacts };
};

// extracts graphql`...` tagged templates from source code
export const GRAPHQL_TAG_REGEX = /graphql\s*`([^`]*)`/g;

export const extractGraphQLTags = (code: string) => {
  const docs: string[] = [];
  for (const match of code.matchAll(GRAPHQL_TAG_REGEX)) docs.push(match[1]);
  return docs;
};

export const definitionName = (doc: string) => {
  const m = doc.match(/\b(query|mutation|subscription|fragment)\s+([_A-Za-z][_0-9A-Za-z]*)/);
  return m ? m[2] : null;
};

// replaces graphql`...` with a lookup into the compiled artifacts
export const replaceGraphQLTags = (code: string) =>
  code.replace(GRAPHQL_TAG_REGEX, (_all, doc: string) => {
    const name = definitionName(doc);
    if (!name) return '(() => { throw new Error("graphql tag must contain a named query, mutation, subscription or fragment") })()';
    return `__relayArtifact(${JSON.stringify(name)})`;
  });
