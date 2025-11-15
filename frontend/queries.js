import { gql } from "@apollo/client";

export const ALL_BOOKS = gql`
  query {
    allBooks {
      title
      author
      published
      genres
    }
  }
`;

export const ALL_AUTHORS = gql`
  query {
    allAuthors {
      name
      born
      bookCount
    }
  }
`;

// export const FIND_PERSON = gql`
//   query findPersonByName($nameToSearch: String!) {
//     // ...
//   }
// `;

// export const CREATE_PERSON = gql`
//   mutation createPerson($name: String!, $street: String!, $city: String!, $phone: String) {
//     // ...
//   }
// `;
