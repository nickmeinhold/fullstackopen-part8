const Author = require("./models/author");
const Book = require("./models/book");

const seedAuthors = [
  {
    name: "Robert Martin",
    born: 1952,
  },
  {
    name: "Martin Fowler",
    born: 1963,
  },
  {
    name: "Fyodor Dostoevsky",
    born: 1821,
  },
  {
    name: "Joshua Kerievsky", // birthyear not known
  },
  {
    name: "Sandi Metz", // birthyear not known
  },
];

const seedBooks = [
  {
    title: "Clean Code",
    published: 2008,
    author: "Robert Martin",
    genres: ["refactoring"],
  },
  {
    title: "Agile software development",
    published: 2002,
    author: "Robert Martin",
    genres: ["agile", "patterns", "design"],
  },
  {
    title: "Refactoring, edition 2",
    published: 2018,
    author: "Martin Fowler",
    genres: ["refactoring"],
  },
  {
    title: "Refactoring to patterns",
    published: 2008,
    author: "Joshua Kerievsky",
    genres: ["refactoring", "patterns"],
  },
  {
    title: "Practical Object-Oriented Design, An Agile Primer Using Ruby",
    published: 2012,
    author: "Sandi Metz",
    genres: ["refactoring", "design"],
  },
  {
    title: "Crime and punishment",
    published: 1866,
    author: "Fyodor Dostoevsky",
    genres: ["classic", "crime"],
  },
  {
    title: "Demons",
    published: 1872,
    author: "Fyodor Dostoevsky",
    genres: ["classic", "revolution"],
  },
];

// Seed function to clear and populate the database
const seedDatabase = async () => {
  try {
    console.log("Clearing database...");
    await Book.deleteMany({});
    await Author.deleteMany({});

    console.log("Seeding authors...");
    const authorDocs = await Author.insertMany(
      seedAuthors.map(({ name, born }) => ({ name, born }))
    );

    console.log("Seeding books...");
    for (const book of seedBooks) {
      const author = authorDocs.find((a) => a.name === book.author);
      if (author) {
        await Book.create({
          title: book.title,
          published: book.published,
          author: author._id,
          genres: book.genres,
        });
      }
    }

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error.message);
  }
};

module.exports = seedDatabase;
