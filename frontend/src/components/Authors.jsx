import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { ALL_AUTHORS, EDIT_AUTHOR } from "../../queries";
import Select from "react-select";

const Authors = ({ show }) => {
  const [born, setBorn] = useState("");
  const [selectedOption, setSelectedOption] = useState(null);

  const result = useQuery(ALL_AUTHORS);
  const [editAuthor] = useMutation(EDIT_AUTHOR, {
    refetchQueries: [{ query: ALL_AUTHORS }],
  });

  if (!show) {
    return null;
  }

  if (result.loading) {
    return <div>loading...</div>;
  }

  const authors = result.data.allAuthors;
  const options = authors.map((a) => ({ value: a.name, label: a.name }));

  // Initialize selectedOption with the first author if not already set
  if (!selectedOption && options.length > 0) {
    setSelectedOption(options[0]);
  }

  const submit = async (event) => {
    event.preventDefault();

    if (!selectedOption) {
      return;
    }

    await editAuthor({
      variables: { name: selectedOption.value, setBornTo: parseInt(born) },
    });

    console.log("edit author...");

    setBorn("");
    setSelectedOption(null);
  };

  return (
    <div>
      <h2>authors</h2>
      <table>
        <tbody>
          <tr>
            <th></th>
            <th>born</th>
            <th>books</th>
          </tr>
          {authors.map((a) => (
            <tr key={a.name}>
              <td>{a.name}</td>
              <td>{a.born}</td>
              <td>{a.bookCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Set birthyear</h2>
      <form onSubmit={submit}>
        <Select
          value={selectedOption || options[0]}
          onChange={setSelectedOption}
          options={options}
        />
        <div>
          born
          <input
            type="number"
            value={born}
            onChange={({ target }) => setBorn(target.value)}
          />
        </div>
        <button type="submit">update author</button>
      </form>
    </div>
  );
};

export default Authors;
