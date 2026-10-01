# Learn Relay

Learn [Relay](https://relay.dev) by solving hands-on exercises **directly in your browser**.
Based on [sibelius/relay-workshop](https://github.com/sibelius/relay-workshop): the same 13 exercises, plus bonus ones, without installing anything.

## How it works

Everything runs client-side, inside a sandboxed iframe (`/sandbox`):

- **Relay compiler**: `graphql` tags are compiled by the official Rust Relay compiler built to WebAssembly
  ([relay-compiler-playground](https://www.npmjs.com/package/relay-compiler-playground)). Its reader/normalization ASTs are
  assembled into `ConcreteRequest` artifacts for `relay-runtime` 21 (`src/lib/engine/compiler.ts`).
- **GraphQL server**: an in-memory mini social network (posts, comments, likes, auth, `PostNew` subscription) that implements
  the workshop schema with `graphql-js` (`src/lib/engine/server.ts`). `fetch` calls to `http://localhost:7500/graphql`
  and `graphql-ws` clients are routed to it, with configurable latency.
- **Module runtime**: user files are transpiled with [sucrase](https://github.com/alangpierce/sucrase) and evaluated with a
  tiny CommonJS loader. Virtual modules provide `react`, `react-relay`, `relay-runtime`, `relay-test-utils`, `react-router`,
  `@testing-library/react`, `vitest`/`jest` globals and `@workshop/ui` (`src/lib/engine/runtime.ts`).
- **Checks**: each exercise ships automated checks that run against the live app (DOM, network log, Relay store).

## Exercises

Exercises live in `src/exercises/*.ts`. Each one defines its instructions, concept notes, hints, starter files, solution and checks.

## Development

```bash
pnpm install
pnpm dev                     # http://localhost:3000
node scripts/verify.mjs http://localhost:3000 [slug] [solution|starter|both]  # e2e: run the checks of every exercise
```
