// Files shared by most exercises (the same structure as the original relay-workshop)
import { USER_TOKEN } from '@/lib/engine/server';

export const TOKEN = USER_TOKEN;

export const config = `const config = {
  GRAPHQL_URL: 'http://localhost:7500/graphql',
  SUBSCRIPTION_URL: 'ws://localhost:7500/graphql/ws',
};

export default config;
`;

export const index = `import React from 'react';
import { createRoot } from 'react-dom/client';

import Root from './Root';

const container = document.getElementById('root');

if (!container) throw new Error('Failed to find the root element');

const root = createRoot(container);

root.render(<Root />);
`;

export const getToken = `// read from localstorage or cookie
export const getToken = () => {
  return '${USER_TOKEN}';
};
`;

export const fetchGraphQL = ({ withToken }: { withToken: boolean }) => `import { RequestParameters, Variables } from 'relay-runtime';

import config from '../config';
${withToken ? "import { getToken } from './getToken';\n" : ''}
export const fetchGraphQL = async (request: RequestParameters, variables: Variables) => {
  const response = await fetch(config.GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-type': 'application/json',${withToken ? '\n      Authorization: getToken(),' : ''}
    },
    body: JSON.stringify({
      query: request.text,
      variables,
    }),
  });

  const data = await response.json();

  return data;
};
`;

export const setupSubscription = `import { Observable, RequestParameters, Variables } from 'relay-runtime';
import { createClient } from 'graphql-ws';

import config from '../config';
import { getToken } from './getToken';

export const setupSubscription = () => {
  const wsClient = createClient({
    url: config.SUBSCRIPTION_URL,
    connectionParams: {
      authorization: getToken(),
    },
  });

  const subscribe = (operation: RequestParameters, variables: Variables) => {
    return Observable.create(sink => {
      return wsClient.subscribe(
        {
          query: operation.text!,
          variables,
          operationName: operation.name,
        },
        sink,
      );
    });
  };

  return subscribe;
};
`;

export const environment = ({ withSubscription = false }: { withSubscription?: boolean } = {}) => `import { Environment, Network, RecordSource, Store } from 'relay-runtime';

import { fetchGraphQL } from './fetchGraphQL';
${withSubscription ? "import { setupSubscription } from './setupSubscription';\n" : ''}
const network = Network.create(fetchGraphQL${withSubscription ? ', setupSubscription()' : ''});

const env = new Environment({
  network,
  store: new Store(new RecordSource()),
});

export default env;
`;

export const providers = ({ withSnackbar = false }: { withSnackbar?: boolean } = {}) => `import React from 'react';
import { RelayEnvironmentProvider } from 'react-relay';
${withSnackbar ? "import { SnackbarProvider } from '@workshop/ui';\n" : ''}
import Environment from './relay/Environment';

type Props = {
  children: React.ReactNode;
};
const Providers = ({ children }: Props) => {
  return (
    <RelayEnvironmentProvider environment={Environment}>
      ${withSnackbar ? '<SnackbarProvider>{children}</SnackbarProvider>' : '{children}'}
    </RelayEnvironmentProvider>
  );
};

export default Providers;
`;

export const loading = `import React from 'react';
import { Loading as Spinner } from '@workshop/ui';

const Loading = () => {
  return <Spinner />;
};

export default Loading;
`;

export const errorBoundaryRetry = `import React from 'react';
import { Button, Content, ErrorMessage } from '@workshop/ui';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

/**
 * A reusable component for handling errors in a React (sub)tree.
 */
class ErrorBoundaryRetry extends React.Component<Props, State> {
  state: State = {
    error: null,
  };

  static getDerivedStateFromError(error: Error) {
    return {
      error,
    };
  }

  render() {
    const { error } = this.state;

    if (error != null) {
      return (
        <Content>
          <ErrorMessage>Error: {error.message}</ErrorMessage>
          <Button mt='10px' onClick={() => this.setState({ error: null })}>
            retry
          </Button>
        </Content>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundaryRetry;
`;

export const root = `import React, { Suspense } from 'react';

import Providers from './Providers';
import App from './App';
import Loading from './Loading';
import ErrorBoundaryRetry from './ErrorBoundaryRetry';

const Root = () => {
  return (
    <Providers>
      <ErrorBoundaryRetry>
        <Suspense fallback={<Loading />}>
          <App />
        </Suspense>
      </ErrorBoundaryRetry>
    </Providers>
  );
};

export default Root;
`;

// the base Relay project used from exercise 02 onwards
export const relayProject = ({
  withToken = false,
  withSubscription = false,
  withSnackbar = false,
}: { withToken?: boolean; withSubscription?: boolean; withSnackbar?: boolean } = {}) => {
  const files: Record<string, string> = {
    'index.tsx': index,
    'Root.tsx': root,
    'Providers.tsx': providers({ withSnackbar }),
    'Loading.tsx': loading,
    'ErrorBoundaryRetry.tsx': errorBoundaryRetry,
    'config.tsx': config,
    'relay/Environment.tsx': environment({ withSubscription }),
    'relay/fetchGraphQL.tsx': fetchGraphQL({ withToken: withToken || withSubscription }),
  };
  if (withToken || withSubscription) files['relay/getToken.tsx'] = getToken;
  if (withSubscription) files['relay/setupSubscription.tsx'] = setupSubscription;
  return files;
};

export const BASE_HIDDEN = [
  'index.tsx',
  'Root.tsx',
  'Providers.tsx',
  'Loading.tsx',
  'ErrorBoundaryRetry.tsx',
  'config.tsx',
  'relay/Environment.tsx',
  'relay/fetchGraphQL.tsx',
  'relay/getToken.tsx',
  'relay/setupSubscription.tsx',
];

// ---- helpers for checks
export const operationsNamed = (network: { name: string; kind: string }[], name: string) => network.filter(e => e.name === name);
