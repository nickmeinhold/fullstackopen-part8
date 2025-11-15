import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { ALL_BOOKS } from "../../queries";

const Books = ({ show }) => {
  const [genre, setGenre] = useState(null);

  // Fetch all books to get the list of genres
  const allBooksResult = useQuery(ALL_BOOKS);

  // Fetch filtered books based on selected genre
  const result = useQuery(ALL_BOOKS, {
    variables: { genre },
    skip: !show,
  });

  if (!show) {
    return null;
  }

  if (result.loading || allBooksResult.loading) {
    return <div>loading...</div>;
  }

  if (result.error) {
    return <div>Error: {result.error.message}</div>;
  }

  if (allBooksResult.error) {
    return <div>Error: {allBooksResult.error.message}</div>;
  }

  const books = result.data.allBooks;
  const allBooks = allBooksResult.data.allBooks;

  // Get all unique genres from all books
  const allGenres = [...new Set(allBooks.flatMap((b) => b.genres))];

  return (
    <div>
      <h2>books</h2>

      <table>
        <tbody>
          <tr>
            <th></th>
            <th>author</th>
            <th>published</th>
          </tr>
          {books.map((a) => (
            <tr key={a.title}>
              <td>{a.title}</td>
              <td>{a.author.name}</td>
              <td>{a.published}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div>
        {allGenres.map((g) => (
          <button key={g} onClick={() => setGenre(g)}>
            {g}
          </button>
        ))}
        <button onClick={() => setGenre(null)}>all genres</button>
      </div>
    </div>
  );
};

export default Books;
