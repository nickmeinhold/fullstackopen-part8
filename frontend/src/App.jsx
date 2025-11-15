import { useState } from "react";
import { gql } from "@apollo/client";
import { useApolloClient, useSubscription } from "@apollo/client/react";
import { BOOK_ADDED } from "../queries";
import Authors from "./components/Authors";
import Books from "./components/Books";
import NewBook from "./components/NewBook";
import LoginForm from "./components/LoginForm";
import Recommend from "./components/Recommend";

const Notify = ({ errorMessage }) => {
  if (!errorMessage) {
    return null;
  }
  return <div style={{ color: "red" }}>{errorMessage}</div>;
};

const App = () => {
  const [page, setPage] = useState("authors");
  const [token, setToken] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const client = useApolloClient();

  useSubscription(BOOK_ADDED, {
    onData: ({ data, client }) => {
      console.log("=== SUBSCRIPTION EVENT RECEIVED ===");
      console.log("Raw data:", data);
      const addedBook = data.data.bookAdded;
      console.log("Book added via subscription:", addedBook);
      notify(`${addedBook.title} by ${addedBook.author.name} added`);

      // Update ALL_BOOKS cache entries
      // This approach modifies the cache for all query variations
      client.cache.modify({
        fields: {
          allBooks(existingBooks = [], { readField, storeFieldName }) {
            console.log("Modifying cache for:", storeFieldName);

            // Check if the book already exists
            const bookExists = existingBooks.some(
              (bookRef) => readField("id", bookRef) === addedBook.id
            );

            if (bookExists) {
              return existingBooks;
            }

            // Check if this query has a genre filter
            const match = storeFieldName.match(
              /allBooks\({"genre":"([^"]+)"\}/
            );
            if (match) {
              const filterGenre = match[1];
              // Only add the book if it matches the genre filter
              if (!addedBook.genres.includes(filterGenre)) {
                return existingBooks;
              }
            }

            // Create a reference to the new book
            const newBookRef = client.cache.writeFragment({
              data: addedBook,
              fragment: gql`
                fragment NewBook on Book {
                  id
                  title
                  author {
                    name
                    born
                    id
                  }
                  published
                  genres
                }
              `,
            });

            console.log("Adding book to cache:", addedBook.title);
            return [...existingBooks, newBookRef];
          },
        },
      });
    },
  });

  const notify = (message) => {
    setErrorMessage(message);
    setTimeout(() => {
      setErrorMessage(null);
    }, 5000);
  };

  const handleSetToken = (newToken) => {
    setToken(newToken);
    setPage("authors"); // Change to authors page after login
  };

  return (
    <div>
      <Notify errorMessage={errorMessage} />
      <div>
        <button onClick={() => setPage("authors")}>authors</button>
        <button onClick={() => setPage("books")}>books</button>
        {token && <button onClick={() => setPage("add")}>add book</button>}
        {token && (
          <button onClick={() => setPage("recommend")}>recommend</button>
        )}
        {!token && <button onClick={() => setPage("login")}>login</button>}
        {token && <button onClick={() => setToken(null)}>logout</button>}
      </div>

      <Authors show={page === "authors"} />

      <Books show={page === "books"} />

      {token && <NewBook show={page === "add"} />}

      {token && <Recommend show={page === "recommend"} />}

      {!token && (
        <LoginForm
          show={page === "login"}
          setToken={handleSetToken}
          setError={notify}
        />
      )}
    </div>
  );
};

export default App;
