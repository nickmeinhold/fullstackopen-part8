import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
  split,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { getMainDefinition } from "@apollo/client/utilities";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws/client";

const authLink = new ApolloLink((operation, forward) => {
  const token = localStorage.getItem("library-user-token");
  operation.setContext({
    headers: {
      authorization: token ? `Bearer ${token}` : null,
    },
  });
  return forward(operation);
});

const httpLink = new HttpLink({ uri: "http://localhost:4000" });

const wsLink = new GraphQLWsLink(
  createClient({
    url: "ws://localhost:4000",
    connectionParams: () => {
      const token = localStorage.getItem("library-user-token");
      return {
        authorization: token ? `Bearer ${token}` : null,
      };
    },
  })
);

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === "OperationDefinition" &&
      definition.operation === "subscription"
    );
  },
  wsLink,
  authLink.concat(httpLink)
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </React.StrictMode>
);
