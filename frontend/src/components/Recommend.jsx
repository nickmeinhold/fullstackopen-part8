import { useQuery } from "@apollo/client/react";
import { ALL_BOOKS, ME } from "../../queries";

const Recommend = ({ show }) => {
  const userResult = useQuery(ME);
  const booksResult = useQuery(ALL_BOOKS);

  if (!show) {
    return null;
  }

  if (userResult.loading || booksResult.loading) {
    return <div>loading...</div>;
  }

  if (userResult.error) {
    return <div>Error: {userResult.error.message}</div>;
  }

  if (booksResult.error) {
    return <div>Error: {booksResult.error.message}</div>;
  }

  const user = userResult.data.me;
  const books = booksResult.data.allBooks;

  if (!user) {
    return <div>Please log in to see recommendations</div>;
  }

  const favoriteGenre = user.favoriteGenre;
  const recommendedBooks = books.filter((b) =>
    b.genres.includes(favoriteGenre)
  );

  return (
    <div>
      <h2>recommendations</h2>
      <p>
        books in your favorite genre <strong>{favoriteGenre}</strong>
      </p>

      <table>
        <tbody>
          <tr>
            <th></th>
            <th>author</th>
            <th>published</th>
          </tr>
          {recommendedBooks.map((book) => (
            <tr key={book.title}>
              <td>{book.title}</td>
              <td>{book.author.name}</td>
              <td>{book.published}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Recommend;
